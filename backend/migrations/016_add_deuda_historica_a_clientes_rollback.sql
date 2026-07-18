-- Rollback de la migración 016

DROP TABLE IF EXISTS caja_movimientos;

ALTER TABLE clientes DROP COLUMN deuda_historica;
