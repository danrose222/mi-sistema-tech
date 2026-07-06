const productoModel = require('../models/productoModel');

exports.listarProductos = async (req, res) => {
  try {
    const productos = await productoModel.obtenerProductos();
    res.json(productos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

exports.obtenerProducto = async (req, res) => {
  try {
    const producto = await productoModel.obtenerProductoPorId(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

exports.obtenerProductoPorBarcode = async (req, res) => {
  try {
    const producto = await productoModel.obtenerProductoPorBarcode(req.params.barcode);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto por barcode' });
  }
};

exports.crearProducto = async (req, res) => {
  try {
    const id = await productoModel.crearProducto(req.body);
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

exports.actualizarProducto = async (req, res) => {
  try {
    await productoModel.actualizarProducto(req.params.id, req.body);
    res.json({ mensaje: 'Producto actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    await productoModel.eliminarProducto(req.params.id);
    res.json({ mensaje: 'Producto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};
