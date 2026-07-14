const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.post('/recordatorio', whatsappController.enviarRecordatorio);

module.exports = router;
