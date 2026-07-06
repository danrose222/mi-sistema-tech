const cron = require('node-cron');
const alertaService = require('../services/alertaService');
const whatsappService = require('../services/whatsappService');

const MINUTOS = process.env.CRON_VENCIMIENTOS_MINUTOS || '0';
const HORAS = process.env.CRON_VENCIMIENTOS_HORAS || '8';

const enviarRecordatoriosVencidos = async () => {
  try {
    const pedidos = await alertaService.obtenerPedidosVencidos();
    for (const pedido of pedidos) {
      const alertaEnviada = await alertaService.verificarAlertaEnviada(pedido.id);
      if (alertaEnviada) continue;

      const telefono = pedido.cliente_telefono;
      if (!telefono) continue;

      const mensaje = `Hola ${pedido.cliente_nombre || 'cliente'}, tu pago de $${pedido.total.toFixed(2)} está vencido. Completa tu pago aquí: ${pedido.pago_link}`;
      await whatsappService.enviarMensaje({ telefono, mensaje });
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
