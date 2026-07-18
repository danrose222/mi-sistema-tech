-- Rollback de la migración 015

ALTER TABLE productos DROP COLUMN requiere_imei;
ALTER TABLE pedido_items DROP COLUMN imei_serie;
