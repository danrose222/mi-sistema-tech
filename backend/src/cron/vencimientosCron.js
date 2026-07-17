const cron = require('node-cron');
const alertaService = require('../services/alertaService');
const whatsappService = require('../services/whatsappService');

const MINUTOS = process.env.CRON_VENCIMIENTOS_MINUTOS || '0';
const HORAS = process.env.CRON_VENCIMIENTOS_HORAS || '8';

// Plantilla de cobranza para pedidos vencidos aprobada en Meta Business Manager.
// Body con 3 variables en orden: {{1}} nombre del cliente, {{2}} monto, {{3}} link de pago.
const NOMBRE_PLANTILLA_PEDIDO = process.env.WHATSAPP_TEMPLATE_PEDIDO_VENCIDO || 'recordatorio_pedido_vencido';
const IDIOMA_PLANTILLA = process.env.WHATSAPP_TEMPLATE_LANG || 'es_AR';

const enviarRecordatoriosVencidos = async () => {
  try {
    const pedidos = await alertaService.obtenerPedidosVencidos();
    for (const pedido of pedidos) {
      const alertaEnviada = await alertaService.verificarAlertaEnviada(pedido.id);
      if (alertaEnviada) continue;

      const telefono = pedido.cliente_telefono;
      if (!telefono) continue;

      await whatsappService.enviarPlantilla({
        telefono,
        nombrePlantilla: NOMBRE_PLANTILLA_PEDIDO,
        idioma: IDIOMA_PLANTILLA,
        parametros: [pedido.cliente_nombre || 'cliente', pedido.total.toFixed(2), pedido.pago_link || '']
      });
      await alertaService.marcarAlertaEnviada(pedido.id);
    }
  } catch (error) {
    console.error('Error en cron de vencimientos:', error);
  }
};

cron.schedule(`${MINUTOS} ${HORAS} * * *`, () => {
  console.log('Ejecutando cron de vencimientos...');
  enviarRecordatoriosVencidos();
});

module.exports = { enviarRecordatoriosVencidos };
