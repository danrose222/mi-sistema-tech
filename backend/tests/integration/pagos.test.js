const request = require('supertest');
const crypto = require('crypto');
const app = require('../../src/app');
const pool = require('../../src/config/database');

// Genera una firma x-signature válida siguiendo el algoritmo real de MercadoPago
// (HMAC-SHA256 sobre "id:{dataId};ts:{ts};" con el secreto configurado en MP_WEBHOOK_SECRET).
function generarFirmaWebhook(dataId) {
  const ts = Date.now();
  const manifest = `id:${dataId};ts:${ts};`;
  const hash = crypto.createHmac('sha256', process.env.MP_WEBHOOK_SECRET).update(manifest).digest('hex');
  return `ts=${ts},v1=${hash}`;
}

// El webhook responde 200 antes de terminar de procesar en segundo plano (ver
// pedidoController.webhookPago), así que las aserciones contra la base deben
// esperar a que esa escritura asíncrona se complete en vez de asumir que ya
// ocurrió apenas resuelve el POST.
async function esperarHasta(condicionAsync, { intentos = 40, esperaMs = 25 } = {}) {
  for (let i = 0; i < intentos; i++) {
    if (await condicionAsync()) return true;
    await new Promise((resolve) => setTimeout(resolve, esperaMs));
  }
  return false;
}

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
                .set('x-signature', generarFirmaWebhook('pay_999'))
                .send(data);

            expect(res.statusCode).toBe(200);
            expect(res.body.received).toBe(true);

            // Verificar base de datos (pagos y estado de pedido) una vez que el
            // procesamiento en segundo plano terminó
            const connection = await pool.getConnection();
            await esperarHasta(async () => {
                const [pagos] = await connection.query('SELECT * FROM pagos WHERE proveedor_payment_id = ?', ['pay_999']);
                return pagos.length > 0;
            });
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
                .set('x-signature', generarFirmaWebhook('pay_999'))
                .send(data);

            expect(res1.statusCode).toBe(200);

            // Esperar a que el primer webhook termine de procesarse en segundo
            // plano antes de mandar el segundo, para no correr una carrera
            // contra su propia inserción en pagos
            const connection = await pool.getConnection();
            await esperarHasta(async () => {
                const [pagos] = await connection.query('SELECT * FROM pagos WHERE proveedor_payment_id = ?', ['pay_999']);
                return pagos.length > 0;
            });

            // Segundo webhook idéntico: la respuesta HTTP sigue siendo 200 de
            // inmediato (ya no espera la verificación de idempotencia), pero
            // esa verificación evita que se cree un segundo registro en pagos
            const res2 = await request(app)
                .post('/api/pedidos/webhook')
                .set('x-mercadopago-topic', 'payment')
                .set('x-signature', generarFirmaWebhook('pay_999'))
                .send(data);

            expect(res2.statusCode).toBe(200);
            expect(res2.body.received).toBe(true);

            // Pequeño respiro para que, si el segundo webhook llegara a duplicar
            // el pago, la escritura ya haya ocurrido antes de esta verificación
            await new Promise((resolve) => setTimeout(resolve, 100));

            const [pagos] = await connection.query('SELECT * FROM pagos WHERE proveedor_payment_id = ?', ['pay_999']);
            connection.release();

            expect(pagos).toHaveLength(1); // Mantiene 1, no duplicó
        });

        it('Debería responder 200 sin consultar el pago si el topic no es "payment"', async () => {
            const mpService = require('../../src/services/mercadopagoService');
            mpService.obtenerPago.mockClear();

            const data = { data: { id: '123' }, resource: 'https://api.mercadopago.com/merchant_orders/123' };

            const res = await request(app)
                .post('/api/pedidos/webhook')
                .set('x-mercadopago-topic', 'merchant_order')
                .set('x-signature', generarFirmaWebhook('123'))
                .send(data);

            expect(res.statusCode).toBe(200);
            expect(res.body.procesado).toBe(false);
            expect(mpService.obtenerPago).not.toHaveBeenCalled();
        });
    });
});
