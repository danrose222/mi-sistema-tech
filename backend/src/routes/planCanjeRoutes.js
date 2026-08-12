const express = require('express');
const router = express.Router();
const planCanjeController = require('../controllers/planCanjeController');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

const adminOnly = authorizeRole(['admin']);

// Todo el módulo es interno del panel admin: los contactos llegan por
// WhatsApp y el admin carga/actualiza las operaciones a mano, no hay
// flujo público como en pedidos.
router.use(authenticate);

router.get('/', planCanjeController.listar);
router.get('/:id', planCanjeController.obtener);
router.post('/', planCanjeController.crear);
router.put('/:id', planCanjeController.actualizar);
router.delete('/:id', adminOnly, planCanjeController.eliminar);

module.exports = router;
