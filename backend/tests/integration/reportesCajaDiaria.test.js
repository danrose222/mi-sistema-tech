const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

async function crearPedidoConPagos({ estado, total, pagos, fechaOffsetHoras = 0, reembolsadoOffsetHoras = null }) {
    const connection = await pool.getConnection();
    try {
        const [pedido] = await connection.query(
            `INSERT INTO pedidos (cliente_id, total, estado, metodo_pago, created_at)
             VALUES (NULL, ?, ?, 'efectivo_pos', DATE_SUB(NOW(), INTERVAL ? HOUR))`,
            [total, estado, fechaOffsetHoras]
        );
        const pedidoId = pedido.insertId;

        for (const pago of pagos) {
            await connection.query(
                'INSERT INTO pagos (pedido_id, proveedor, monto, estado) VALUES (?, ?, ?, ?)',
                [pedidoId, pago.proveedor, pago.monto, pago.estado || 'aprobado']
            );
        }

        if (reembolsadoOffsetHoras !== null) {
            await connection.query(
                'UPDATE pedidos SET reembolsado_en = DATE_SUB(NOW(), INTERVAL ? HOUR) WHERE id = ?',
                [reembolsadoOffsetHoras, pedidoId]
            );
        }

        return pedidoId;
    } finally {
        connection.release();
    }
}

describe('Reporte de Caja Diaria', () => {
    let tokenAdmin;

    beforeEach(async () => {
        const adminData = await global.crearUsuarioAdminYObtenerToken();
        tokenAdmin = adminData.token;
    });

    it('Debería fallar con Error 401 sin token', async () => {
        const res = await request(app).get('/api/reportes/caja-diaria');
        expect(res.statusCode).toBe(401);
    });

    it('Debería sumar correctamente efectivo, tarjeta/MercadoPago y transferencia del día', async () => {
        // Venta de mostrador con pago mixto (efectivo + tarjeta) hoy
        await crearPedidoConPagos({
            estado: 'pagado',
            total: 15000,
            pagos: [{ proveedor: 'efectivo', monto: 5000 }, { proveedor: 'tarjeta', monto: 10000 }]
        });

        // Venta de mostrador solo transferencia hoy
        await crearPedidoConPagos({
            estado: 'pagado',
            total: 3000,
            pagos: [{ proveedor: 'transferencia', monto: 3000 }]
        });

        // Pedido pagado por Mercado Pago hoy (se agrupa junto con "tarjeta")
        await crearPedidoConPagos({
            estado: 'pagado',
            total: 7000,
            pagos: [{ proveedor: 'mercadopago', monto: 7000 }]
        });

        // Pedido pendiente hoy: no debe contar
        await crearPedidoConPagos({ estado: 'pendiente', total: 99999, pagos: [] });

        // Pago rechazado: en la práctica un pago rechazado nunca deja el pedido
        // en "pagado" (ver webhookPago), así que el pedido queda pendiente y
        // no debe contar ni en el total general ni en el desglose
        await crearPedidoConPagos({
            estado: 'pendiente',
            total: 500,
            pagos: [{ proveedor: 'tarjeta', monto: 500, estado: 'rechazado' }]
        });

        // Venta pagada pero de ayer: no debe contar
        await crearPedidoConPagos({
            estado: 'pagado',
            total: 50000,
            pagos: [{ proveedor: 'efectivo', monto: 50000 }],
            fechaOffsetHoras: 30
        });

        const res = await request(app)
            .get('/api/reportes/caja-diaria')
            .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.efectivo).toBe(5000);
        expect(res.body.data.transferencia).toBe(3000);
        expect(res.body.data.tarjetaMp).toBe(17000); // 10000 (tarjeta) + 7000 (mercadopago)
        expect(res.body.data.totalGeneral).toBe(25000); // 15000 + 3000 + 7000, la venta de ayer y la pendiente no cuentan
        expect(res.body.data.cantidadVentas).toBe(3);
    });

    it('Debería devolver todo en cero si no hubo ventas pagadas hoy', async () => {
        const res = await request(app)
            .get('/api/reportes/caja-diaria')
            .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.totalGeneral).toBe(0);
        expect(res.body.data.efectivo).toBe(0);
        expect(res.body.data.transferencia).toBe(0);
        expect(res.body.data.tarjetaMp).toBe(0);
        expect(res.body.data.cantidadVentas).toBe(0);
    });

    it('No debería restar dos veces una venta vendida y devuelta el mismo día', async () => {
        // Vendida hoy y reembolsada hoy: el estado ya es "reembolsado", así que
        // no cuenta como venta de hoy, y tampoco debe restarse aparte.
        await crearPedidoConPagos({
            estado: 'reembolsado',
            total: 8000,
            pagos: [{ proveedor: 'efectivo', monto: 8000 }],
            fechaOffsetHoras: 2,
            reembolsadoOffsetHoras: 1
        });

        // Una venta normal de hoy, para verificar que no se vea afectada
        await crearPedidoConPagos({
            estado: 'pagado',
            total: 4000,
            pagos: [{ proveedor: 'efectivo', monto: 4000 }]
        });

        const res = await request(app)
            .get('/api/reportes/caja-diaria')
            .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.totalGeneral).toBe(4000);
        expect(res.body.data.efectivo).toBe(4000);
    });

    it('Debería restar una devolución de hoy de una venta de un día anterior', async () => {
        // Vendida ayer, devuelta hoy: el dinero salió de la caja hoy aunque la
        // venta original no cuente en el total de ventas de hoy.
        await crearPedidoConPagos({
            estado: 'reembolsado',
            total: 6000,
            pagos: [{ proveedor: 'efectivo', monto: 6000 }],
            fechaOffsetHoras: 30,
            reembolsadoOffsetHoras: 1
        });

        await crearPedidoConPagos({
            estado: 'pagado',
            total: 10000,
            pagos: [{ proveedor: 'efectivo', monto: 10000 }]
        });

        const res = await request(app)
            .get('/api/reportes/caja-diaria')
            .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.totalGeneral).toBe(4000); // 10000 - 6000
        expect(res.body.data.efectivo).toBe(4000);
        expect(res.body.data.cantidadDevoluciones).toBe(1);
    });
});
