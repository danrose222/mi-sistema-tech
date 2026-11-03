const productoModel = require('../models/productoModel');
const categoriaModel = require('../models/categoriaModel');
const logError = require('../utils/logError');
const slugify = require('../utils/slugify');

function toPublico(producto) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    slug: `${producto.id}-${slugify(producto.nombre)}`,
    descripcion: producto.descripcion,
    precio: Number(producto.precio),
    stock: producto.stock,
    categoria_id: producto.categoria_id ?? null,
    categoria_nombre: producto.categoria_nombre ?? null,
    categoria_slug: producto.categoria_slug ?? null,
    destacado: Boolean(producto.destacado),
    imagenes: producto.imagenes || []
  };
}

exports.listarProductos = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';
    const categoria = String(req.query.categoria || '').trim();

    const { data, total } = await productoModel.obtenerProductosPublicoPaginado({ page, limit, search, categoria });
    res.json({ success: true, data: data.map(toPublico), total });
  } catch (err) {
    logError('[Publico]', err);
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
    logError('[Publico]', err);
    res.status(500).json({ success: false, error: 'Error al obtener producto' });
  }
};

exports.listarCategorias = async (req, res) => {
  try {
    // Solo las categorías con productos activos: el sidebar de la tienda no
    // debería ofrecer categorías vacías.
    const categorias = await categoriaModel.listarCategoriasConProductosActivos();
    res.json({
      success: true,
      data: categorias.map((c) => ({ id: c.id, nombre: c.nombre, slug: c.slug, total: Number(c.total_productos) }))
    });
  } catch (err) {
    logError('[Publico]', err);
    res.status(500).json({ success: false, error: 'Error al obtener categorías' });
  }
};

function xmlEscape(text) {
  return String(text).replace(/[<>&'"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch]));
}

// Reusa FRONTEND_URL (ya definida para CORS) como base de las URLs del sitemap.
const SITE_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

exports.sitemap = async (req, res) => {
  try {
    const productos = await productoModel.obtenerActivosParaSitemap();

    const urlsEstaticas = [
      { loc: '/', changefreq: 'daily', priority: '1.0' },
      { loc: '/productos', changefreq: 'daily', priority: '0.9' }
    ];

    const urlsProductos = productos.map((p) => ({
      loc: `/producto/${p.id}-${slugify(p.nombre)}`,
      lastmod: new Date(p.updated_at).toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8'
    }));

    const entradas = [...urlsEstaticas, ...urlsProductos]
      .map((u) => `  <url>
    <loc>${xmlEscape(SITE_URL + u.loc)}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`)
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entradas}
</urlset>`;

    res.type('application/xml').send(xml);
  } catch (err) {
    logError('[Publico]', err);
    res.status(500).json({ success: false, error: 'Error al generar el sitemap' });
  }
};
