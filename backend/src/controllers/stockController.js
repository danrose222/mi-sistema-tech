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
    if (!['ingreso', 'egreso', 'ajuste'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de movimiento inválido' });
    }

    const { movimientoId, producto } = await stockModel.ajustarStockConMovimiento({ producto_id, cantidad, tipo, nota });
    res.status(201).json({ movimiento_id: movimientoId, producto });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al ajustar stock' });
  }
};
