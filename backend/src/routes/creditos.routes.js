const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { crearCredito, listarCreditos, obtenerDetalleCredito, pagarCuota, eliminarCredito } = require('../services/creditos.service');
const cuotasRepo = require('../repositories/cuotas.repository');
const pool = require('../config/database');

const { authenticate, authorizeRole } = require('../middleware/authMiddleware');
const authMiddleware = authenticate;
const adminOnly = authorizeRole(['admin']);

/**
 * Middleware local para interceptar y devolver errores de express-validator.
 */
const validarPeticion = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * Función auxiliar para mapear los errores generados por el service
 * y responder con el Status HTTP apropiado (400, 404, 409, 500).
 */
const handleServiceError = (error, res) => {
  console.error('[Error de Créditos]:', error);
  const msg = error.message.toLowerCase();
  
  if (msg.includes('no existe') || msg.includes('no encontrado')) {
    return res.status(404).json({ success: false, error: error.message });
  }
  if (msg.includes('requerido') || msg.includes('inválid') || msg.includes('mayor a cero') || msg.includes('frecuencia')) {
    return res.status(400).json({ success: false, error: error.message });
  }
  if (msg.includes('ya se encuentra') || msg.includes('no se permite')) {
    return res.status(409).json({ success: false, error: error.message });
  }
  
  return res.status(500).json({ success: false, error: 'Error interno del servidor', detalle: error.message });
};

// ==========================================================
// RUTAS DE CRÉDITOS
// ==========================================================

// POST /api/creditos (solo admin)
router.post(
  '/',
  authMiddleware,
  adminOnly,
  [
    body('clienteId').isInt().withMessage('clienteId debe ser un número entero'),
    body('pedidoId').optional({ nullable: true }).isInt().withMessage('pedidoId debe ser un entero'),
    body('productoId').optional({ nullable: true }).isInt().withMessage('productoId debe ser un entero'),
    body('montoTotal').isFloat({ gt: 0 }).withMessage('montoTotal debe ser un número mayor a 0'),
    body('cantidadCuotas').isInt({ min: 2, max: 48 }).withMessage('cantidadCuotas debe estar entre 2 y 48'),
    body('frecuencia').isIn(['semanal', 'mensual']).withMessage('frecuencia debe ser "semanal" o "mensual"'),
    body('fechaPrimeraCuota')
      .isISO8601()
      .withMessage('fechaPrimeraCuota debe tener formato de fecha válido (YYYY-MM-DD)')
      .custom((value) => {
        // `value` ya viene validado como fecha ISO (YYYY-MM-DD). Comparamos como
        // strings en vez de construir un `Date`: `new Date('YYYY-MM-DD')` parsea
        // en UTC, y al normalizar horas en huso horario negativo (ej. Argentina,
        // UTC-3) el día se corría uno para atrás, rechazando la fecha de HOY como
        // "en el pasado".
        const hoy = new Date();
        const hoyStr = [
          hoy.getFullYear(),
          String(hoy.getMonth() + 1).padStart(2, '0'),
          String(hoy.getDate()).padStart(2, '0')
        ].join('-');

        if (value < hoyStr) {
          throw new Error('La fecha de la primera cuota no puede ser en el pasado');
        }
        return true;
      })
  ],
  validarPeticion,
  async (req, res) => {
    try {
      const usuarioId = req.user ? req.user.id : null;
      const creditoCreado = await crearCredito(pool, { ...req.body, usuarioId });
      return res.status(201).json({ success: true, data: creditoCreado });
    } catch (error) {
      return handleServiceError(error, res);
    }
  }
);

// GET /api/creditos (admin o cajero)
router.get(
  '/',
  authMiddleware,
  [
    query('estado').optional().isString(),
    query('clienteId').optional().isInt(),
    query('pagina').optional().isInt({ min: 1 }).toInt(),
    query('porPagina').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  validarPeticion,
  async (req, res) => {
    try {
      const filtros = {
        estado: req.query.estado,
        clienteId: req.query.clienteId,
        pagina: req.query.pagina || 1,
        porPagina: req.query.porPagina || 20
      };
      const resultado = await listarCreditos(pool, filtros);
      return res.status(200).json({ success: true, ...resultado }); // { success, data, total }
    } catch (error) {
      return handleServiceError(error, res);
    }
  }
);

// GET /api/creditos/:id (admin o cajero)
router.get(
  '/:id',
  authMiddleware,
  [
    param('id').isInt().withMessage('El ID de crédito es inválido')
  ],
  validarPeticion,
  async (req, res) => {
    try {
      const detalle = await obtenerDetalleCredito(pool, req.params.id);
      return res.status(200).json({ success: true, data: detalle });
    } catch (error) {
      return handleServiceError(error, res);
    }
  }
);

// DELETE /api/creditos/:id (solo admin) — borra el crédito y sus cuotas en una transacción.
// Se rechaza con 409 si el crédito ya tiene pagos registrados (ver creditos.service.js).
router.delete(
  '/:id',
  authMiddleware,
  adminOnly,
  [
    param('id').isInt().withMessage('El ID de crédito es inválido')
  ],
  validarPeticion,
  async (req, res) => {
    try {
      const resultado = await eliminarCredito(pool, req.params.id);
      return res.status(200).json({ success: true, data: resultado });
    } catch (error) {
      return handleServiceError(error, res);
    }
  }
);

// POST /api/creditos/:id/cuotas/:cuotaId/pagar (admin o cajero)
router.post(
  '/:id/cuotas/:cuotaId/pagar',
  authMiddleware,
  [
    param('id').isInt().withMessage('El ID de crédito es inválido'),
    param('cuotaId').isInt().withMessage('El ID de cuota es inválido'),
    body('monto').isFloat({ gt: 0 }).withMessage('El monto a pagar debe ser mayor a 0')
  ],
  validarPeticion,
  async (req, res) => {
    try {
      const usuarioId = req.user ? req.user.id : null;
      const pagoId = req.body.pagoId || null; 
      
      const resultado = await pagarCuota(
        pool, 
        req.params.cuotaId, 
        req.body.monto, 
        pagoId, 
        usuarioId
      );
      
      return res.status(200).json({ success: true, data: resultado });
    } catch (error) {
      return handleServiceError(error, res);
    }
  }
);

// ==========================================================
// RUTAS DE CUOTAS
// ==========================================================
// Nota: Si este archivo se importa y monta como `app.use('/api/creditos', creditosRoutes);`
// entonces esta ruta será /api/creditos/cuotas/vencidas. Si lo montas diferente para que 
// empiece solo con /api, la ruta responderá en /api/cuotas/vencidas.

// GET /api/cuotas/vencidas (solo admin)
router.get(
  '/cuotas/vencidas',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      // Como solo pide consultar las vencidas (no ejecutar el job de actualización), 
      // utilizamos directamente el repositorio.
      const hoy = new Date().toISOString().split('T')[0];
      const cuotasVencidas = await cuotasRepo.buscarVencidas(pool, hoy);
      
      return res.status(200).json({ success: true, data: cuotasVencidas });
    } catch (error) {
      return handleServiceError(error, res);
    }
  }
);

module.exports = router;
