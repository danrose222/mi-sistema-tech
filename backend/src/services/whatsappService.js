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

// Mensajes iniciados por el sistema (cron de cobranzas) van fuera de la ventana de
// 24hs de atención al cliente: Graph API rechaza `type: 'text'` en ese caso y exige
// una plantilla pre-aprobada en Meta Business Manager. `parametros` se mapean en
// orden a las variables {{1}}, {{2}}... del body de esa plantilla.
exports.enviarPlantilla = async ({ telefono, nombrePlantilla, idioma = 'es_AR', parametros = [] }) => {
  if (!WHATSAPP_API_URL || !WHATSAPP_TOKEN) {
    throw new Error('WhatsApp Business API no configurado');
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: telefono,
    type: 'template',
    template: {
      name: nombrePlantilla,
      language: { code: idioma },
      components: [
        {
          type: 'body',
          parameters: parametros.map((texto) => ({ type: 'text', text: String(texto) }))
        }
      ]
    }
  };

  const response = await axios.post(WHATSAPP_API_URL, payload, {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
};
