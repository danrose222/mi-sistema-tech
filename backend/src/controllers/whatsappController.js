const whatsappService = require('../services/whatsappService');
const pedidoModel = require('../models/pedidoModel');
const logError = require('../utils/logError');

exports.enviarRecordatorio = async (req, res) => {
  try {
    const { pedido_id, telefono, mensaje } = req.body;
    let destinatario = telefono;
    let texto = mensaje;

    if (pedido_id) {
      const pedido = await pedidoModel.obtenerPedidoConClientePorId(pedido_id);
      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      destinatario = destinatario || pedido.cliente_telefono;
      if (!destinatario) {
        return res.status(400).json({ error: 'El pedido no tiene teléfono de cliente' });
      }

      const link = pedido.pago_link || 'No hay link de pago disponible';
      texto = texto || `Hola ${pedido.cliente_nombre || 'cliente'}, tu pago está pendiente. Ingresa al link para completar: ${link}`;
    }

    if (!destinatario || !texto) {
      return res.status(400).json({ error: 'Se requiere teléfono y mensaje' });
    }

    const result = await whatsappService.enviarMensaje({ telefono: destinatario, mensaje: texto });
    res.json({ success: true, result });
  } catch (err) {
    logError('[WhatsApp]', err);
    res.status(500).json({ error: 'Error al enviar mensaje de WhatsApp' });
  }
};
