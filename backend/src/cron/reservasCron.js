const cron = require('node-cron');
const pool = require('../config/database');

const HORAS_EXPIRACION = process.env.CRON_RESERVAS_HORAS_EXPIRACION
  ? Number(process.env.CRON_RESERVAS_HORAS_EXPIRACION)
  : 48;

/**
 * Cancela los pedidos de reserva (transferencia/efectivo en local) que
 * quedaron "pendiente" más de HORAS_EXPIRACION sin confirmarse, y devuelve
 * el stock que se había reservado al crearlos. No toca pedidos de
 * Mercado Pago (el webhook los resuelve solo) ni ventas de mostrador (nacen
 * ya "pagado", ver pedidoController.crearVentaPos).
 * @returns {Promise<{pedidosCancelados: number}>}
 */
async function liberarReservasExpiradas() {
  const connection = await pool.getConnection();
  let transactionActive = false;

  try {
    await connection.beginTransaction();
    transactionActive = true;

    const [pedidosExpirados] = await connection.query(
      `SELECT id FROM pedidos
       WHERE estado = 'pendiente'
         AND metodo_pago IN ('efectivo_local', 'transferencia')
         AND created_at <= DATE_SUB(NOW(), INTERVAL ? HOUR)
       FOR UPDATE`,
      [HORAS_EXPIRACION]
    );

    if (pedidosExpirados.length === 0) {
      await connection.commit();
      return { pedidosCancelados: 0 };
    }

    for (const { id: pedidoId } of pedidosExpirados) {
      const [items] = await connection.query(
        'SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ?',
        [pedidoId]
      );

      for (const item of items) {
        await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [item.cantidad, item.producto_id]);
      }

      await connection.query('UPDATE pedidos SET estado = "cancelado", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [pedidoId]);
    }

    await connection.commit();
    console.log(`[ReservasCron] Se liberaron ${pedidosExpirados.length} reserva(s) vencida(s) (>${HORAS_EXPIRACION}hs sin confirmar) y se repuso su stock.`);

    return { pedidosCancelados: pedidosExpirados.length };
  } catch (error) {
    if (transactionActive) {
      await connection.rollback();
    }
    console.error('[ReservasCron] Error al liberar reservas vencidas:', error);
    throw error;
  } finally {
    connection.release();
  }
}

cron.schedule('0 * * * *', () => {
  console.log('[ReservasCron] Ejecutando barrido de reservas vencidas...');
  liberarReservasExpiradas().catch(() => {
    // El error ya quedó logueado dentro de liberarReservasExpiradas; acá solo
    // se evita que un throw sin capturar tire abajo el proceso del cron.
  });
}, { timezone: 'America/Argentina/Buenos_Aires' });

module.exports = { liberarReservasExpiradas };
