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
  const [rows] = await pool.query(
    `SELECT p.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.email AS cliente_email
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
