const productoModel = require('../models/productoModel');

function quitarAcentos(text) {
  return text
    .normalize('NFD')
    .split('')
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('');
}

function slugify(text) {
  return quitarAcentos(String(text))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toPublico(producto) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    slug: `${producto.id}-${slugify(producto.nombre)}`,
    descripcion: producto.descripcion,
    precio: Number(producto.precio),
    stock: producto.stock,
    categoria_id: null,
    categoria_nombre: null,
    imagenes: []
  };
}

exports.listarProductos = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';

    const { data, total } = await productoModel.obtenerProductosPublicoPaginado({ page, limit, search });
    res.json({ success: true, data: data.map(toPublico), total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener productos' });
  }
};

exports.obtenerProductoPorSlug = async (req, res) => {
  try {
    const id = parseInt(req.params.slug, 10);
    if (!id) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

    const producto = await productoModel.obtenerProductoPublicoPorId(id);
    if (!producto) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

    res.json({ success: true, data: toPublico(producto) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener producto' });
  }
};

exports.listarCategorias = async (req, res) => {
  // No existe un sistema de categorías todavía (ni tabla en el schema);
  // se devuelve una lista vacía para que el frontend siga funcionando
  // (el sidebar de categorías simplemente no muestra filtros).
  res.json({ success: true, data: [] });
};
