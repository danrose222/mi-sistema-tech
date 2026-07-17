-- Rollback de la migración 013

ALTER TABLE clientes DROP INDEX idx_clientes_dni;
ALTER TABLE clientes DROP COLUMN dni;
