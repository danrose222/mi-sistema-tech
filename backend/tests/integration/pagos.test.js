const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

// Mockear mercadopagoService
jest.mock('../../src/services/mercadopagoService', () => {
  const original = jest.requireActual('../../src/services/mercadopagoService');
  return {
    ...original,
    obtenerPago: jest.fn().mockImplementation((paymentId) => {
      return Promise.resolve({
        id: paymentId,
        external_reference: '1', // Simular pedido_id = 1
        status: 'approved',
        transaction_amount: 1000
      });
    })
  };
});

describe('Módulo de Pagos (Webhook) Integración', () => {
    let pedidoId;

    beforeEach(async () => {
        // Preparar pedido en BD para actualizar su estado
        const clienteId = await global.crearClienteHelper('Cliente Pago');
        const connection = await pool.getConnection();
        try {
            const [result] = await connection.query('INSERT INTO pedidos (cliente_id, total, estado) VALUES (?, ?, ?)', [clienteId, 1000, 'pendiente']);
            pedidoId = result.insertId;
            
            // Forzar que el external_reference en el mock de obtenerPago apunte a ESTE pedido
            const mpService = require('../../src/services/mercadopagoService');
            mpService.obtenerPago.mockResolvedValue({
                id: 'pay_999',
                external_reference: String(pedidoId),
                status: 'approved',
                transaction_amount: 1000
            });
        } finally {
            connection.release();
        }
    });

    describe('POST /api/pedidos/webhook', () => {
        it('Debería procesar el webhook y actualizar el estado del pedido a pagado', async () => {
            const data = {
                data: { id: 'pay_999' },
                type: 'payment'
            };

            const res = await request(app)
                .post('/api/pedidos/webhook')
                .set('x-mercadopago-topic', 'payment')
                .send(data);

            expect(res.statusCode).toBe(200);
            expect(res.body.received).toBe(true);

            // Verificar base de datos (pagos y estado de pedido)
            const connection = await pool.getConnection();
            const [pedidos] = await connection.query('SELECT estado FROM pedidos WHERE id = ?', [pedidoId]);
            const [pagos] = await connection.query('SELECT * FROM pagos WHERE proveedor_payment_id = ?', ['pay_999']);
            connection.release();

            expect(pedidos[0].estado).toBe('pagado');
            expect(pagos).toHaveLength(1);
            expect(pagos[0].monto).toBe('1000.00'); // DECIMAL se devuelve a veces como string
            expect(pagos[0].estado).toBe('aprobado');
        });

        it('Debería devolver Error 400 si la firma es inválida', async () => {
            const data = {
                data: { id: 'pay_999' },
                type: 'payment'
            };

            const res = await request(app)
                .post('/api/pedidos/webhook')
                .set('x-mercadopago-topic', 'payment')
                .set('x-signature', 'invalid') // Nuestra lógica mockeada
                .send(data);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Firma inválida');
        });

        it('Debería manejar idempotencia y no duplicar pagos si el webhook llega dos veces', async () => {
            const data = {
                data: { id: 'pay_999' },
                type: 'payment'
            };

            // Primer webhook
            const res1 = await request(app)
                .post('/api/pedidos/webhook')
                .set('x-mercadopago-topic', 'payment')
                .send(data);

            expect(res1.statusCode).toBe(200);

            // Segundo webhook idéntico
            const res2 = await request(app)
                .post('/api/pedidos/webhook')
                .set('x-mercadopago-topic', 'payment')
                .send(data);

            expect(res2.statusCode).toBe(200);
            expect(res2.body.message).toMatch(/Idempotencia/i);

            // Validar que solo se creó 1 pago en BD
            const connection = await pool.getConnection();
            const [pagos] = await connection.query('SELECT * FROM pagos WHERE proveedor_payment_id = ?', ['pay_999']);
            connection.release();

            expect(pagos).toHaveLength(1); // Mantiene 1, no duplicó
        });
    });
});
