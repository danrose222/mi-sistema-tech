-- Migración 007: Imagen de producto
-- `imagen_url` guarda la ruta relativa servida por Express (ver app.js,
-- express.static sobre /uploads) generada por el middleware de multer.
-- Nullable porque productos existentes no tienen foto todavía.

ALTER TABLE productos
  ADD COLUMN imagen_url VARCHAR(255) DEFAULT NULL;
