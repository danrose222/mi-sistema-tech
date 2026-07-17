-- Migración 008: múltiples imágenes por producto
-- Reemplaza la columna única productos.imagen_url por una relación 1:N.
-- El orden de las imágenes (cuál es la "principal") se resuelve por id
-- ascendente: se insertan en una sola tanda respetando el orden en que
-- el usuario las subió, así que el autoincremental ya es el orden real.

CREATE TABLE producto_imagenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  imagen_url VARCHAR(255) NOT NULL,
  CONSTRAINT fk_producto_imagenes_producto
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO producto_imagenes (producto_id, imagen_url)
SELECT id, imagen_url FROM productos WHERE imagen_url IS NOT NULL;

ALTER TABLE productos DROP COLUMN imagen_url;
