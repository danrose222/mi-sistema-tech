const productoModel = require('../models/productoModel');

exports.listarProductos = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';

    const { data, total } = await productoModel.obtenerProductosPaginado({ page, limit, search });
    res.json({ success: true, data, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener productos' });
  }
};

exports.obtenerProducto = async (req, res) => {
  try {
    const producto = await productoModel.obtenerProductoPorId(req.params.id);
    if (!producto) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    res.json({ success: true, data: producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener producto' });
  }
};

exports.obtenerProductoPorBarcode = async (req, res) => {
  try {
    const producto = await productoModel.obtenerProductoPorBarcode(req.params.barcode);
    if (!producto) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    res.json({ success: true, data: producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener producto por barcode' });
  }
};

// El middleware de multer (uploadMiddleware.uploadProductoImagen) ya corrió
// antes de estos handlers: si la request era multipart, dejó el archivo en
// req.file y los demás campos (como strings) en req.body; si era JSON normal,
// no toca nada y req.file queda undefined.
function buildImagenUrl(req) {
  return req.file ? `/uploads/productos/${req.file.filename}` : undefined;
}

// FormData serializa todo a string (incluido el checkbox `activo`), así que
// "false" llega como string no vacío -> truthy en JS. Se normaliza acá para
// que el multipart se comporte igual que el JSON plano de siempre.
function normalizarBody(req) {
  const body = { ...req.body, imagen_url: buildImagenUrl(req) };
  if (typeof body.activo === 'string') {
    body.activo = body.activo !== 'false' && body.activo !== '0';
  }
  return body;
}

exports.crearProducto = async (req, res) => {
  try {
    if (!req.body.nombre || req.body.precio === undefined || req.body.precio === null) {
      return res.status(400).json({ success: false, error: 'nombre y precio son requeridos' });
    }
    const id = await productoModel.crearProducto(normalizarBody(req));
    const producto = await productoModel.obtenerProductoPorId(id);
    res.status(201).json({ success: true, data: producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al crear producto' });
  }
};

exports.actualizarProducto = async (req, res) => {
  try {
    const existente = await productoModel.obtenerProductoPorId(req.params.id);
    if (!existente) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

    await productoModel.actualizarProducto(req.params.id, normalizarBody(req));
    const producto = await productoModel.obtenerProductoPorId(req.params.id);
    res.json({ success: true, data: producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al actualizar producto' });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    await productoModel.eliminarProducto(req.params.id);
    res.json({ success: true, mensaje: 'Producto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al eliminar producto' });
  }
};
