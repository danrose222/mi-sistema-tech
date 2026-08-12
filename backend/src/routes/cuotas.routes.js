const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');

const pool = require('../config/database');
const cuotasRepo = require('../repositories/cuotas.repository');
const whatsappService = require('../services/whatsappService');
const { construirMensaje } = require('../services/notificaciones.service');
const { authenticate } = require('../middleware/authMiddleware');
const logError = require('../utils/logError');

const authMiddleware = authenticate;

const validarPeticion = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// POST /api/cuotas/:id/recordatorio (admin o cajero)
// Envío manual e inmediato del recordatorio de WhatsApp para una cuota puntual,
// sin las condiciones de anti-spam del cron (acá el pedido es explícito).
router.post(
  '/:id/recordatorio',
  authMiddleware,
  [param('id').isInt().withMessage('El ID de cuota es inválido')],
  validarPeticion,
  async (req, res) => {
    try {
      const cuota = await cuotasRepo.buscarDetalleParaRecordatorio(pool, req.params.id);
      if (!cuota) {
        return res.status(404).json({ success: false, error: 'La cuota especificada no existe' });
      }
      if (!cuota.cliente_telefono) {
        return res.status(400).json({ success: false, error: 'El cliente no tiene un teléfono registrado' });
      }

      const mensaje = construirMensaje(cuota);
      await whatsappService.enviarMensaje({ telefono: cuota.cliente_telefono, mensaje });
      await cuotasRepo.marcarRecordatorioEnviado(pool, cuota.id);

      return res.status(200).json({
        success: true,
        data: { cuotaId: cuota.id, telefono: cuota.cliente_telefono, mensaje }
      });
    } catch (error) {
      logError('[Cuotas] Error al enviar recordatorio manual:', error);
      const noConfigurado = error.message && error.message.includes('no configurado');
      return res.status(noConfigurado ? 503 : 500).json({
        success: false,
        error: noConfigurado ? error.message : 'Error al enviar el recordatorio por WhatsApp'
      });
    }
  }
);

module.exports = router;
