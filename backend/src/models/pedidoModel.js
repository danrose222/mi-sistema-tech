const pool = require('../config/database');

exports.crearPedido = async (cliente_id, total) => {
  const [result] = await pool.query(
    'INSERT INTO pedidos (cliente_id, total) VALUES (?, ?)',
    [cliente_id || null, total]
  );
  return result.insertId;
};

exports.agregarItems = async (pedido_id, items) => {
  if (!items || items.length === 0) return;
  const values = items.map((item) => [pedido_id, item.producto_id, item.cantidad, item.precio_unitario]);
  await pool.query(
    'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES ?',
    [values]
  );
};

exports.obtenerPedidoPorId = async (id) => {
  const [rows] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [id]);
  return rows[0];
};

exports.obtenerPedidoConClientePorId = async (id) => {
  // OJO: `c.email AS cliente_registrado_email` (no `cliente_email`) a propósito:
  // `p.*` ya trae `pedidos.cliente_email` (el que tipeó el comprador en el
  // checkout, usado para el comprobante); si este JOIN reusara ese mismo
  // alias, mysql2 devuelve la última columna con ese nombre y pisa el valor
  // real con el email de clientes (casi siempre NULL, cliente_id rara vez se
  // linkea desde el checkout).
  const [rows] = await pool.query(
    `SELECT p.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.email AS cliente_registrado_email
     FROM pedidos p
     LEFT JOIN clientes c ON c.id = p.cliente_id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0];
};

exports.obtenerItemsPorPedido = async (pedido_id) => {
  const [rows] = await pool.query(
    `SELECT pi.id, pi.producto_id, pi.cantidad, pi.precio_unitario, p.nombre AS producto_nombre
     FROM pedido_items pi
     JOIN productos p ON p.id = pi.producto_id
     WHERE pi.pedido_id = ?`,
    [pedido_id]
  );
  return rows;
};

exports.listarPedidos = async () => {
  const [rows] = await pool.query(
    `SELECT p.id, p.cliente_id, c.nombre AS cliente_nombre, p.total, p.estado, p.pago_link, p.mercado_pago_preference_id, p.created_at
     FROM pedidos p
     LEFT JOIN clientes c ON c.id = p.cliente_id
     ORDER BY p.created_at DESC`
  );
  return rows;
};

exports.listarPedidosPaginado = async ({ page = 1, limit = 20, estado = '' }) => {
  const offset = (page - 1) * limit;
  const where = estado ? 'WHERE p.estado = ?' : '';
  const whereParams = estado ? [estado] : [];

  const [rows] = await pool.query(
    `SELECT p.id, p.cliente_id, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, p.total, p.estado, p.pago_link, p.mercado_pago_preference_id, p.created_at
     FROM pedidos p
     LEFT JOIN clientes c ON c.id = p.cliente_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...whereParams, limit, offset]
  );
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM pedidos p ${where}`,
    whereParams
  );

  return { data: rows, total: countRows[0].total };
};

exports.actualizarPedidoEstado = async (id, estado) => {
  await pool.query('UPDATE pedidos SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [estado, id]);
};

exports.guardarLinkPago = async (id, pago_link, preference_id) => {
  await pool.query(
    'UPDATE pedidos SET pago_link = ?, mercado_pago_preference_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [pago_link, preference_id, id]
  );
};

exports.crearPago = async (pago) => {
  const { pedido_id, proveedor, proveedor_payment_id, monto, estado, raw_payload } = pago;
  const [result] = await pool.query(
    'INSERT INTO pagos (pedido_id, proveedor, proveedor_payment_id, monto, estado, raw_payload) VALUES (?, ?, ?, ?, ?, ?)',
    [pedido_id, proveedor, proveedor_payment_id, monto, estado, JSON.stringify(raw_payload)]
  );
  return result.insertId;
};

exports.actualizarPagoPorProveedorId = async (proveedor_payment_id, estado, raw_payload) => {
  await pool.query(
    'UPDATE pagos SET estado = ?, raw_payload = ? WHERE proveedor_payment_id = ?',
    [estado, JSON.stringify(raw_payload), proveedor_payment_id]
  );
};

exports.obtenerPagoPorProveedorId = async (proveedor_payment_id) => {
  const [rows] = await pool.query('SELECT * FROM pagos WHERE proveedor_payment_id = ?', [proveedor_payment_id]);
  return rows[0];
};
