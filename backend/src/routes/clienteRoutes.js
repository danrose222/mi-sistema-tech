const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', clienteController.listarClientes);
router.get('/buscar', clienteController.buscarPorDni);
router.get('/:id', clienteController.obtenerCliente);

router.post('/', clienteController.registrarCliente);

router.put('/:id', clienteController.actualizarCliente);

router.delete('/:id', clienteController.eliminarCliente);

module.exports = router;