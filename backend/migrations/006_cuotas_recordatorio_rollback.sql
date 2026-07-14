-- Rollback de Migración 006: Recordatorios de WhatsApp para cuotas

ALTER TABLE cuotas DROP COLUMN ultimo_recordatorio;
