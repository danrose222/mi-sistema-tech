const axios = require('axios');

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

if (!WHATSAPP_API_URL || !WHATSAPP_TOKEN) {
  console.warn('Aviso: las variables WHATSAPP_API_URL y WHATSAPP_TOKEN no están configuradas. El servicio WhatsApp no funcionará sin ellas.');
}

exports.enviarMensaje = async ({ telefono, mensaje }) => {
  if (!WHATSAPP_API_URL || !WHATSAPP_TOKEN) {
    throw new Error('WhatsApp Business API no configurado');
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'text',
    text: { body: mensaje }
  };

  const response = await axios.post(WHATSAPP_API_URL, payload, {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
};
