const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/resumen', dashboardController.obtenerResumen);
router.get('/ventas-mes', dashboardController.obtenerVentasMes);

module.exports = router;
