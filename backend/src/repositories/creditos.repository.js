/**
 * @fileoverview Repositorio para la gestión de créditos.
 */

/**
 * Crea un nuevo crédito.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {Object} creditoData - Datos del crédito.
 * @returns {Promise<Object>} Crédito creado con su id.
 */
async function crear(db, creditoData) {
  try {
    const query = `
      INSERT INTO creditos (cliente_id, pedido_id, monto_total, cantidad_cuotas, frecuencia, monto_cuota, fecha_primera_cuota, estado, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      creditoData.cliente_id,
      creditoData.pedido_id || null,
      creditoData.monto_total,
      creditoData.cantidad_cuotas,
      creditoData.frecuencia,
      creditoData.monto_cuota,
      creditoData.fecha_primera_cuota,
      creditoData.estado || 'activo',
      creditoData.notas || null
    ];
    
    const [result] = await db.execute(query, params);
    return { id: result.insertId, ...creditoData };
  } catch (error) {
    throw new Error(`Error al crear crédito: ${error.message}`);
  }
}

/**
 * Busca un crédito por ID e incluye datos del cliente (JOIN).
 * @param {Object} db - Instancia de conexión o pool.
 * @param {number} id - ID del crédito.
 * @returns {Promise<Object|null>} Crédito encontrado o null.
 */
async function buscarPorId(db, id) {
  try {
    const query = `
      SELECT cr.*, c.nombre AS cliente_nombre, c.email AS cliente_email
      FROM creditos cr
      JOIN clientes c ON cr.cliente_id = c.id
      WHERE cr.id = ?
    `;
    const [rows] = await db.execute(query, [id]);
    return rows[0] || null;
  } catch (error) {
    throw new Error(`Error al buscar crédito por ID: ${error.message}`);
  }
}

/**
 * Lista créditos de forma paginada y con filtros opcionales.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {Object} filtros - Filtros para la búsqueda.
 * @param {string} [filtros.estado] - Estado del crédito.
 * @param {number} [filtros.clienteId] - ID del cliente.
 * @param {number} [filtros.pagina=1] - Número de página.
 * @param {number} [filtros.porPagina=10] - Resultados por página.
 * @returns {Promise<{data: Array, total: number}>} Lista de créditos y cantidad total (paginación).
 */
async function listar(db, { estado, clienteId, pagina = 1, porPagina = 10 }) {
  try {
    let query = `
      SELECT SQL_CALC_FOUND_ROWS cr.*, c.nombre AS cliente_nombre 
      FROM creditos cr
      JOIN clientes c ON cr.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      query += ` AND cr.estado = ?`;
      params.push(estado);
    }

    if (clienteId) {
      query += ` AND cr.cliente_id = ?`;
      params.push(clienteId);
    }

    const offset = (pagina - 1) * porPagina;
    query += ` ORDER BY cr.created_at DESC LIMIT ? OFFSET ?`;
    
    // Los limites deben pasarse como strings al prepared statement de mysql2 
    // en ciertas configuraciones o cast explicitos para no generar errores de sintaxis
    params.push(porPagina.toString(), offset.toString());

    const [data] = await db.execute(query, params);
    const [totalRows] = await db.execute('SELECT FOUND_ROWS() as total');
    
    return { data, total: totalRows[0].total };
  } catch (error) {
    throw new Error(`Error al listar créditos: ${error.message}`);
  }
}

/**
 * Actualiza el estado de un crédito.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {number} id - ID del crédito.
 * @param {string} estado - Nuevo estado.
 * @returns {Promise<boolean>} True si se actualizó al menos una fila.
 */
async function actualizarEstado(db, id, estado) {
  try {
    const query = `UPDATE creditos SET estado = ? WHERE id = ?`;
    const [result] = await db.execute(query, [estado, id]);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Error al actualizar estado del crédito: ${error.message}`);
  }
}

/**
 * Busca todos los créditos correspondientes a un cliente.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {number} clienteId - ID del cliente.
 * @returns {Promise<Array>} Lista de créditos del cliente.
 */
async function buscarPorCliente(db, clienteId) {
  try {
    const query = `SELECT * FROM creditos WHERE cliente_id = ? ORDER BY created_at DESC`;
    const [rows] = await db.execute(query, [clienteId]);
    return rows;
  } catch (error) {
    throw new Error(`Error al buscar créditos del cliente: ${error.message}`);
  }
}

module.exports = {
  crear,
  buscarPorId,
  listar,
  actualizarEstado,
  buscarPorCliente
};
