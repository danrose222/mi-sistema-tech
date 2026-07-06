/**
 * @fileoverview Servicio encargado de configurar y arrancar los procesos en segundo plano (Cron Jobs).
 */

const cron = require('node-cron');
const creditosService = require('./creditos.service');

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
  });

  // Aquí podrías agregar más crons en el futuro (e.g., recordatorios de pago)

  console.log('[CronService] Cron jobs inicializados correctamente.');
}

module.exports = {
  iniciarCrons
};
