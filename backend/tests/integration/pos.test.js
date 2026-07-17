const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

describe('Módulo de Punto de Venta (POS) Integración', () => {
    let tokenAdmin;
    let productoId;

    beforeEach(async () => {
        const adminData = await global.crearUsuarioAdminYObtenerToken();
        tokenAdmin = adminData.token;

        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query(
                'INSERT INTO productos (nombre, sku, barcode, precio, stock) VALUES (?, ?, ?, ?, ?)',
                ['Cargador USB-C', 'cargador-usbc', '7791234567890', 5000, 10]
            );
            productoId = result.insertId;
        } finally {
            connection.release();
        }
    });

    describe('GET /api/productos/barcode/:barcode', () => {
        it('Debería encontrar el producto por su código de barras con precio incluido', async () => {
            const res = await request(app)
                .get('/api/productos/barcode/7791234567890')
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.id).toBe(productoId);
            expect(Number(res.body.data.precio)).toBe(5000);
        });

        it('Debería fallar con Error 401 sin token', async () => {
            const res = await request(app).get('/api/productos/barcode/7791234567890');
            expect(res.statusCode).toBe(401);
        });

        it('Debería fallar con Error 404 si no existe ningún producto con ese código', async () => {
            const res = await request(app)
                .get('/api/productos/barcode/0000000000000')
                .set('Authorization', `Bearer ${tokenAdmin}`);
            expect(res.statusCode).toBe(404);
        });
    });

    describe('POST /api/pedidos/pos', () => {
        it('Debería registrar la venta como pagada de inmediato y descontar el stock', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ items: [{ producto_id: productoId, cantidad: 3 }] });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('pedido_id');
            expect(Number(res.body.total)).toBe(15000);

            const connection = await pool.getConnection();
            const [pedidos] = await connection.query('SELECT estado, metodo_pago, total FROM pedidos WHERE id = ?', [res.body.pedido_id]);
            const [productos] = await connection.query('SELECT stock FROM productos WHERE id = ?', [productoId]);
            connection.release();

            expect(pedidos[0].estado).toBe('pagado');
            expect(pedidos[0].metodo_pago).toBe('efectivo_pos');
            expect(productos[0].stock).toBe(7); // 10 - 3
        });

        it('Debería fallar con Error 401 sin token', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .send({ items: [{ producto_id: productoId, cantidad: 1 }] });

            expect(res.statusCode).toBe(401);
        });

        it('Debería fallar con Error 400 y no tocar el stock si no hay suficiente', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ items: [{ producto_id: productoId, cantidad: 999 }] });

            expect(res.statusCode).toBe(400);

            const connection = await pool.getConnection();
            const [productos] = await connection.query('SELECT stock FROM productos WHERE id = ?', [productoId]);
            connection.release();
            expect(productos[0].stock).toBe(10);
        });

        it('Debería fallar con Error 400 si el producto no existe', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ items: [{ producto_id: 999999, cantidad: 1 }] });

            expect(res.statusCode).toBe(400);
        });

    });
});
