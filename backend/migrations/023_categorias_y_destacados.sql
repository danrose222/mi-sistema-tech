-- Migración 023: categorías de productos y productos destacados
-- El catálogo público ya esperaba `categoria_id`/`categoria_nombre` y un
-- endpoint /categorias (que hasta ahora devolvía una lista vacía). Las
-- categorías van en su propia tabla (no como texto libre en productos) para
-- que el nombre no se repita escrito de mil formas y se pueda ordenar el
-- catálogo por categoría.
--
-- `orden` define qué categoría aparece primero en la tienda (menor = antes).
-- `destacado` sube el producto al principio del catálogo público.

CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  orden INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categorias_nombre (nombre),
  UNIQUE KEY uq_categorias_slug (slug)
) ENGINE=InnoDB;

ALTER TABLE productos
  ADD COLUMN categoria_id INT DEFAULT NULL,
  ADD COLUMN destacado TINYINT(1) NOT NULL DEFAULT 0,
  ADD CONSTRAINT fk_productos_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
  ADD INDEX idx_productos_destacado (destacado);

-- Categorías iniciales del negocio. Celulares va primero en la tienda.
INSERT INTO categorias (nombre, slug, orden) VALUES
  ('Celulares', 'celulares', 1),
  ('Smartwatch', 'smartwatch', 10),
  ('Auriculares', 'auriculares', 20),
  ('Parlantes', 'parlantes', 30),
  ('Cargadores', 'cargadores', 40),
  ('Cables', 'cables', 50),
  ('Fundas', 'fundas', 60),
  ('Protectores de pantalla', 'protectores-de-pantalla', 70),
  ('Mouse', 'mouse', 80),
  ('Teclados', 'teclados', 90),
  ('Joysticks', 'joysticks', 100),
  ('Otros accesorios', 'otros-accesorios', 200);
