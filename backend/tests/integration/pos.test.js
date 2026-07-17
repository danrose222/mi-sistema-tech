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
        it('Debería registrar la venta como pagada de inmediato y descontar el stock (pago 100% efectivo)', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    items: [{ producto_id: productoId, cantidad: 3 }],
                    desglose_pago: { efectivo: 15000, tarjeta: 0, transferencia: 0 }
                });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('pedido_id');
            expect(Number(res.body.total)).toBe(15000);
            expect(Number(res.body.vuelto)).toBe(0);

            const connection = await pool.getConnection();
            const [pedidos] = await connection.query('SELECT estado, metodo_pago, total FROM pedidos WHERE id = ?', [res.body.pedido_id]);
            const [productos] = await connection.query('SELECT stock FROM productos WHERE id = ?', [productoId]);
            const [pagos] = await connection.query('SELECT proveedor, monto, estado FROM pagos WHERE pedido_id = ?', [res.body.pedido_id]);
            connection.release();

            expect(pedidos[0].estado).toBe('pagado');
            expect(pedidos[0].metodo_pago).toBe('efectivo_pos');
            expect(productos[0].stock).toBe(7); // 10 - 3
            expect(pagos).toHaveLength(1);
            expect(pagos[0].proveedor).toBe('efectivo');
            expect(Number(pagos[0].monto)).toBe(15000);
            expect(pagos[0].estado).toBe('aprobado');
        });

        it('Debería registrar un pago mixto (efectivo + tarjeta + transferencia) con un renglón en pagos por cada uno', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    items: [{ producto_id: productoId, cantidad: 3 }], // total 15000
                    desglose_pago: { efectivo: 5000, tarjeta: 6000, transferencia: 4000 }
                });

            expect(res.statusCode).toBe(201);
            expect(Number(res.body.vuelto)).toBe(0);

            const connection = await pool.getConnection();
            const [pagos] = await connection.query(
                'SELECT proveedor, monto FROM pagos WHERE pedido_id = ? ORDER BY proveedor',
                [res.body.pedido_id]
            );
            connection.release();

            expect(pagos).toHaveLength(3);
            const porProveedor = Object.fromEntries(pagos.map((p) => [p.proveedor, Number(p.monto)]));
            expect(porProveedor.efectivo).toBe(5000);
            expect(porProveedor.tarjeta).toBe(6000);
            expect(porProveedor.transferencia).toBe(4000);
        });

        it('Debería calcular el vuelto cuando el efectivo tendido supera el total y no inflar el efectivo aplicado', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    items: [{ producto_id: productoId, cantidad: 3 }], // total 15000
                    desglose_pago: { efectivo: 20000, tarjeta: 0, transferencia: 0 }
                });

            expect(res.statusCode).toBe(201);
            expect(Number(res.body.vuelto)).toBe(5000);

            const connection = await pool.getConnection();
            const [pagos] = await connection.query('SELECT proveedor, monto FROM pagos WHERE pedido_id = ?', [res.body.pedido_id]);
            connection.release();

            expect(pagos).toHaveLength(1);
            expect(Number(pagos[0].monto)).toBe(15000); // no los 20000 tendidos, ya descontado el vuelto
        });

        it('Debería fallar con Error 400 si el desglose de pago no cubre el total', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    items: [{ producto_id: productoId, cantidad: 3 }], // total 15000
                    desglose_pago: { efectivo: 5000, tarjeta: 0, transferencia: 0 }
                });

            expect(res.statusCode).toBe(400);

            const connection = await pool.getConnection();
            const [productos] = await connection.query('SELECT stock FROM productos WHERE id = ?', [productoId]);
            connection.release();
            expect(productos[0].stock).toBe(10); // no se tocó nada, rollback completo
        });

        it('Debería fallar con Error 400 si tarjeta + transferencia superan el total (no hay vuelto electrónico)', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    items: [{ producto_id: productoId, cantidad: 3 }], // total 15000
                    desglose_pago: { efectivo: 0, tarjeta: 20000, transferencia: 0 }
                });

            expect(res.statusCode).toBe(400);
        });

        it('Debería fallar con Error 400 si no se envía el desglose de pago', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ items: [{ producto_id: productoId, cantidad: 1 }] });

            expect(res.statusCode).toBe(400);
        });

        it('Debería fallar con Error 401 sin token', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .send({
                    items: [{ producto_id: productoId, cantidad: 1 }],
                    desglose_pago: { efectivo: 5000, tarjeta: 0, transferencia: 0 }
                });

            expect(res.statusCode).toBe(401);
        });

        it('Debería fallar con Error 400 y no tocar el stock si no hay suficiente', async () => {
            const res = await request(app)
                .post('/api/pedidos/pos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    items: [{ producto_id: productoId, cantidad: 999 }],
                    desglose_pago: { efectivo: 999999, tarjeta: 0, transferencia: 0 }
                });

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
                .send({
                    items: [{ producto_id: 999999, cantidad: 1 }],
                    desglose_pago: { efectivo: 5000, tarjeta: 0, transferencia: 0 }
                });

            expect(res.statusCode).toBe(400);
        });
    });
});
