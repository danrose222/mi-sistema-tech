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
    // Alias `numero` -> `numero_cuota` y calculamos `saldo_pendiente` porque el
    // frontend (credito-detalle.component.ts) espera esos nombres de campo.
    const query = `
      SELECT
        id, credito_id, numero AS numero_cuota, monto, fecha_vencimiento, fecha_pago,
        estado, monto_pagado, pago_id,
        (monto - monto_pagado) AS saldo_pendiente
      FROM cuotas
      WHERE credito_id = ?
      ORDER BY numero ASC
    `;
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

/**
 * Busca cuotas candidatas a recibir un recordatorio de WhatsApp: las que vencen
 * hoy o mañana, y las vencidas que no recibieron un recordatorio en los últimos
 * 3 días (o nunca). Incluye teléfono/nombre del cliente y nombre del producto
 * vía JOIN para poder armar el mensaje sin consultas adicionales.
 * @param {Object} db - Instancia de conexión o pool.
 * @returns {Promise<Array>} Lista de cuotas con datos de cliente y producto.
 */
async function buscarParaRecordatorio(db) {
  try {
    const query = `
      SELECT
        cu.id, cu.numero, cu.monto, cu.fecha_vencimiento, cu.estado, cu.ultimo_recordatorio,
        cr.id AS credito_id,
        c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
        p.nombre AS producto_nombre,
        IF(cu.estado = 'vencida', 'vencida', 'por_vencer') AS tipo
      FROM cuotas cu
      JOIN creditos cr ON cu.credito_id = cr.id
      JOIN clientes c ON cr.cliente_id = c.id
      LEFT JOIN productos p ON cr.producto_id = p.id
      WHERE
        (
          cu.estado IN ('pendiente', 'parcial')
          AND cu.fecha_vencimiento IN (CURDATE(), CURDATE() + INTERVAL 1 DAY)
          AND (cu.ultimo_recordatorio IS NULL OR cu.ultimo_recordatorio < CURDATE())
        )
        OR
        (
          cu.estado = 'vencida'
          AND (cu.ultimo_recordatorio IS NULL OR cu.ultimo_recordatorio <= NOW() - INTERVAL 3 DAY)
        )
      ORDER BY cu.fecha_vencimiento ASC
    `;
    const [rows] = await db.execute(query);
    return rows;
  } catch (error) {
    throw new Error(`Error al buscar cuotas para recordatorio: ${error.message}`);
  }
}

/**
 * Busca una cuota puntual con los datos de cliente/producto/crédito necesarios
 * para armar un mensaje de WhatsApp fuera del cron: tanto el recordatorio manual
 * (POST /api/cuotas/:id/recordatorio) como la confirmación de pago acreditado
 * (ver notificaciones.service.js#enviarConfirmacionPago) reutilizan esta misma
 * consulta en vez de duplicar el JOIN cliente/producto.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {number} cuotaId - ID de la cuota.
 * @returns {Promise<Object|null>} Cuota con datos de cliente, producto y crédito, o null.
 */
async function buscarDetalleParaRecordatorio(db, cuotaId) {
  try {
    const query = `
      SELECT
        cu.id, cu.numero, cu.monto, cu.fecha_vencimiento, cu.estado, cu.ultimo_recordatorio,
        cr.id AS credito_id, cr.cantidad_cuotas,
        c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
        p.nombre AS producto_nombre
      FROM cuotas cu
      JOIN creditos cr ON cu.credito_id = cr.id
      JOIN clientes c ON cr.cliente_id = c.id
      LEFT JOIN productos p ON cr.producto_id = p.id
      WHERE cu.id = ?
    `;
    const [rows] = await db.execute(query, [cuotaId]);
    return rows[0] || null;
  } catch (error) {
    throw new Error(`Error al buscar detalle de cuota para recordatorio: ${error.message}`);
  }
}

/**
 * Marca que se envió (o intentó enviar exitosamente) un recordatorio para
 * una cuota, sellando la fecha/hora actual.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {number} cuotaId - ID de la cuota.
 * @returns {Promise<boolean>} True si se actualizó.
 */
async function marcarRecordatorioEnviado(db, cuotaId) {
  try {
    const [result] = await db.execute('UPDATE cuotas SET ultimo_recordatorio = NOW() WHERE id = ?', [cuotaId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Error al marcar recordatorio como enviado: ${error.message}`);
  }
}

module.exports = {
  crearMuchas,
  buscarPorCredito,
  buscarPorId,
  marcarComoPagada,
  buscarVencidas,
  actualizarEstado,
  buscarParaRecordatorio,
  buscarDetalleParaRecordatorio,
  marcarRecordatorioEnviado
};
