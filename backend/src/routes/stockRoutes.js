const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/movimientos', stockController.listarMovimientos);
router.post('/ajustar', stockController.ajustarStock);

module.exports = router;
