-- Rollback de Migración 008: múltiples imágenes por producto

ALTER TABLE productos ADD COLUMN imagen_url VARCHAR(255) DEFAULT NULL;

UPDATE productos p
JOIN (
  SELECT producto_id, MIN(id) AS primera_id
  FROM producto_imagenes
  GROUP BY producto_id
) pi ON pi.producto_id = p.id
JOIN producto_imagenes im ON im.id = pi.primera_id
SET p.imagen_url = im.imagen_url;

DROP TABLE producto_imagenes;
