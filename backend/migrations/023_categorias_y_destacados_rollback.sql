ALTER TABLE productos
  DROP FOREIGN KEY fk_productos_categoria,
  DROP INDEX idx_productos_destacado,
  DROP COLUMN categoria_id,
  DROP COLUMN destacado;

DROP TABLE IF EXISTS categorias;
