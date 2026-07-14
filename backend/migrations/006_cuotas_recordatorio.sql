-- Migración 006: Recordatorios de WhatsApp para cuotas
-- `ultimo_recordatorio` evita hacer spam al cliente: el motor de notificaciones
-- (ver notificaciones.service.js) y el envío manual la consultan antes de escribir de nuevo.

ALTER TABLE cuotas
  ADD COLUMN ultimo_recordatorio DATETIME NULL DEFAULT NULL;
