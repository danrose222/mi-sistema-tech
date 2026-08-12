const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

// El rate limiter general de /api/ (100 req/15min, ver app.js) es demasiado
// laxo para login específicamente: permitiría ~100 intentos de contraseña
// por IP en esa ventana. Acá se limita mucho más agresivo para dificultar
// fuerza bruta, sin afectar al resto de la API.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de inicio de sesión. Probá de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', loginLimiter, authController.login);

module.exports = router;
