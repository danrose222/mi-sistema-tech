-- Migración 015: control de IMEI/N° de serie para venta de celulares
-- imei_serie vive en pedido_items (no en productos): un producto es un
-- "modelo" (ej. "Samsung Galaxy S25"), pero cada unidad física vendida tiene
-- su propio IMEI, así que la trazabilidad va por línea de venta.

ALTER TABLE pedido_items
  ADD COLUMN imei_serie VARCHAR(50) NULL DEFAULT NULL;

ALTER TABLE productos
  ADD COLUMN requiere_imei TINYINT(1) NOT NULL DEFAULT 0;
