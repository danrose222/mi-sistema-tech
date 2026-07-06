const pool = require('../config/database');

exports.crearProducto = async (producto) => {
  const { nombre, descripcion, sku, barcode, precio, stock } = producto;
  const [result] = await pool.query(
    'INSERT INTO productos (nombre, descripcion, sku, codigo_barras, precio, stock) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, descripcion, sku, barcode, precio, stock]
  );
  return result.insertId;
};

exports.obtenerProductos = async () => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, descripcion, sku, codigo_barras AS barcode, precio, stock, activo FROM productos WHERE activo = 1');
    return rows;
  } catch (err) {
    // Si la columna `activo` no existe (por migraciones antiguas), la creamos y reintentamos
    if (err && err.code === 'ER_BAD_FIELD_ERROR' && /activo/.test(err.sqlMessage || '')) {
      await pool.query("ALTER TABLE productos ADD COLUMN activo TINYINT(1) DEFAULT 1");
      const [rows] = await pool.query('SELECT id, nombre, descripcion, sku, codigo_barras AS barcode, precio, stock, activo FROM productos WHERE activo = 1');
      return rows;
    }
    throw err;
  }
};

exports.obtenerProductoPorId = async (id) => {
  const [rows] = await pool.query('SELECT id, nombre, descripcion, sku, codigo_barras AS barcode, precio, stock, activo FROM productos WHERE id = ?', [id]);
  return rows[0];
};

exports.obtenerProductoPorBarcode = async (barcode) => {
  const [rows] = await pool.query('SELECT id, nombre, stock FROM productos WHERE codigo_barras = ? LIMIT 1', [barcode]);
  return rows[0];
};

exports.actualizarProducto = async (id, producto) => {
  const { nombre, descripcion, sku, barcode, precio, stock, activo } = producto;
  await pool.query(
    'UPDATE productos SET nombre = ?, descripcion = ?, sku = ?, codigo_barras = ?, precio = ?, stock = ?, activo = ? WHERE id = ?',
    [nombre, descripcion, sku, barcode, precio, stock, activo ? 1 : 0, id]
  );
};

exports.eliminarProducto = async (id) => {
  await pool.query('DELETE FROM productos WHERE id = ?', [id]);
};
