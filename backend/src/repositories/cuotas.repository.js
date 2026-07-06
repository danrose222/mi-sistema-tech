/**
 * @fileoverview Repositorio para la gestión de cuotas de créditos.
 */

/**
 * Crea múltiples cuotas de una vez (ideal para usar dentro de una transacción).
 * @param {Object} connection - Instancia de conexión para transacciones o pool.
 * @param {Array<Object>} cuotasArray - Arreglo de objetos con datos de cada cuota.
 * @returns {Promise<number>} Cantidad de cuotas insertadas.
 */
async function crearMuchas(connection, cuotasArray) {
  if (!cuotasArray || cuotasArray.length === 0) return 0;

  try {
    // Generar dinámicamente los placeholders según la cantidad de registros
    const placeholders = cuotasArray.map(() => '(?, ?, ?, ?)').join(', ');
    const query = `
      INSERT INTO cuotas (credito_id, numero, monto, fecha_vencimiento)
      VALUES ${placeholders}
    `;
    
    // Aplanar el arreglo de valores en el mismo orden que los placeholders
    const params = cuotasArray.flatMap(cuota => [
      cuota.credito_id,
      cuota.numero,
      cuota.monto,
      cuota.fecha_vencimiento
    ]);

    const [result] = await connection.execute(query, params);
    return result.affectedRows;
  } catch (error) {
    throw new Error(`Error al crear cuotas: ${error.message}`);
  }
}

/**
 * Busca todas las cuotas asociadas a un crédito, ordenadas por número.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {number} creditoId - ID del crédito.
 * @returns {Promise<Array>} Lista de cuotas.
 */
async function buscarPorCredito(db, creditoId) {
  try {
    const query = `SELECT * FROM cuotas WHERE credito_id = ? ORDER BY numero ASC`;
    const [rows] = await db.execute(query, [creditoId]);
    return rows;
  } catch (error) {
    throw new Error(`Error al buscar cuotas por crédito: ${error.message}`);
  }
}

/**
 * Busca una cuota específica por su ID.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {number} id - ID de la cuota.
 * @returns {Promise<Object|null>} Cuota encontrada o null.
 */
async function buscarPorId(db, id) {
  try {
    const query = `SELECT * FROM cuotas WHERE id = ?`;
    const [rows] = await db.execute(query, [id]);
    return rows[0] || null;
  } catch (error) {
    throw new Error(`Error al buscar cuota por ID: ${error.message}`);
  }
}

/**
 * Marca una cuota como pagada y actualiza sus datos asociados.
 * Calcula automáticamente si es parcial o total en base al monto.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {number} id - ID de la cuota a pagar.
 * @param {Object} datos - Datos del pago.
 * @param {string} datos.fechaPago - Fecha de realización del pago (YYYY-MM-DD).
 * @param {number} datos.montoPagado - Monto abonado en el pago.
 * @param {number} [datos.pagoId] - ID foráneo del pago general.
 * @returns {Promise<boolean>} True si la cuota se actualizó.
 */
async function marcarComoPagada(db, id, { fechaPago, montoPagado, pagoId }) {
  try {
    const query = `
      UPDATE cuotas 
      SET fecha_pago = ?, 
          monto_pagado = ?, 
          pago_id = ?,
          estado = IF(monto <= ?, 'pagada', 'parcial')
      WHERE id = ?
    `;
    const params = [fechaPago, montoPagado, pagoId || null, montoPagado, id];
    const [result] = await db.execute(query, params);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Error al marcar cuota como pagada: ${error.message}`);
  }
}

/**
 * Busca cuotas vencidas (o parcialmente vencidas) hasta una fecha dada.
 * Útil para tareas en segundo plano que envían notificaciones/alertas.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {string} hastaFecha - Fecha máxima (YYYY-MM-DD).
 * @returns {Promise<Array>} Lista de cuotas vencidas y datos clave del crédito.
 */
async function buscarVencidas(db, hastaFecha) {
  try {
    const query = `
      SELECT cu.*, cr.cliente_id 
      FROM cuotas cu
      JOIN creditos cr ON cu.credito_id = cr.id
      WHERE cu.fecha_vencimiento <= ? 
        AND cu.estado IN ('pendiente', 'parcial')
      ORDER BY cu.fecha_vencimiento ASC
    `;
    const [rows] = await db.execute(query, [hastaFecha]);
    return rows;
  } catch (error) {
    throw new Error(`Error al buscar cuotas vencidas: ${error.message}`);
  }
}

/**
 * Actualiza el estado manual de una cuota (ej. pasar de 'pendiente' a 'vencida').
 * @param {Object} db - Instancia de conexión o pool.
 * @param {number} id - ID de la cuota.
 * @param {string} estado - Nuevo estado.
 * @returns {Promise<boolean>} True si fue exitoso.
 */
async function actualizarEstado(db, id, estado) {
  try {
    const query = `UPDATE cuotas SET estado = ? WHERE id = ?`;
    const [result] = await db.execute(query, [estado, id]);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Error al actualizar estado de la cuota: ${error.message}`);
  }
}

module.exports = {
  crearMuchas,
  buscarPorCredito,
  buscarPorId,
  marcarComoPagada,
  buscarVencidas,
  actualizarEstado
};
