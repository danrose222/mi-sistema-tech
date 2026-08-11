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
    imagenes: producto.imagenes || []
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
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al generar el sitemap' });
  }
};
