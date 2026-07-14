const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/movimientos', stockController.listarMovimientos);
router.post('/ajustar', stockController.ajustarStock);

module.exports = router;
