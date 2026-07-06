const pool = require('../config/database');

exports.obtenerPedidosVencidos = async () => {
  const [rows] = await pool.query(
    `SELECT p.id, p.cliente_id, p.total, p.estado, p.pago_link, p.mercado_pago_preference_id, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
     FROM pedidos p
     JOIN clientes c ON c.id = p.cliente_id
     WHERE p.estado = 'pendiente' AND p.created_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );
  return rows;
};

exports.marcarAlertaEnviada = async (pedido_id) => {
  const [result] = await pool.query(
    'INSERT INTO alertas_enviadas (pedido_id, enviado_en) VALUES (?, NOW())',
    [pedido_id]
  );
  return result.insertId;
};

exports.verificarAlertaEnviada = async (pedido_id) => {
  const [rows] = await pool.query(
    'SELECT id FROM alertas_enviadas WHERE pedido_id = ? LIMIT 1',
    [pedido_id]
  );
  return rows.length > 0;
};
