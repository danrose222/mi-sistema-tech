-- Rollback de Migración 005: Historial crediticio del cliente

ALTER TABLE clientes DROP COLUMN historial_crediticio;
