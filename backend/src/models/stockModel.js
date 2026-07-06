const pool = require('../config/database');

exports.obtenerMovimientos = async () => {
  const [rows] = await pool.query(
    `SELECT sm.id, sm.producto_id, p.nombre AS producto_nombre, sm.cantidad, sm.tipo, sm.nota, sm.created_at
     FROM stock_movimientos sm
     JOIN productos p ON p.id = sm.producto_id
     ORDER BY sm.created_at DESC`
  );
  return rows;
};

exports.crearMovimiento = async ({ producto_id, cantidad, tipo, nota }) => {
  const [result] = await pool.query(
    'INSERT INTO stock_movimientos (producto_id, cantidad, tipo, nota) VALUES (?, ?, ?, ?)',
    [producto_id, cantidad, tipo, nota || null]
  );
  return result.insertId;
};

exports.obtenerStockProducto = async (producto_id) => {
  const [rows] = await pool.query('SELECT id, nombre, stock FROM productos WHERE id = ?', [producto_id]);
  return rows[0];
};

exports.ajustarStockProducto = async (producto_id, cantidad, tipo) => {
  const product = await exports.obtenerStockProducto(producto_id);
  if (!product) {
    throw new Error('Producto no encontrado');
  }

  const nuevoStock = tipo === 'egreso' ? product.stock - Math.abs(cantidad) : product.stock + Math.abs(cantidad);
  await pool.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevoStock, producto_id]);
  return { ...product, stock: nuevoStock };
};