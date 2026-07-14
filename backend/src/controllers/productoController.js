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

exports.crearProducto = async (req, res) => {
  try {
    if (!req.body.nombre || req.body.precio === undefined || req.body.precio === null) {
      return res.status(400).json({ success: false, error: 'nombre y precio son requeridos' });
    }
    const id = await productoModel.crearProducto(req.body);
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

    await productoModel.actualizarProducto(req.params.id, req.body);
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
