/**
 * @fileoverview Repositorio para la gestión de cuentas corrientes.
 */

/**
 * Registra un nuevo movimiento en la cuenta corriente de un cliente y 
 * calcula automáticamente el saldo resultante.
 * Se debe usar dentro de una transacción para evitar problemas de concurrencia (condiciones de carrera).
 * 
 * @param {Object} connection - Instancia de conexión (obligatoria para la transacción).
 * @param {Object} movimiento - Datos del movimiento.
 * @returns {Promise<Object>} Movimiento registrado incluyendo su id y el nuevo saldo.
 */
async function registrarMovimiento(connection, movimiento) {
  try {
    // 1. Obtener el saldo actual del cliente.
    // Usamos 'FOR UPDATE' para bloquear las filas de este cliente hasta que la transacción termine.
    const querySaldo = `
      SELECT saldo_resultante 
      FROM cuentas_corrientes 
      WHERE cliente_id = ? 
      ORDER BY id DESC LIMIT 1
      FOR UPDATE
    `;
    const [saldoRows] = await connection.execute(querySaldo, [movimiento.cliente_id]);
    const saldoActual = saldoRows.length > 0 ? parseFloat(saldoRows[0].saldo_resultante) : 0;
    
    // 2. Calcular nuevo saldo (el monto debe venir en negativo o positivo según el tipo).
    // Ejemplo: 'venta' o 'interes' suman (monto > 0). 'pago' resta (monto < 0).
    const nuevoSaldo = saldoActual + parseFloat(movimiento.monto);

    // 3. Insertar el nuevo registro.
    const queryInsert = `
      INSERT INTO cuentas_corrientes (
        cliente_id, tipo, monto, saldo_resultante, 
        referencia_tipo, referencia_id, descripcion, usuario_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      movimiento.cliente_id,
      movimiento.tipo,
      movimiento.monto,
      nuevoSaldo,
      movimiento.referencia_tipo || null,
      movimiento.referencia_id || null,
      movimiento.descripcion || null,
      movimiento.usuario_id || null
    ];
    
    const [result] = await connection.execute(queryInsert, params);
    return { 
      id: result.insertId, 
      ...movimiento, 
      saldo_resultante: nuevoSaldo 
    };
  } catch (error) {
    throw new Error(`Error al registrar movimiento en cuenta corriente: ${error.message}`);
  }
}

/**
 * Obtiene el historial de movimientos de un cliente, ordenado de más reciente a más antiguo, de forma paginada.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {number} clienteId - ID del cliente.
 * @param {Object} paginacion - Configuración de paginación.
 * @param {number} [paginacion.pagina=1] - Número de página.
 * @param {number} [paginacion.porPagina=20] - Registros por página.
 * @returns {Promise<{data: Array, total: number}>} Historial de movimientos y total.
 */
async function obtenerHistorial(db, clienteId, { pagina = 1, porPagina = 20 }) {
  try {
    const offset = (pagina - 1) * porPagina;
    
    const query = `
      SELECT SQL_CALC_FOUND_ROWS * 
      FROM cuentas_corrientes 
      WHERE cliente_id = ? 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `;
    
    const [data] = await db.execute(query, [
      clienteId, 
      porPagina.toString(), 
      offset.toString()
    ]);
    
    const [totalRows] = await db.execute('SELECT FOUND_ROWS() as total');
    
    return { data, total: totalRows[0].total };
  } catch (error) {
    throw new Error(`Error al obtener historial de cuenta corriente: ${error.message}`);
  }
}

/**
 * Obtiene el saldo actual (último registro) de un cliente.
 * @param {Object} db - Instancia de conexión o pool.
 * @param {number} clienteId - ID del cliente.
 * @returns {Promise<number>} Saldo actual del cliente.
 */
async function obtenerSaldoActual(db, clienteId) {
  try {
    const query = `
      SELECT saldo_resultante 
      FROM cuentas_corrientes 
      WHERE cliente_id = ? 
      ORDER BY id DESC LIMIT 1
    `;
    const [rows] = await db.execute(query, [clienteId]);
    return rows.length > 0 ? parseFloat(rows[0].saldo_resultante) : 0;
  } catch (error) {
    throw new Error(`Error al obtener saldo actual: ${error.message}`);
  }
}

module.exports = {
  registrarMovimiento,
  obtenerHistorial,
  obtenerSaldoActual
};
