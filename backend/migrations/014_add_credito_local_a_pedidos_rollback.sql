-- Rollback de la migración 014
-- Los pedidos 'financiado' pasan a 'cancelado' y los 'credito_local' a
-- 'efectivo_local' para poder achicar los ENUM sin dejar filas huérfanas.

UPDATE pedidos SET estado = 'cancelado' WHERE estado = 'financiado';
UPDATE pedidos SET metodo_pago = 'efectivo_local' WHERE metodo_pago = 'credito_local';

ALTER TABLE pedidos
  MODIFY COLUMN estado ENUM('pendiente','pagado','cancelado','enviado','reembolsado') DEFAULT 'pendiente';

ALTER TABLE pedidos
  MODIFY COLUMN metodo_pago ENUM('mercado_pago','transferencia','efectivo_local','efectivo_pos') NOT NULL DEFAULT 'mercado_pago';
