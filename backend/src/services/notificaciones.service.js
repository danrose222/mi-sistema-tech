/**
 * @fileoverview Motor de recordatorios de cobranza por WhatsApp para cuotas de créditos.
 */

const cuotasRepo = require('../repositories/cuotas.repository');
const whatsappService = require('./whatsappService');

// Nombre de la plantilla de cobranza aprobada en Meta Business Manager. El body
// de esa plantilla debe tener 4 variables en este orden: {{1}} nombre del cliente,
// {{2}} número de cuota, {{3}} monto, {{4}} estado (vencida/vence + fecha + producto).
const NOMBRE_PLANTILLA_CUOTA = process.env.WHATSAPP_TEMPLATE_CUOTA || 'recordatorio_cuota';
const IDIOMA_PLANTILLA = process.env.WHATSAPP_TEMPLATE_LANG || 'es_AR';

/**
 * Arma los parámetros posicionales del recordatorio para una cuota (dinámico
 * según si está "por vencer" o ya "vencida"), en el orden que espera la
 * plantilla NOMBRE_PLANTILLA_CUOTA.
 * @param {Object} cuota - Cuota con datos de cliente/producto (ver cuotasRepo.buscarParaRecordatorio).
 * @returns {string[]} Parámetros listos para whatsappService.enviarPlantilla.
 */
function construirParametrosPlantilla(cuota) {
  const fecha = new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR', { timeZone: 'UTC' });
  const monto = Number(cuota.monto).toFixed(2);
  const productoTexto = cuota.producto_nombre ? ` por ${cuota.producto_nombre}` : '';
  const esVencida = cuota.tipo === 'vencida' || cuota.estado === 'vencida';
  const estadoTexto = esVencida
    ? `se encuentra vencida desde el ${fecha}${productoTexto}`
    : `vence el ${fecha}${productoTexto}`;

  return [cuota.cliente_nombre, String(cuota.numero), monto, estadoTexto];
}

/**
 * Arma el texto libre del recordatorio para el envío manual bajo demanda
 * (POST /api/cuotas/:id/recordatorio): ahí el pedido lo dispara un cajero/admin
 * explícitamente, no el cron, así que no aplica la restricción de plantillas.
 * @param {Object} cuota - Cuota con datos de cliente/producto.
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
 * Arma el texto de confirmación cuando se acredita el pago de una cuota, para
 * que el cliente tenga certeza de que su pago impactó. Es texto libre (no
 * plantilla): lo dispara una acción del cajero/admin dentro de la ventana de
 * 24hs de atención, igual que construirMensaje().
 * @param {Object} cuota - Cuota con datos de cliente/producto (ver cuotasRepo.buscarDetalleParaRecordatorio).
 * @param {boolean} [creditoLiquidado] - Si este pago dejó el crédito completamente saldado.
 * @returns {string} Mensaje listo para enviar por WhatsApp.
 */
function construirMensajeConfirmacionPago(cuota, creditoLiquidado = false) {
  const productoTexto = cuota.producto_nombre ? ` de tu ${cuota.producto_nombre}` : '';
  const totalCuotas = cuota.cantidad_cuotas ? `/${cuota.cantidad_cuotas}` : '';

  let mensaje = `Hola ${cuota.cliente_nombre}, ¡ya se acreditó el pago de tu cuota ${cuota.numero}${totalCuotas}${productoTexto}!`;
  mensaje += creditoLiquidado
    ? ' Con este pago completaste tu crédito. ¡Gracias por tu confianza! 🎉'
    : ' Gracias por tu pago.';

  return mensaje;
}

/**
 * Envía la confirmación de pago acreditado de una cuota puntual. No lanza
 * excepción si falla (SMTP/WhatsApp caído, cliente sin teléfono, etc.): esto
 * es un efecto secundario del pago ya confirmado y persistido, no debe
 * revertirlo ni bloquear la respuesta al cajero.
 * @param {Object} pool - Pool de conexiones.
 * @param {number} cuotaId - ID de la cuota recién pagada.
 * @param {boolean} [creditoLiquidado] - Si este pago dejó el crédito completamente saldado.
 * @returns {Promise<{enviado: boolean, error?: string}>}
 */
async function enviarConfirmacionPago(pool, cuotaId, creditoLiquidado = false) {
  try {
    const cuota = await cuotasRepo.buscarDetalleParaRecordatorio(pool, cuotaId);
    if (!cuota) {
      console.warn(`[NotificacionesService] No se encontró la cuota #${cuotaId} para enviar la confirmación de pago.`);
      return { enviado: false };
    }
    if (!cuota.cliente_telefono) {
      console.warn(`[NotificacionesService] Cuota #${cuotaId} (cliente #${cuota.cliente_id}) sin teléfono registrado, se omite la confirmación de pago.`);
      return { enviado: false };
    }

    await whatsappService.enviarMensaje({
      telefono: cuota.cliente_telefono,
      mensaje: construirMensajeConfirmacionPago(cuota, creditoLiquidado)
    });
    return { enviado: true };
  } catch (error) {
    console.error(`[NotificacionesService] Error al enviar confirmación de pago de la cuota #${cuotaId}:`, error.message);
    return { enviado: false, error: error.message };
  }
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
      await whatsappService.enviarPlantilla({
        telefono: cuota.cliente_telefono,
        nombrePlantilla: NOMBRE_PLANTILLA_CUOTA,
        idioma: IDIOMA_PLANTILLA,
        parametros: construirParametrosPlantilla(cuota)
      });
      await cuotasRepo.marcarRecordatorioEnviado(pool, cuota.id);
      enviados++;
    } catch (error) {
      fallidos++;
      console.error(`[NotificacionesService] Error al enviar recordatorio de cuota #${cuota.id}:`, error.message);
    }
  }

  return { total: cuotas.length, enviados, fallidos, omitidos };
}

module.exports = {
  enviarRecordatoriosDeCuotas,
  construirParametrosPlantilla,
  construirMensaje,
  construirMensajeConfirmacionPago,
  enviarConfirmacionPago
};
