const pool = require('../../src/config/database');
const { liberarReservasExpiradas } = require('../../src/cron/reservasCron');

async function crearPedidoDePrueba({ estado, metodoPago, horasAtras, cantidad = 2, stockInicial = 10 }) {
    const connection = await pool.getConnection();
    try {
        const clienteId = await global.crearClienteHelper('Cliente Reserva');

        const [producto] = await connection.query(
            'INSERT INTO productos (nombre, sku, precio, stock) VALUES (?, ?, ?, ?)',
            [`Producto reserva ${Date.now()}-${Math.random()}`, `sku-${Date.now()}-${Math.random()}`, 1000, stockInicial]
        );
        const productoId = producto.insertId;

        // Simular la reserva de stock que crearPedido hace al crear el pedido
        await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [cantidad, productoId]);

        const [pedido] = await connection.query(
            `INSERT INTO pedidos (cliente_id, total, estado, metodo_pago, created_at)
             VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
            [clienteId, cantidad * 1000, estado, metodoPago, horasAtras]
        );
        const pedidoId = pedido.insertId;

        await connection.query(
            'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
            [pedidoId, productoId, cantidad, 1000]
        );

        return { pedidoId, productoId, stockInicial };
    } finally {
        connection.release();
    }
}

async function obtenerEstadoYStock(pedidoId, productoId) {
    const connection = await pool.getConnection();
    try {
        const [[pedido]] = await connection.query('SELECT estado FROM pedidos WHERE id = ?', [pedidoId]);
        const [[producto]] = await connection.query('SELECT stock FROM productos WHERE id = ?', [productoId]);
        return { estado: pedido.estado, stock: producto.stock };
    } finally {
        connection.release();
    }
}

describe('Cron de liberación de reservas vencidas (48hs)', () => {
    it('Debería cancelar una reserva por efectivo en local vencida y reponer su stock', async () => {
        const { pedidoId, productoId, stockInicial } = await crearPedidoDePrueba({
            estado: 'pendiente', metodoPago: 'efectivo_local', horasAtras: 50, cantidad: 2, stockInicial: 10
        });

        const resultado = await liberarReservasExpiradas();

        expect(resultado.pedidosCancelados).toBe(1);
        const { estado, stock } = await obtenerEstadoYStock(pedidoId, productoId);
        expect(estado).toBe('cancelado');
        expect(stock).toBe(stockInicial); // 10 - 2 (reserva) + 2 (repuesto) = 10
    });

    it('Debería cancelar una reserva por transferencia vencida y reponer su stock', async () => {
        const { pedidoId, productoId, stockInicial } = await crearPedidoDePrueba({
            estado: 'pendiente', metodoPago: 'transferencia', horasAtras: 72, cantidad: 1, stockInicial: 5
        });

        await liberarReservasExpiradas();

        const { estado, stock } = await obtenerEstadoYStock(pedidoId, productoId);
        expect(estado).toBe('cancelado');
        expect(stock).toBe(stockInicial);
    });

    it('NO debería tocar una reserva que todavía no llegó a las 48hs', async () => {
        const { pedidoId, productoId } = await crearPedidoDePrueba({
            estado: 'pendiente', metodoPago: 'efectivo_local', horasAtras: 10, cantidad: 3, stockInicial: 10
        });

        await liberarReservasExpiradas();

        const { estado, stock } = await obtenerEstadoYStock(pedidoId, productoId);
        expect(estado).toBe('pendiente');
        expect(stock).toBe(7); // sigue reservado, no se repuso
    });

    it('NO debería tocar un pedido de Mercado Pago pendiente aunque tenga más de 48hs', async () => {
        const { pedidoId, productoId } = await crearPedidoDePrueba({
            estado: 'pendiente', metodoPago: 'mercado_pago', horasAtras: 96, cantidad: 1, stockInicial: 10
        });

        await liberarReservasExpiradas();

        const { estado, stock } = await obtenerEstadoYStock(pedidoId, productoId);
        expect(estado).toBe('pendiente');
        expect(stock).toBe(9);
    });

    it('NO debería tocar un pedido ya pagado aunque tenga más de 48hs', async () => {
        const { pedidoId, productoId } = await crearPedidoDePrueba({
            estado: 'pagado', metodoPago: 'efectivo_local', horasAtras: 96, cantidad: 1, stockInicial: 10
        });

        await liberarReservasExpiradas();

        const { estado, stock } = await obtenerEstadoYStock(pedidoId, productoId);
        expect(estado).toBe('pagado');
        expect(stock).toBe(9);
    });

    it('Debería devolver pedidosCancelados: 0 si no hay ninguna reserva vencida', async () => {
        const resultado = await liberarReservasExpiradas();
        expect(resultado.pedidosCancelados).toBe(0);
    });
});
