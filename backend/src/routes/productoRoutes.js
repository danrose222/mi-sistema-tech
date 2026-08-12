const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');
const { uploadProductoImagen, uploadExcelProductos } = require('../middleware/uploadMiddleware');

const adminOnly = authorizeRole(['admin']);

router.use(authenticate);

router.get('/', productoController.listarProductos);
router.get('/barcode/:barcode', productoController.obtenerProductoPorBarcode);
router.get('/importar/plantilla', productoController.descargarPlantillaImportacion);
router.post('/importar', uploadExcelProductos, productoController.importarProductos);
router.get('/:id', productoController.obtenerProducto);
// uploadProductoImagen solo actúa si la request es multipart/form-data (hay
// imagen nueva); si es JSON plano, no toca req.body y sigue de largo.
router.post('/', uploadProductoImagen, productoController.crearProducto);
router.put('/:id', uploadProductoImagen, productoController.actualizarProducto);
router.delete('/:id', adminOnly, productoController.eliminarProducto);

module.exports = router;
