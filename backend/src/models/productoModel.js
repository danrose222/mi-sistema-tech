const pool = require('../config/database');

async function adjuntarImagenes(productos) {
  if (productos.length === 0) return productos;

  const ids = productos.map((p) => p.id);
  const [filas] = await pool.query(
    `SELECT producto_id, imagen_url FROM producto_imagenes WHERE producto_id IN (?) ORDER BY producto_id, id ASC`,
    [ids]
  );

  const imagenesPorProducto = new Map();
  for (const fila of filas) {
    if (!imagenesPorProducto.has(fila.producto_id)) {
      imagenesPorProducto.set(fila.producto_id, []);
    }
    imagenesPorProducto.get(fila.producto_id).push(fila.imagen_url);
  }

  return productos.map((p) => ({ ...p, imagenes: imagenesPorProducto.get(p.id) || [] }));
}

exports.crearProducto = async (producto) => {
  const { nombre, descripcion, sku, barcode, precio, stock } = producto;
  const [result] = await pool.query(
    'INSERT INTO productos (nombre, descripcion, sku, barcode, precio, stock) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, descripcion, sku, barcode, precio, stock]
  );
  return result.insertId;
};

exports.agregarImagenes = async (productoId, urls) => {
  if (!urls || urls.length === 0) return;
  const valores = urls.map((url) => [productoId, url]);
  await pool.query('INSERT INTO producto_imagenes (producto_id, imagen_url) VALUES ?', [valores]);
};

exports.reemplazarImagenes = async (productoId, urls) => {
  await pool.query('DELETE FROM producto_imagenes WHERE producto_id = ?', [productoId]);
  await exports.agregarImagenes(productoId, urls);
};

exports.obtenerProductos = async () => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, descripcion, sku, barcode, precio, stock, activo FROM productos WHERE activo = 1');
    return adjuntarImagenes(rows);
  } catch (err) {
    // Si la columna `activo` no existe (por migraciones antiguas), la creamos y reintentamos
    if (err && err.code === 'ER_BAD_FIELD_ERROR' && /activo/.test(err.sqlMessage || '')) {
      await pool.query("ALTER TABLE productos ADD COLUMN activo TINYINT(1) DEFAULT 1");
      const [rows] = await pool.query('SELECT id, nombre, descripcion, sku, barcode, precio, stock, activo FROM productos WHERE activo = 1');
      return adjuntarImagenes(rows);
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

  return { data: await adjuntarImagenes(rows), total: countRows[0].total };
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

  return { data: await adjuntarImagenes(rows), total: countRows[0].total };
};

exports.obtenerProductoPublicoPorId = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, descripcion, precio, stock FROM productos WHERE id = ? AND activo = 1',
    [id]
  );
  if (!rows[0]) return undefined;
  const [conImagenes] = await adjuntarImagenes(rows);
  return conImagenes;
};

exports.obtenerProductoPorId = async (id) => {
  const [rows] = await pool.query('SELECT id, nombre, descripcion, sku, barcode, precio, stock, activo FROM productos WHERE id = ?', [id]);
  if (!rows[0]) return undefined;
  const [conImagenes] = await adjuntarImagenes(rows);
  return conImagenes;
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
