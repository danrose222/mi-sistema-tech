/**
 * @fileoverview Servicio encargado de configurar y arrancar los procesos en segundo plano (Cron Jobs).
 */

const cron = require('node-cron');
const creditosService = require('./creditos.service');
const notificacionesService = require('./notificaciones.service');

/**
 * Inicializa todos los cron jobs del sistema.
 * @param {Object} pool - Conexión o pool de la base de datos (se pasa al servicio).
 */
function iniciarCrons(pool) {
  console.log('[CronService] Configurando cron jobs...');

  // =========================================================================
  // 1. Marcar cuotas vencidas y actualizar créditos morosos
  // Se ejecuta todos los días a las 00:05 hs.
  // Formato: "minuto hora diaMes mes diaSemana"
  // =========================================================================
  cron.schedule('5 0 * * *', async () => {
    console.log('\n------------------------------------------------------------');
    console.log(`[CronService - ${new Date().toISOString()}] Ejecutando tarea: marcarCuotasVencidas`);
    
    try {
      const resultado = await creditosService.marcarCuotasVencidas(pool);
      console.log(`[CronService] Tarea completada exitosamente.`);
      console.log(`[CronService] Resumen -> Cuotas actualizadas: ${resultado.cuotasVencidasActualizadas}, Créditos afectados: ${resultado.creditosMorosos}`);
    } catch (error) {
      // Manejo de error seguro. Si falla la DB o la función, atrapamos el error
      // para que node-cron siga funcionando los días subsiguientes y el servidor no se caiga.
      console.error('[CronService] Error catastrófico al ejecutar marcarCuotasVencidas:', error.message);
    }
    console.log('------------------------------------------------------------\n');
  }, { timezone: 'America/Argentina/Buenos_Aires' });

  // =========================================================================
  // 2. Enviar recordatorios de WhatsApp de cuotas por vencer y vencidas
  // Se ejecuta todos los días a las 09:00 hs (después de que el cron anterior
  // ya marcó como "vencida" lo que corresponda).
  // =========================================================================
  cron.schedule('0 9 * * *', async () => {
    console.log('\n------------------------------------------------------------');
    console.log(`[CronService - ${new Date().toISOString()}] Ejecutando tarea: enviarRecordatoriosDeCuotas`);

    try {
      const resultado = await notificacionesService.enviarRecordatoriosDeCuotas(pool);
      console.log(`[CronService] Tarea completada exitosamente.`);
      console.log(`[CronService] Resumen -> Candidatas: ${resultado.total}, Enviados: ${resultado.enviados}, Fallidos: ${resultado.fallidos}, Omitidos (sin teléfono): ${resultado.omitidos}`);
    } catch (error) {
      // Igual que arriba: atrapamos el error para no tirar abajo el proceso ni
      // los demás crons si falla la DB o la API de WhatsApp.
      console.error('[CronService] Error catastrófico al ejecutar enviarRecordatoriosDeCuotas:', error.message);
    }
    console.log('------------------------------------------------------------\n');
  }, { timezone: 'America/Argentina/Buenos_Aires' });

  console.log('[CronService] Cron jobs inicializados correctamente.');
}

module.exports = {
  iniciarCrons
};
