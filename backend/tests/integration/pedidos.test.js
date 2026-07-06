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
                payer: { email: 'test@test.com' }
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
                ]
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
                ]
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
                ]
            };

            const res = await request(app).post('/api/pedidos').send(data);
            
            expect(res.statusCode).toBe(400);
        });
    });
});
