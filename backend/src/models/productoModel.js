const pool = require('../config/database');

// Columnas comunes de producto + nombre de su categoría (LEFT JOIN porque un
// producto puede no tener categoría).
const COLUMNAS_ADMIN = `p.id, p.nombre, p.descripcion, p.sku, p.barcode, p.precio, p.stock, p.activo,
  p.requiere_imei, p.categoria_id, c.nombre AS categoria_nombre, p.destacado`;
const COLUMNAS_PUBLICO = `p.id, p.nombre, p.descripcion, p.precio, p.stock,
  p.categoria_id, c.nombre AS categoria_nombre, c.slug AS categoria_slug, p.destacado`;
const FROM_CON_CATEGORIA = 'FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id';

// Orden del catálogo público: primero los destacados, después por el orden
// de su categoría (Celulares = 1) y los que no tienen categoría al final.
const ORDEN_PUBLICO = 'p.destacado DESC, COALESCE(c.orden, 9999) ASC, p.nombre ASC';

function aCategoriaId(valor) {
  if (valor === undefined || valor === null || valor === '' || valor === 'null') return null;
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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
  const { nombre, descripcion, sku, barcode, precio, stock, requiere_imei, categoria_id, destacado } = producto;
  const [result] = await pool.query(
    `INSERT INTO productos (nombre, descripcion, sku, barcode, precio, stock, requiere_imei, categoria_id, destacado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, descripcion, sku, barcode, precio, stock, requiere_imei ? 1 : 0, aCategoriaId(categoria_id), destacado ? 1 : 0]
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
    const [rows] = await pool.query('SELECT id, nombre, descripcion, sku, barcode, precio, stock, activo, requiere_imei FROM productos WHERE activo = 1');
    return adjuntarImagenes(rows);
  } catch (err) {
    // Si la columna `activo` no existe (por migraciones antiguas), la creamos y reintentamos
    if (err && err.code === 'ER_BAD_FIELD_ERROR' && /activo/.test(err.sqlMessage || '')) {
      await pool.query("ALTER TABLE productos ADD COLUMN activo TINYINT(1) DEFAULT 1");
      const [rows] = await pool.query('SELECT id, nombre, descripcion, sku, barcode, precio, stock, activo, requiere_imei FROM productos WHERE activo = 1');
      return adjuntarImagenes(rows);
    }
    throw err;
  }
};

exports.obtenerProductosPaginado = async ({ page = 1, limit = 20, search = '' }) => {
  const offset = (page - 1) * limit;
  const like = `%${search}%`;

  const where = search ? 'WHERE (p.nombre LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)' : '';
  const whereParams = search ? [like, like, like] : [];

  const [rows] = await pool.query(
    `SELECT ${COLUMNAS_ADMIN} ${FROM_CON_CATEGORIA} ${where} ORDER BY p.nombre ASC LIMIT ? OFFSET ?`,
    [...whereParams, limit, offset]
  );
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM productos p ${where}`,
    whereParams
  );

  return { data: await adjuntarImagenes(rows), total: countRows[0].total };
};

// `categoria` es el slug (o el nombre) que manda la tienda en ?categoria=.
exports.obtenerProductosPublicoPaginado = async ({ page = 1, limit = 20, search = '', categoria = '' }) => {
  const offset = (page - 1) * limit;
  const condiciones = ['p.activo = 1'];
  const params = [];

  if (search) {
    condiciones.push('p.nombre LIKE ?');
    params.push(`%${search}%`);
  }
  if (categoria) {
    condiciones.push('(c.slug = ? OR LOWER(c.nombre) = LOWER(?))');
    params.push(categoria, categoria);
  }
  const where = `WHERE ${condiciones.join(' AND ')}`;

  const [rows] = await pool.query(
    `SELECT ${COLUMNAS_PUBLICO} ${FROM_CON_CATEGORIA} ${where} ORDER BY ${ORDEN_PUBLICO} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total ${FROM_CON_CATEGORIA} ${where}`,
    params
  );

  return { data: await adjuntarImagenes(rows), total: countRows[0].total };
};

exports.obtenerActivosParaSitemap = async () => {
  const [rows] = await pool.query(
    'SELECT id, nombre, updated_at FROM productos WHERE activo = 1 ORDER BY id ASC'
  );
  return rows;
};

exports.obtenerProductoPublicoPorId = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${COLUMNAS_PUBLICO} ${FROM_CON_CATEGORIA} WHERE p.id = ? AND p.activo = 1`,
    [id]
  );
  if (!rows[0]) return undefined;
  const [conImagenes] = await adjuntarImagenes(rows);
  return conImagenes;
};

exports.obtenerProductoPorId = async (id) => {
  const [rows] = await pool.query(`SELECT ${COLUMNAS_ADMIN} ${FROM_CON_CATEGORIA} WHERE p.id = ?`, [id]);
  if (!rows[0]) return undefined;
  const [conImagenes] = await adjuntarImagenes(rows);
  return conImagenes;
};

exports.obtenerProductoPorBarcode = async (barcode) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, sku, barcode, precio, stock, activo, requiere_imei FROM productos WHERE barcode = ? LIMIT 1',
    [barcode]
  );
  return rows[0];
};

exports.actualizarProducto = async (id, producto) => {
  const { nombre, descripcion, sku, barcode, precio, stock, activo, requiere_imei, categoria_id, destacado } = producto;
  await pool.query(
    `UPDATE productos SET nombre = ?, descripcion = ?, sku = ?, barcode = ?, precio = ?, stock = ?, activo = ?,
       requiere_imei = ?, categoria_id = ?, destacado = ?
     WHERE id = ?`,
    [nombre, descripcion, sku, barcode, precio, stock, activo ? 1 : 0, requiere_imei ? 1 : 0,
      aCategoriaId(categoria_id), destacado ? 1 : 0, id]
  );
};

exports.eliminarProducto = async (id) => {
  await pool.query('DELETE FROM productos WHERE id = ?', [id]);
};

// Usado por la importación desde Excel: SKU -> id para decidir si cada fila
// crea un producto nuevo o actualiza uno existente, y código de barras -> id
// para detectar barcodes que ya usa OTRO producto.
exports.obtenerSkusYBarcodesExistentes = async () => {
  const [rows] = await pool.query(
    'SELECT id, sku, barcode FROM productos WHERE sku IS NOT NULL OR barcode IS NOT NULL'
  );
  const skus = new Map();
  const barcodes = new Map();
  for (const r of rows) {
    if (r.sku) skus.set(r.sku, r.id);
    if (r.barcode) barcodes.set(r.barcode, r.id);
  }
  return { skus, barcodes };
};

// Para la carga masiva de fotos: todos los SKU cargados, para asignar cada
// archivo al producto cuyo SKU coincide con el comienzo de su nombre.
exports.obtenerProductosConSku = async () => {
  const [rows] = await pool.query('SELECT id, sku FROM productos WHERE sku IS NOT NULL AND sku <> \'\'');
  return rows;
};

exports.crearProductosBulk = async (connection, productos) => {
  const valores = productos.map((p) => [
    p.nombre,
    p.descripcion || null,
    p.sku || null,
    p.barcode || null,
    p.precio,
    p.stock,
    p.requiere_imei ? 1 : 0,
    aCategoriaId(p.categoria_id),
    p.destacado ? 1 : 0
  ]);
  const [result] = await connection.query(
    'INSERT INTO productos (nombre, descripcion, sku, barcode, precio, stock, requiere_imei, categoria_id, destacado) VALUES ?',
    [valores]
  );
  return result;
};

// Actualización desde la importación: solo pisa los campos que el Excel trae
// (`campos`), así un archivo que solo tiene nombre/sku/precio actualiza el
// precio sin borrar la descripción, el stock o la categoría cargados antes.
const CAMPOS_ACTUALIZABLES = ['nombre', 'descripcion', 'barcode', 'precio', 'stock', 'requiere_imei', 'categoria_id', 'destacado'];

exports.actualizarProductoImportado = async (connection, id, campos) => {
  const claves = CAMPOS_ACTUALIZABLES.filter((c) => campos[c] !== undefined);
  if (claves.length === 0) return;
  const valores = claves.map((c) => {
    if (c === 'requiere_imei' || c === 'destacado') return campos[c] ? 1 : 0;
    if (c === 'categoria_id') return aCategoriaId(campos[c]);
    return campos[c];
  });
  await connection.query(
    `UPDATE productos SET ${claves.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...valores, id]
  );
};
