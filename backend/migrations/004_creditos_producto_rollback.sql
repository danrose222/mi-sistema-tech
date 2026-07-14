-- Rollback de Migración 004: Vincular un crédito al producto financiado

ALTER TABLE creditos DROP FOREIGN KEY fk_creditos_producto;
DROP INDEX idx_creditos_producto ON creditos;
ALTER TABLE creditos DROP COLUMN producto_id;
