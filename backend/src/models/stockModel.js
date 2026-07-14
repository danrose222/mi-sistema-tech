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

/**
 * Ajusta el stock y registra el movimiento en una única transacción, con SELECT ... FOR UPDATE
 * para evitar lost updates cuando llegan ajustes concurrentes sobre el mismo producto.
 */
exports.ajustarStockConMovimiento = async ({ producto_id, cantidad, tipo, nota }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT id, nombre, stock FROM productos WHERE id = ? FOR UPDATE', [producto_id]);
    if (rows.length === 0) {
      throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 });
    }
    const product = rows[0];

    const delta = tipo === 'egreso' ? -Math.abs(cantidad) : Math.abs(cantidad);
    const nuevoStock = product.stock + delta;
    if (nuevoStock < 0) {
      throw Object.assign(new Error('Stock insuficiente para el egreso solicitado'), { statusCode: 400 });
    }

    await connection.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevoStock, producto_id]);
    const [movimientoResult] = await connection.query(
      'INSERT INTO stock_movimientos (producto_id, cantidad, tipo, nota) VALUES (?, ?, ?, ?)',
      [producto_id, cantidad, tipo, nota || null]
    );

    await connection.commit();
    return { movimientoId: movimientoResult.insertId, producto: { ...product, stock: nuevoStock } };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};