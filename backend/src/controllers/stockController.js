const stockModel = require('../models/stockModel');

exports.listarMovimientos = async (req, res) => {
  try {
    const movimientos = await stockModel.obtenerMovimientos();
    res.json(movimientos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener movimientos de stock' });
  }
};

exports.ajustarStock = async (req, res) => {
  try {
    const { producto_id, cantidad, tipo, nota } = req.body;
    if (!producto_id || !cantidad || !tipo) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const movimientoId = await stockModel.crearMovimiento({ producto_id, cantidad, tipo, nota });
    const producto = await stockModel.ajustarStockProducto(producto_id, cantidad, tipo);
    res.status(201).json({ movimiento_id: movimientoId, producto });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al ajustar stock' });
  }
};
