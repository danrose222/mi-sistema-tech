-- Rollback de Migración 012: Devoluciones/reembolsos de pedidos

UPDATE pedidos SET estado = 'cancelado' WHERE estado = 'reembolsado';

ALTER TABLE pedidos DROP COLUMN reembolsado_en;

ALTER TABLE pedidos
  MODIFY COLUMN estado ENUM('pendiente','pagado','cancelado','enviado') DEFAULT 'pendiente';
