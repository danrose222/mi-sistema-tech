const pool = require('../config/database');

exports.crearProducto = async (producto) => {
  const { nombre, descripcion, sku, barcode, precio, stock } = producto;
  const [result] = await pool.query(
    'INSERT INTO productos (nombre, descripcion, sku, barcode, precio, stock) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, descripcion, sku, barcode, precio, stock]
  );
  return result.insertId;
};

exports.obtenerProductos = async () => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, descripcion, sku, barcode, precio, stock, activo FROM productos WHERE activo = 1');
    return rows;
  } catch (err) {
    // Si la columna `activo` no existe (por migraciones antiguas), la creamos y reintentamos
    if (err && err.code === 'ER_BAD_FIELD_ERROR' && /activo/.test(err.sqlMessage || '')) {
      await pool.query("ALTER TABLE productos ADD COLUMN activo TINYINT(1) DEFAULT 1");
      const [rows] = await pool.query('SELECT id, nombre, descripcion, sku, barcode, precio, stock, activo FROM productos WHERE activo = 1');
      return rows;
    }
    throw err;
  }
};

exports.obtenerProductosPaginado = async ({ page = 1, limit = 20, search = '' }) => {
  const offset = (page - 1) * limit;
  const like = `%${search}%`;

  const where = search ? 'WHERE (nombre LIKE ? OR sku LIKE ? OR barcode LIKE ?)' : '';
  const whereParams = search ? [like, like, like] : [];

  const [rows] = await pool.query(
    `SELECT id, nombre, descripcion, sku, barcode, precio, stock, activo FROM productos ${where} ORDER BY nombre ASC LIMIT ? OFFSET ?`,
    [...whereParams, limit, offset]
  );
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM productos ${where}`,
    whereParams
  );

  return { data: rows, total: countRows[0].total };
};

exports.obtenerProductosPublicoPaginado = async ({ page = 1, limit = 20, search = '' }) => {
  const offset = (page - 1) * limit;
  const like = `%${search}%`;

  const where = search ? 'WHERE activo = 1 AND nombre LIKE ?' : 'WHERE activo = 1';
  const whereParams = search ? [like] : [];

  const [rows] = await pool.query(
    `SELECT id, nombre, descripcion, precio, stock FROM productos ${where} ORDER BY nombre ASC LIMIT ? OFFSET ?`,
    [...whereParams, limit, offset]
  );
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM productos ${where}`,
    whereParams
  );

  return { data: rows, total: countRows[0].total };
};

exports.obtenerProductoPublicoPorId = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion, precio, stock FROM productos WHERE id = ? AND activo = 1',
    [id]
  );
  return rows[0];
};

exports.obtenerProductoPorId = async (id) => {
  const [rows] = await pool.query('SELECT id, nombre, descripcion, sku, barcode, precio, stock, activo FROM productos WHERE id = ?', [id]);
  return rows[0];
};

exports.obtenerProductoPorBarcode = async (barcode) => {
  const [rows] = await pool.query('SELECT id, nombre, stock FROM productos WHERE barcode = ? LIMIT 1', [barcode]);
  return rows[0];
};

exports.actualizarProducto = async (id, producto) => {
  const { nombre, descripcion, sku, barcode, precio, stock, activo } = producto;
  await pool.query(
    'UPDATE productos SET nombre = ?, descripcion = ?, sku = ?, barcode = ?, precio = ?, stock = ?, activo = ? WHERE id = ?',
    [nombre, descripcion, sku, barcode, precio, stock, activo ? 1 : 0, id]
  );
};

exports.eliminarProducto = async (id) => {
  await pool.query('DELETE FROM productos WHERE id = ?', [id]);
};
