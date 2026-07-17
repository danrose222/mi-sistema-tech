const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/caja-diaria', reportesController.obtenerCajaDiaria);

module.exports = router;
