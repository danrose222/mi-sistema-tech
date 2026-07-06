const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');

router.get('/', pedidoController.listarPedidos);
router.get('/:id', pedidoController.obtenerPedido);
router.post('/', pedidoController.crearPedido);
router.post('/webhook', pedidoController.webhookPago);

module.exports = router;
