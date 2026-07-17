const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

// Mockear MercadoPago para no hacer llamadas reales a la API externa
jest.mock('../../src/services/mercadopagoService', () => ({
    crearPreference: jest.fn().mockResolvedValue({
        id: 'pref_123',
        init_point: 'https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref_123'
    })
}));

describe('CRM unificado: auto-registro por DNI y buscador rápido', () => {
    let productoId;
    let tokenAdmin;

    beforeEach(async () => {
        const adminData = await global.crearUsuarioAdminYObtenerToken();
        tokenAdmin = adminData.token;

        const connection = await pool.getConnection();
        try {
            const [p] = await connection.query(
                'INSERT INTO productos (nombre, sku, precio, stock) VALUES (?, ?, ?, ?)',
                ['Producto CRM', 'prod-crm', 1000, 10]
            );
            productoId = p.insertId;
        } finally {
            connection.release();
        }
    });

    describe('POST /api/pedidos con DNI (checkout web)', () => {
        it('Debería crear un cliente nuevo automáticamente si el DNI no existe', async () => {
            const data = {
                metodo_pago: 'transferencia',
                items: [{ producto_id: productoId, cantidad: 1 }],
                payer: { email: 'nuevo@test.com', name: 'Cliente Nuevo', phone: { number: '3001234567' }, dni: '30111222' }
            };

            const res = await request(app).post('/api/pedidos').send(data);
            expect(res.statusCode).toBe(201);

            const [pedidos] = await pool.query('SELECT cliente_id FROM pedidos WHERE id = ?', [res.body.pedido_id]);
            expect(pedidos[0].cliente_id).not.toBeNull();

            const [clientes] = await pool.query('SELECT * FROM clientes WHERE dni = ?', ['30111222']);
            expect(clientes.length).toBe(1);
            expect(clientes[0].nombre).toBe('Cliente Nuevo');
            expect(clientes[0].telefono).toBe('3001234567');
            expect(clientes[0].id).toBe(pedidos[0].cliente_id);
        });

        it('Debería reutilizar el cliente existente si el DNI ya está registrado', async () => {
            const [existente] = await pool.query(
                "INSERT INTO clientes (nombre, telefono, email, dni) VALUES ('Cliente Viejo', '111', 'viejo@test.com', '40333444')"
            );
            const clienteIdExistente = existente.insertId;

            const data = {
                metodo_pago: 'transferencia',
                items: [{ producto_id: productoId, cantidad: 1 }],
                payer: { email: 'otro-email@test.com', name: 'Otro Nombre', dni: '40333444' }
            };

            const res = await request(app).post('/api/pedidos').send(data);
            expect(res.statusCode).toBe(201);

            const [pedidos] = await pool.query('SELECT cliente_id FROM pedidos WHERE id = ?', [res.body.pedido_id]);
            expect(pedidos[0].cliente_id).toBe(clienteIdExistente);

            // No debe haber creado un segundo cliente con el mismo DNI
            const [clientes] = await pool.query('SELECT * FROM clientes WHERE dni = ?', ['40333444']);
            expect(clientes.length).toBe(1);
            expect(clientes[0].nombre).toBe('Cliente Viejo'); // no pisa los datos existentes
        });

        it('Debería crear el pedido sin cliente asociado si no se envía DNI (compatibilidad)', async () => {
            const data = {
                metodo_pago: 'transferencia',
                items: [{ producto_id: productoId, cantidad: 1 }],
                payer: { email: 'sindni@test.com' }
            };

            const res = await request(app).post('/api/pedidos').send(data);
            expect(res.statusCode).toBe(201);

            const [pedidos] = await pool.query('SELECT cliente_id FROM pedidos WHERE id = ?', [res.body.pedido_id]);
            expect(pedidos[0].cliente_id).toBeNull();
        });
    });

    describe('GET /api/clientes/buscar?dni=', () => {
        it('Debería fallar con 401 sin token', async () => {
            const res = await request(app).get('/api/clientes/buscar?dni=12345678');
            expect(res.statusCode).toBe(401);
        });

        it('Debería fallar con 404 si el DNI no corresponde a ningún cliente', async () => {
            const res = await request(app)
                .get('/api/clientes/buscar?dni=99999999')
                .set('Authorization', `Bearer ${tokenAdmin}`);
            expect(res.statusCode).toBe(404);
        });

        it('Debería devolver estado_crediticio "sin_historial" para un cliente sin créditos', async () => {
            await pool.query("INSERT INTO clientes (nombre, dni) VALUES ('Sin Historial', '11111111')");

            const res = await request(app)
                .get('/api/clientes/buscar?dni=11111111')
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.estado_crediticio).toBe('sin_historial');
        });

        it('Debería devolver estado_crediticio "al_dia" si tiene créditos pero ninguno moroso', async () => {
            const [cliente] = await pool.query("INSERT INTO clientes (nombre, dni) VALUES ('Cliente Al Dia', '22222222')");
            await pool.query(
                `INSERT INTO creditos (cliente_id, monto_total, cantidad_cuotas, frecuencia, monto_cuota, fecha_primera_cuota, estado)
                 VALUES (?, 10000, 5, 'mensual', 2000, CURDATE(), 'activo')`,
                [cliente.insertId]
            );

            const res = await request(app)
                .get('/api/clientes/buscar?dni=22222222')
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.estado_crediticio).toBe('al_dia');
        });

        it('Debería devolver estado_crediticio "moroso" con ALERTA si tiene un crédito moroso', async () => {
            const [cliente] = await pool.query("INSERT INTO clientes (nombre, dni) VALUES ('Cliente Moroso', '33333333')");
            await pool.query(
                `INSERT INTO creditos (cliente_id, monto_total, cantidad_cuotas, frecuencia, monto_cuota, fecha_primera_cuota, estado)
                 VALUES (?, 10000, 5, 'mensual', 2000, CURDATE(), 'moroso')`,
                [cliente.insertId]
            );

            const res = await request(app)
                .get('/api/clientes/buscar?dni=33333333')
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.estado_crediticio).toBe('moroso');
        });
    });
});
