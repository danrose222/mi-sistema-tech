const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(authorizeRole(['admin']));

router.get('/', adminUserController.listar);
router.get('/:id', adminUserController.obtener);
router.put('/:id', adminUserController.actualizar);
router.delete('/:id', adminUserController.borrar);

module.exports = router;
