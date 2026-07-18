const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

jest.mock('../../src/services/emailService', () => ({
    enviarComprobanteCompra: jest.fn().mockResolvedValue(undefined)
}));

describe('Venta a crédito desde el POS', () => {
    let token;
    let clienteId;
    let productoId;

    beforeEach(async () => {
        const usuario = await global.crearUsuarioAdminYObtenerToken();
        token = usuario.token;
        clienteId = await global.crearClienteHelper('Cliente Credito POS');

        const [p] = await pool.query(
            'INSERT INTO productos (nombre, sku, precio, stock) VALUES (?, ?, ?, ?)',
            ['Producto Credito', 'prod-credito', 3000, 10]
        );
        productoId = p.insertId;

        const emailService = require('../../src/services/emailService');
        emailService.enviarComprobanteCompra.mockClear();
    });

    const bodyValido = (overrides = {}) => ({
        items: [{ producto_id: productoId, cantidad: 3 }], // total = 9000
        metodo_pago: 'credito_local',
        credito: {
            clienteId,
            cantidadCuotas: 3,
            frecuencia: 'mensual',
            fechaPrimeraCuota: new Date().toISOString().split('T')[0]
        },
        ...overrides
    });

    it('Debería fallar con 401 sin token', async () => {
        const res = await request(app).post('/api/pedidos/pos').send(bodyValido());
        expect(res.statusCode).toBe(401);
    });

    it('Debería crear el pedido, el crédito y las cuotas correctamente', async () => {
        const res = await request(app)
            .post('/api/pedidos/pos')
            .set('Authorization', `Bearer ${token}`)
            .send(bodyValido());

        expect(res.statusCode).toBe(201);
        expect(res.body.total).toBe(9000);
        expect(res.body.financiacion).toMatchObject({
            cantidad_cuotas: 3,
            monto_por_cuota: 3000,
            total_financiado: 9000
        });

        const [pedidos] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [res.body.pedido_id]);
        expect(pedidos[0].estado).toBe('financiado');
        expect(pedidos[0].metodo_pago).toBe('credito_local');
        expect(pedidos[0].cliente_id).toBe(clienteId);

        const [productos] = await pool.query('SELECT stock FROM productos WHERE id = ?', [productoId]);
        expect(productos[0].stock).toBe(7); // 10 - 3

        const [creditos] = await pool.query('SELECT * FROM creditos WHERE pedido_id = ?', [res.body.pedido_id]);
        expect(creditos.length).toBe(1);
        expect(Number(creditos[0].monto_total)).toBe(9000);
        expect(creditos[0].cantidad_cuotas).toBe(3);
        expect(creditos[0].estado).toBe('activo');

        const [cuotas] = await pool.query('SELECT * FROM cuotas WHERE credito_id = ? ORDER BY numero', [creditos[0].id]);
        expect(cuotas.length).toBe(3);
        expect(cuotas.every((c) => Number(c.monto) === 3000)).toBe(true);

        const emailService = require('../../src/services/emailService');
        expect(emailService.enviarComprobanteCompra).toHaveBeenCalledTimes(1);
        const argsEmail = emailService.enviarComprobanteCompra.mock.calls[0][0];
        expect(argsEmail.financiacion).toMatchObject({ cantidad_cuotas: 3, monto_por_cuota: 3000, total_financiado: 9000 });
    });

    it('Debería fallar con 400 si no se indica cliente', async () => {
        const res = await request(app)
            .post('/api/pedidos/pos')
            .set('Authorization', `Bearer ${token}`)
            .send(bodyValido({ credito: { cantidadCuotas: 3, frecuencia: 'mensual', fechaPrimeraCuota: new Date().toISOString().split('T')[0] } }));

        expect(res.statusCode).toBe(400);
    });

    it('Debería fallar con 400 si la cantidad de cuotas es menor a 2', async () => {
        const res = await request(app)
            .post('/api/pedidos/pos')
            .set('Authorization', `Bearer ${token}`)
            .send(bodyValido({ credito: { clienteId, cantidadCuotas: 1, frecuencia: 'mensual', fechaPrimeraCuota: new Date().toISOString().split('T')[0] } }));

        expect(res.statusCode).toBe(400);
    });

    it('Debería fallar con 400 si la frecuencia es inválida', async () => {
        const res = await request(app)
            .post('/api/pedidos/pos')
            .set('Authorization', `Bearer ${token}`)
            .send(bodyValido({ credito: { clienteId, cantidadCuotas: 3, frecuencia: 'diaria', fechaPrimeraCuota: new Date().toISOString().split('T')[0] } }));

        expect(res.statusCode).toBe(400);
    });

    it('Debería fallar con 400 y NO descontar stock si el cliente no existe', async () => {
        const res = await request(app)
            .post('/api/pedidos/pos')
            .set('Authorization', `Bearer ${token}`)
            .send(bodyValido({ credito: { clienteId: 999999, cantidadCuotas: 3, frecuencia: 'mensual', fechaPrimeraCuota: new Date().toISOString().split('T')[0] } }));

        expect(res.statusCode).toBe(400);

        const [productos] = await pool.query('SELECT stock FROM productos WHERE id = ?', [productoId]);
        expect(productos[0].stock).toBe(10); // rollback completo, no se tocó el stock

        const [pedidos] = await pool.query('SELECT * FROM pedidos WHERE cliente_id IS NULL AND metodo_pago = "credito_local"');
        expect(pedidos.length).toBe(0);
    });

    it('El detalle del pedido (GET /api/pedidos/:id) debería incluir la financiación', async () => {
        const creado = await request(app)
            .post('/api/pedidos/pos')
            .set('Authorization', `Bearer ${token}`)
            .send(bodyValido());

        const res = await request(app)
            .get(`/api/pedidos/${creado.body.pedido_id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.financiacion).toMatchObject({
            cantidad_cuotas: 3,
            monto_por_cuota: 3000,
            total_financiado: 9000,
            estado_credito: 'activo'
        });
    });

    it('El detalle de un pedido normal (no financiado) debería traer financiacion: null', async () => {
        const [ped] = await pool.query(
            "INSERT INTO pedidos (cliente_id, total, metodo_pago, estado) VALUES (?, 5000, 'efectivo_pos', 'pagado')",
            [clienteId]
        );

        const res = await request(app)
            .get(`/api/pedidos/${ped.insertId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.financiacion).toBeNull();
    });
});
