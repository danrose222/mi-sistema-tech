const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.post('/recordatorio', whatsappController.enviarRecordatorio);

module.exports = router;
