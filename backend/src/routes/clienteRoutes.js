const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

const adminOnly = authorizeRole(['admin']);

router.use(authenticate);

router.get('/', clienteController.listarClientes);
router.get('/buscar', clienteController.buscarPorDni);
router.get('/:id', clienteController.obtenerCliente);

router.post('/', clienteController.registrarCliente);

router.put('/:id', clienteController.actualizarCliente);
router.put('/:id/pagar-deuda', clienteController.pagarDeuda);

router.delete('/:id', adminOnly, clienteController.eliminarCliente);

module.exports = router;