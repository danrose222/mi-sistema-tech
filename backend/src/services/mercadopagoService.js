const { MercadoPagoConfig, Preference, Payment, MerchantOrder, WebhookSignatureValidator } = require('mercadopago');

// MP_ACCESS_TOKEN_TEST tiene prioridad para poder apuntar el entorno local
// (checkout + webhook vía ngrok) a credenciales de Sandbox sin tocar código;
// en producción alcanza con definir MP_ACCESS_TOKEN. La preferencia y la
// consulta del pago en el webhook usan el mismo cliente/token a propósito:
// si se crea la preferencia con una cuenta y se consulta el pago con otra,
// Mercado Pago devuelve 404/401 en vez del pago real.
const MP_TOKEN = process.env.MP_ACCESS_TOKEN_TEST || process.env.MP_ACCESS_TOKEN || '';
const mpClient = new MercadoPagoConfig({ accessToken: MP_TOKEN });
const preferenceClient = new Preference(mpClient);
const paymentClient = new Payment(mpClient);
const merchantOrderClient = new MerchantOrder(mpClient);

exports.crearPreference = async ({ items, payer, external_reference, back_urls }) => {
  const response = await preferenceClient.create({
    body: {
      items,
      payer,
      external_reference,
      back_urls,
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }],
        installments: 12
      }
    }
  });
  return response;
};

exports.obtenerPago = async (paymentId) => {
  return paymentClient.get({ id: paymentId });
};

exports.obtenerOrden = async (merchantOrderId) => {
  return merchantOrderClient.get({ merchantOrderId });
};

/**
 * Valida la firma HMAC del webhook contra MP_WEBHOOK_SECRET (algoritmo oficial de MercadoPago).
 * Sin secreto configurado no hay forma de distinguir una notificación real de una forjada,
 * así que se rechaza el webhook en vez de aceptarlo "a ciegas".
 */
exports.validarWebhook = (body, headers, query = {}) => {
  const topic = headers['x-meli-topic'] || headers['x-mp-topic'] || headers['x-mercadopago-topic'] || body.type;
  const dataId = query['data.id'] || query.id || (body && body.data && body.data.id) || (body && body.id);
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('Firma inválida');
  }

  try {
    // No se pasa toleranceSeconds: el `ts` que envía MercadoPago viene en segundos y el
    // validador lo compara contra Date.now() en milisegundos, así que fijar una tolerancia
    // aquí rechazaría webhooks legítimos. La comprobación de firma HMAC sigue siendo obligatoria.
    WebhookSignatureValidator.validate({
      xSignature: headers['x-signature'],
      xRequestId: headers['x-request-id'],
      dataId,
      secret
    });
  } catch (err) {
    throw new Error('Firma inválida');
  }

  return { topic, data: body };
};
