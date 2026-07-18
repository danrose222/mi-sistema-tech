const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

jest.mock('../../src/services/emailService', () => ({
    enviarComprobanteCompra: jest.fn().mockResolvedValue(undefined)
}));

describe('Control de IMEI/N° de serie en ventas del POS', () => {
    let token;
    let productoImeiId;
    let productoNormalId;

    beforeEach(async () => {
        const usuario = await global.crearUsuarioAdminYObtenerToken();
        token = usuario.token;

        const [p1] = await pool.query(
            'INSERT INTO productos (nombre, sku, precio, stock, requiere_imei) VALUES (?, ?, ?, ?, 1)',
            ['Samsung Galaxy S26 Ultra', 'sku-cel', 500000, 10]
        );
        productoImeiId = p1.insertId;

        const [p2] = await pool.query(
            'INSERT INTO productos (nombre, sku, precio, stock, requiere_imei) VALUES (?, ?, ?, ?, 0)',
            ['Funda genérica', 'sku-funda', 3000, 20]
        );
        productoNormalId = p2.insertId;
    });

    it('Debería fallar con 400 si un producto que requiere IMEI se vende sin IMEI', async () => {
        const res = await request(app)
            .post('/api/pedidos/pos')
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [{ producto_id: productoImeiId, cantidad: 1 }],
                desglose_pago: { efectivo: 500000, tarjeta: 0, transferencia: 0 }
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/imei/i);

        const [productos] = await pool.query('SELECT stock FROM productos WHERE id = ?', [productoImeiId]);
        expect(productos[0].stock).toBe(10); // rollback, no se tocó el stock
    });

    it('Debería guardar el imei_serie de la venta y devolverlo en el detalle del pedido', async () => {
        const res = await request(app)
            .post('/api/pedidos/pos')
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [{ producto_id: productoImeiId, cantidad: 1, imei_serie: '351234567890123' }],
                desglose_pago: { efectivo: 500000, tarjeta: 0, transferencia: 0 }
            });

        expect(res.statusCode).toBe(201);

        const [items] = await pool.query('SELECT imei_serie FROM pedido_items WHERE pedido_id = ?', [res.body.pedido_id]);
        expect(items[0].imei_serie).toBe('351234567890123');

        const detalle = await request(app)
            .get(`/api/pedidos/${res.body.pedido_id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(detalle.statusCode).toBe(200);
        expect(detalle.body.data.items[0].imei_serie).toBe('351234567890123');
    });

    it('Debería vender normalmente un producto que NO requiere IMEI, sin pedirlo', async () => {
        const res = await request(app)
            .post('/api/pedidos/pos')
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [{ producto_id: productoNormalId, cantidad: 2 }],
                desglose_pago: { efectivo: 6000, tarjeta: 0, transferencia: 0 }
            });

        expect(res.statusCode).toBe(201);

        const [items] = await pool.query('SELECT imei_serie FROM pedido_items WHERE pedido_id = ?', [res.body.pedido_id]);
        expect(items[0].imei_serie).toBeNull();
    });

    it('Debería permitir vender dos unidades del mismo producto con IMEI distinto (dos líneas)', async () => {
        const res = await request(app)
            .post('/api/pedidos/pos')
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [
                    { producto_id: productoImeiId, cantidad: 1, imei_serie: '111111111111111' },
                    { producto_id: productoImeiId, cantidad: 1, imei_serie: '222222222222222' }
                ],
                desglose_pago: { efectivo: 1000000, tarjeta: 0, transferencia: 0 }
            });

        expect(res.statusCode).toBe(201);

        const [items] = await pool.query('SELECT imei_serie FROM pedido_items WHERE pedido_id = ? ORDER BY imei_serie', [res.body.pedido_id]);
        expect(items).toHaveLength(2);
        expect(items.map((i) => i.imei_serie)).toEqual(['111111111111111', '222222222222222']);

        const [productos] = await pool.query('SELECT stock FROM productos WHERE id = ?', [productoImeiId]);
        expect(productos[0].stock).toBe(8); // 10 - 1 - 1
    });

    it('Debería fallar con 400 si falta el IMEI en una venta a crédito de un producto que lo requiere', async () => {
        const clienteId = await global.crearClienteHelper('Cliente Credito Imei');
        const res = await request(app)
            .post('/api/pedidos/pos')
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [{ producto_id: productoImeiId, cantidad: 1 }],
                metodo_pago: 'credito_local',
                credito: {
                    clienteId,
                    cantidadCuotas: 3,
                    frecuencia: 'mensual',
                    fechaPrimeraCuota: new Date(Date.now() + 86400000).toISOString().split('T')[0]
                }
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/imei/i);
    });

    it('GET /api/productos/barcode/:barcode debería incluir requiere_imei', async () => {
        await pool.query('UPDATE productos SET barcode = ? WHERE id = ?', ['1414141414999', productoImeiId]);

        const res = await request(app)
            .get('/api/productos/barcode/1414141414999')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(!!res.body.data.requiere_imei).toBe(true);
    });
});
