const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const pool = require('../../src/config/database');

async function crearPedidoPagado({ cantidad = 2, stockInicial = 10, precio = 1000 }) {
    const connection = await pool.getConnection();
    try {
        const [producto] = await connection.query(
            'INSERT INTO productos (nombre, sku, precio, stock) VALUES (?, ?, ?, ?)',
            [`Producto devolución ${Date.now()}-${Math.random()}`, `sku-${Date.now()}-${Math.random()}`, precio, stockInicial]
        );
        const productoId = producto.insertId;

        // Simular el descuento de stock que ya ocurrió al vender
        await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [cantidad, productoId]);

        const [pedido] = await connection.query(
            "INSERT INTO pedidos (cliente_id, total, estado, metodo_pago) VALUES (NULL, ?, 'pagado', 'efectivo_pos')",
            [cantidad * precio]
        );
        const pedidoId = pedido.insertId;

        await connection.query(
            'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
            [pedidoId, productoId, cantidad, precio]
        );
        await connection.query(
            "INSERT INTO pagos (pedido_id, proveedor, monto, estado) VALUES (?, 'efectivo', ?, 'aprobado')",
            [pedidoId, cantidad * precio]
        );

        return { pedidoId, productoId, stockTrasVenta: stockInicial - cantidad, stockInicial, cantidad };
    } finally {
        connection.release();
    }
}

describe('Módulo de Devoluciones/Reembolsos', () => {
    let tokenAdmin;

    beforeEach(async () => {
        const adminData = await global.crearUsuarioAdminYObtenerToken();
        tokenAdmin = adminData.token;
    });

    describe('POST /api/pedidos/:id/devolucion', () => {
        it('Debería reembolsar el pedido y reponer el stock de sus items', async () => {
            const { pedidoId, productoId, stockInicial } = await crearPedidoPagado({ cantidad: 3, stockInicial: 10 });

            const res = await request(app)
                .post(`/api/pedidos/${pedidoId}/devolucion`)
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.estado).toBe('reembolsado');

            const connection = await pool.getConnection();
            const [[pedido]] = await connection.query('SELECT estado, reembolsado_en FROM pedidos WHERE id = ?', [pedidoId]);
            const [[producto]] = await connection.query('SELECT stock FROM productos WHERE id = ?', [productoId]);
            connection.release();

            expect(pedido.estado).toBe('reembolsado');
            expect(pedido.reembolsado_en).not.toBeNull();
            expect(producto.stock).toBe(stockInicial); // se repuso todo lo vendido
        });

        it('Debería fallar con Error 401 sin token', async () => {
            const { pedidoId } = await crearPedidoPagado({});
            const res = await request(app).post(`/api/pedidos/${pedidoId}/devolucion`);
            expect(res.statusCode).toBe(401);
        });

        it('Debería fallar con Error 403 si el usuario no es admin', async () => {
            const { pedidoId } = await crearPedidoPagado({});
            const tokenCajero = jwt.sign({ id: 999, role: 'cajero' }, process.env.JWT_SECRET || 'secret_test', { expiresIn: '1h' });

            const res = await request(app)
                .post(`/api/pedidos/${pedidoId}/devolucion`)
                .set('Authorization', `Bearer ${tokenCajero}`);

            expect(res.statusCode).toBe(403);
        });

        it('Debería fallar con Error 404 si el pedido no existe', async () => {
            const res = await request(app)
                .post('/api/pedidos/999999/devolucion')
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.statusCode).toBe(404);
        });

        it('Debería fallar con Error 409 si el pedido no está pagado', async () => {
            const connection = await pool.getConnection();
            const [pedido] = await connection.query(
                "INSERT INTO pedidos (cliente_id, total, estado, metodo_pago) VALUES (NULL, 1000, 'pendiente', 'transferencia')"
            );
            connection.release();

            const res = await request(app)
                .post(`/api/pedidos/${pedido.insertId}/devolucion`)
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.statusCode).toBe(409);
        });

        it('Debería fallar con Error 409 si el pedido ya fue reembolsado (no permite doble devolución)', async () => {
            const { pedidoId } = await crearPedidoPagado({});

            const primera = await request(app)
                .post(`/api/pedidos/${pedidoId}/devolucion`)
                .set('Authorization', `Bearer ${tokenAdmin}`);
            expect(primera.statusCode).toBe(200);

            const segunda = await request(app)
                .post(`/api/pedidos/${pedidoId}/devolucion`)
                .set('Authorization', `Bearer ${tokenAdmin}`);
            expect(segunda.statusCode).toBe(409);
        });
    });
});
