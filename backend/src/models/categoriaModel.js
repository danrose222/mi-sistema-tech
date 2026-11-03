const pool = require('../config/database');
const slugify = require('../utils/slugify');

// Orden por defecto de las categorías que se crean sobre la marcha (desde
// la importación o el formulario): quedan después de las que ya tienen un
// orden definido a mano.
const ORDEN_POR_DEFECTO = 100;

exports.listarCategorias = async () => {
  const [rows] = await pool.query(
    'SELECT id, nombre, slug, orden FROM categorias ORDER BY orden ASC, nombre ASC'
  );
  return rows;
};

// Para el sidebar de la tienda: solo las categorías que tienen al menos un
// producto activo, así el cliente no entra a una categoría vacía.
exports.listarCategoriasConProductosActivos = async () => {
  const [rows] = await pool.query(
    `SELECT c.id, c.nombre, c.slug, c.orden, COUNT(p.id) AS total_productos
       FROM categorias c
       JOIN productos p ON p.categoria_id = c.id AND p.activo = 1
      GROUP BY c.id, c.nombre, c.slug, c.orden
      ORDER BY c.orden ASC, c.nombre ASC`
  );
  return rows;
};

exports.obtenerCategoriaPorId = async (id) => {
  const [rows] = await pool.query('SELECT id, nombre, slug, orden FROM categorias WHERE id = ?', [id]);
  return rows[0];
};

// Busca la categoría por nombre o slug (sin distinguir mayúsculas ni tildes,
// porque el slug ya los normaliza) y la crea si no existe. Recibe la conexión
// para poder usarse dentro de la transacción de la importación.
exports.obtenerOCrearPorNombre = async (connection, nombre) => {
  const limpio = String(nombre || '').trim();
  if (!limpio) return null;
  const slug = slugify(limpio);
  if (!slug) return null;

  const [existentes] = await connection.query('SELECT id FROM categorias WHERE slug = ? LIMIT 1', [slug]);
  if (existentes[0]) return existentes[0].id;

  const [result] = await connection.query(
    'INSERT INTO categorias (nombre, slug, orden) VALUES (?, ?, ?)',
    [limpio, slug, ORDEN_POR_DEFECTO]
  );
  return result.insertId;
};
