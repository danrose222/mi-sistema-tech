const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');

router.get('/', productoController.listarProductos);
router.get('/barcode/:barcode', productoController.obtenerProductoPorBarcode);
router.get('/:id', productoController.obtenerProducto);
router.post('/', productoController.crearProducto);
router.put('/:id', productoController.actualizarProducto);
router.delete('/:id', productoController.eliminarProducto);

module.exports = router;
