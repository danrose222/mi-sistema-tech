-- Migración 004: Vincular un crédito al producto financiado (opcional)
-- Permite que "Nuevo Crédito" registre qué producto originó el crédito y
-- autocompletar el monto total en el frontend a partir de su precio.

ALTER TABLE creditos
  ADD COLUMN producto_id INT NULL AFTER pedido_id;

ALTER TABLE creditos
  ADD CONSTRAINT fk_creditos_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL;

CREATE INDEX idx_creditos_producto ON creditos(producto_id);
