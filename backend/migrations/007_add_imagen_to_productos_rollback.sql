-- Rollback de Migración 007: Imagen de producto

ALTER TABLE productos DROP COLUMN imagen_url;
