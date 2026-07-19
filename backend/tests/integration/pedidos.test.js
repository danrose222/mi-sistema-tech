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

describe('Módulo de Pedidos Integración', () => {
    let clienteId;
    let productoStockId;
    let productoNoStockId;

    beforeEach(async () => {
        clienteId = await global.crearClienteHelper('Cliente Pedido');
        
        const connection = await pool.getConnection();
        try {
            const [p1] = await connection.query(
                'INSERT INTO productos (nombre, sku, precio, stock) VALUES (?, ?, ?, ?)',
                ['Producto Stock', 'prod-stock', 1000, 10]
            );
            productoStockId = p1.insertId;

            const [p2] = await connection.query(
                'INSERT INTO productos (nombre, sku, precio, stock) VALUES (?, ?, ?, ?)',
                ['Producto Sin Stock', 'prod-sin-stock', 1000, 0]
            );
            productoNoStockId = p2.insertId;

        } finally {
            connection.release();
        }
    });

    describe('POST /api/pedidos', () => {
        it('Debería crear el pedido y descontar el stock si hay suficiente', async () => {
            const data = {
                cliente_id: clienteId,
                items: [
                    { producto_id: productoStockId, cantidad: 2, precio_unitario: 1000, nombre: 'Producto Stock' }
                ],
                payer: { email: 'test@test.com', dni: '30111111' }
            };

            const res = await request(app)
                .post('/api/pedidos')
                .send(data);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('pedido_id');
            expect(res.body).toHaveProperty('pago_link');

            // Verificar que el stock bajó (10 - 2 = 8)
            const connection = await pool.getConnection();
            const [rows] = await connection.query('SELECT stock FROM productos WHERE id = ?', [productoStockId]);
            connection.release();
            
            expect(rows[0].stock).toBe(8);
        });

        it('Debería fallar con Error 400 si el producto no tiene stock suficiente', async () => {
            const data = {
                cliente_id: clienteId,
                items: [
                    { producto_id: productoStockId, cantidad: 15, precio_unitario: 1000, nombre: 'Producto Stock' }
                ],
                payer: { email: 'test@test.com', dni: '30111111' }
            };

            const res = await request(app).post('/api/pedidos').send(data);
            
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/no tiene stock/i);

            // Verificar que el stock NO bajó (rollback)
            const connection = await pool.getConnection();
            const [rows] = await connection.query('SELECT stock FROM productos WHERE id = ?', [productoStockId]);
            connection.release();
            expect(rows[0].stock).toBe(10);
        });

        it('Debería fallar con Error 400 si el producto no existe', async () => {
            const data = {
                cliente_id: clienteId,
                items: [
                    { producto_id: 9999, cantidad: 1, precio_unitario: 1000, nombre: 'Fantasma' }
                ],
                payer: { email: 'test@test.com', dni: '30111111' }
            };

            const res = await request(app).post('/api/pedidos').send(data);
            
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/no existe/i);
        });
        
        it('Debería fallar con Error 400 si el producto existe pero su stock inicial es 0', async () => {
            const data = {
                cliente_id: clienteId,
                items: [
                    { producto_id: productoNoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'No Stock' }
                ],
                payer: { email: 'test@test.com', dni: '30111111' }
            };

            const res = await request(app).post('/api/pedidos').send(data);

            expect(res.statusCode).toBe(400);
        });

        it('Debería usar Mercado Pago por defecto si no se envía metodo_pago (compatibilidad)', async () => {
            const data = {
                cliente_id: clienteId,
                items: [{ producto_id: productoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'Producto Stock' }],
                payer: { email: 'test@test.com', dni: '30111111' }
            };

            const res = await request(app).post('/api/pedidos').send(data);

            expect(res.statusCode).toBe(201);
            expect(res.body.metodo_pago).toBe('mercado_pago');
            expect(res.body.pago_link).toBeTruthy();
        });

        it('Debería crear el pedido pendiente por transferencia sin llamar a Mercado Pago', async () => {
            const mpService = require('../../src/services/mercadopagoService');
            mpService.crearPreference.mockClear();

            const data = {
                cliente_id: clienteId,
                metodo_pago: 'transferencia',
                items: [{ producto_id: productoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'Producto Stock' }],
                payer: { email: 'test@test.com', dni: '30111111' }
            };

            const res = await request(app).post('/api/pedidos').send(data);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('pedido_id');
            expect(res.body.metodo_pago).toBe('transferencia');
            expect(res.body.pago_link).toBeNull();
            expect(mpService.crearPreference).not.toHaveBeenCalled();

            const connection = await pool.getConnection();
            const [rows] = await connection.query('SELECT estado, metodo_pago, pago_link FROM pedidos WHERE id = ?', [res.body.pedido_id]);
            connection.release();
            expect(rows[0].estado).toBe('pendiente');
            expect(rows[0].metodo_pago).toBe('transferencia');
            expect(rows[0].pago_link).toBeNull();
        });

        it('Debería crear el pedido pendiente por efectivo en local sin llamar a Mercado Pago', async () => {
            const mpService = require('../../src/services/mercadopagoService');
            mpService.crearPreference.mockClear();

            const data = {
                cliente_id: clienteId,
                metodo_pago: 'efectivo_local',
                items: [{ producto_id: productoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'Producto Stock' }],
                payer: { email: 'test@test.com', dni: '30111111' }
            };

            const res = await request(app).post('/api/pedidos').send(data);

            expect(res.statusCode).toBe(201);
            expect(res.body.metodo_pago).toBe('efectivo_local');
            expect(res.body.pago_link).toBeNull();
            expect(mpService.crearPreference).not.toHaveBeenCalled();
        });

        it('Debería fallar con Error 400 si metodo_pago no es válido', async () => {
            const data = {
                cliente_id: clienteId,
                metodo_pago: 'bitcoin',
                items: [{ producto_id: productoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'Producto Stock' }],
                payer: { email: 'test@test.com', dni: '30111111' }
            };

            const res = await request(app).post('/api/pedidos').send(data);

            expect(res.statusCode).toBe(400);
        });

        it('Debería fallar con Error 400 si no se envía DNI (obligatorio para facturación fiscal)', async () => {
            const data = {
                cliente_id: clienteId,
                items: [{ producto_id: productoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'Producto Stock' }],
                payer: { email: 'test@test.com' }
            };

            const res = await request(app).post('/api/pedidos').send(data);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/dni/i);
        });

        it('Debería fallar con Error 400 si el DNI tiene caracteres no numéricos', async () => {
            const data = {
                cliente_id: clienteId,
                items: [{ producto_id: productoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'Producto Stock' }],
                payer: { email: 'test@test.com', dni: '30.111.111' }
            };

            const res = await request(app).post('/api/pedidos').send(data);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/dni/i);
        });

        describe('Método de entrega (retiro en local vs envío a domicilio)', () => {
            it('Debería crear el pedido como "retiro_local" por defecto si no se envía metodo_entrega (compatibilidad)', async () => {
                const data = {
                    cliente_id: clienteId,
                    items: [{ producto_id: productoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'Producto Stock' }],
                    payer: { email: 'test@test.com', dni: '30111111' }
                };

                const res = await request(app).post('/api/pedidos').send(data);
                expect(res.statusCode).toBe(201);

                const [rows] = await pool.query('SELECT metodo_entrega, direccion_envio FROM pedidos WHERE id = ?', [res.body.pedido_id]);
                expect(rows[0].metodo_entrega).toBe('retiro_local');
                expect(rows[0].direccion_envio).toBeNull();
            });

            it('Debería permitir "retiro_local" sin dirección aunque se mande una vacía', async () => {
                const data = {
                    cliente_id: clienteId,
                    metodo_entrega: 'retiro_local',
                    direccion: '',
                    items: [{ producto_id: productoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'Producto Stock' }],
                    payer: { email: 'test@test.com', dni: '30111111' }
                };

                const res = await request(app).post('/api/pedidos').send(data);
                expect(res.statusCode).toBe(201);
            });

            it('Debería descartar la dirección enviada si el método de entrega es "retiro_local"', async () => {
                const data = {
                    cliente_id: clienteId,
                    metodo_entrega: 'retiro_local',
                    direccion: 'Calle que no debería guardarse 123',
                    items: [{ producto_id: productoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'Producto Stock' }],
                    payer: { email: 'test@test.com', dni: '30111111' }
                };

                const res = await request(app).post('/api/pedidos').send(data);
                expect(res.statusCode).toBe(201);

                const [rows] = await pool.query('SELECT direccion_envio FROM pedidos WHERE id = ?', [res.body.pedido_id]);
                expect(rows[0].direccion_envio).toBeNull();
            });

            it('Debería fallar con 400 si metodo_entrega es "envio_domicilio" sin dirección', async () => {
                const data = {
                    cliente_id: clienteId,
                    metodo_entrega: 'envio_domicilio',
                    items: [{ producto_id: productoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'Producto Stock' }],
                    payer: { email: 'test@test.com', dni: '30111111' }
                };

                const res = await request(app).post('/api/pedidos').send(data);
                expect(res.statusCode).toBe(400);
                expect(res.body.error).toMatch(/dirección/i);

                // El stock no debe haberse tocado: la validación corta antes de la transacción.
                const [productos] = await pool.query('SELECT stock FROM productos WHERE id = ?', [productoStockId]);
                expect(productos[0].stock).toBe(10);
            });

            it('Debería crear el pedido y guardar la dirección si metodo_entrega es "envio_domicilio"', async () => {
                const data = {
                    cliente_id: clienteId,
                    metodo_entrega: 'envio_domicilio',
                    direccion: 'Av. Siempre Viva 742',
                    items: [{ producto_id: productoStockId, cantidad: 1, precio_unitario: 1000, nombre: 'Producto Stock' }],
                    payer: { email: 'test@test.com', dni: '30111111' }
                };

                const res = await request(app).post('/api/pedidos').send(data);
                expect(res.statusCode).toBe(201);

                const [rows] = await pool.query('SELECT metodo_entrega, direccion_envio FROM pedidos WHERE id = ?', [res.body.pedido_id]);
                expect(rows[0].metodo_entrega).toBe('envio_domicilio');
                expect(rows[0].direccion_envio).toBe('Av. Siempre Viva 742');
            });
        });
    });
});
