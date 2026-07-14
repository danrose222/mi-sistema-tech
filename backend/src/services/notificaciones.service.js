/**
 * @fileoverview Motor de recordatorios de cobranza por WhatsApp para cuotas de créditos.
 */

const cuotasRepo = require('../repositories/cuotas.repository');
const whatsappService = require('./whatsappService');

/**
 * Arma el texto del recordatorio para una cuota (dinámico según si está
 * "por vencer" o ya "vencida").
 * @param {Object} cuota - Cuota con datos de cliente/producto (ver cuotasRepo.buscarParaRecordatorio).
 * @returns {string} Mensaje listo para enviar por WhatsApp.
 */
function construirMensaje(cuota) {
  const fecha = new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR', { timeZone: 'UTC' });
  const monto = Number(cuota.monto).toFixed(2);
  const productoTexto = cuota.producto_nombre ? ` por el producto ${cuota.producto_nombre}` : '';
  const esVencida = cuota.tipo === 'vencida' || cuota.estado === 'vencida';
  const estadoTexto = esVencida
    ? `se encuentra vencida desde el ${fecha}`
    : `vence el ${fecha}`;

  return `Hola ${cuota.cliente_nombre}, te recordamos que tu cuota #${cuota.numero} de $${monto}${productoTexto} ${estadoTexto}. ` +
    `Para consultar métodos de pago, contactate con nosotros. ¡Gracias!`;
}

/**
 * Recorre las cuotas "por vencer" (hoy/mañana) y "vencidas" (sin recordatorio
 * en los últimos 3 días) y les envía un WhatsApp de cobranza. Corre a diario
 * vía cron (ver cron.service.js) y también puede llamarse a demanda.
 * @param {Object} pool - Pool de conexiones.
 * @returns {Promise<{total: number, enviados: number, fallidos: number, omitidos: number}>}
 */
async function enviarRecordatoriosDeCuotas(pool) {
  const cuotas = await cuotasRepo.buscarParaRecordatorio(pool);

  let enviados = 0;
  let fallidos = 0;
  let omitidos = 0;

  for (const cuota of cuotas) {
    if (!cuota.cliente_telefono) {
      console.warn(`[NotificacionesService] Cuota #${cuota.id} (cliente #${cuota.cliente_id}) sin teléfono registrado, se omite.`);
      omitidos++;
      continue;
    }

    try {
      const mensaje = construirMensaje(cuota);
      await whatsappService.enviarMensaje({ telefono: cuota.cliente_telefono, mensaje });
      await cuotasRepo.marcarRecordatorioEnviado(pool, cuota.id);
      enviados++;
    } catch (error) {
      fallidos++;
      console.error(`[NotificacionesService] Error al enviar recordatorio de cuota #${cuota.id}:`, error.message);
    }
  }

  return { total: cuotas.length, enviados, fallidos, omitidos };
}

module.exports = { enviarRecordatoriosDeCuotas, construirMensaje };
