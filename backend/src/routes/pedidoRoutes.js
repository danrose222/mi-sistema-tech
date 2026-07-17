const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const { authenticate } = require('../middleware/authMiddleware');

// Público: creación de pedidos desde el checkout del storefront y webhook de MercadoPago
// (el webhook se autentica por firma HMAC, no por JWT — ver mercadopagoService.validarWebhook).
router.post('/', pedidoController.crearPedido);
router.post('/webhook', pedidoController.webhookPago);

// Privado: consulta de pedidos y venta de mostrador (POS) desde el panel admin
router.get('/', authenticate, pedidoController.listarPedidos);
router.post('/pos', authenticate, pedidoController.crearVentaPos);
router.get('/:id', authenticate, pedidoController.obtenerPedido);

module.exports = router;
