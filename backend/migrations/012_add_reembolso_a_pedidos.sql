-- Migración 012: Devoluciones/reembolsos de pedidos
-- 'reembolsado' se suma al ENUM de estado. reembolsado_en queda separado de
-- updated_at (que cualquier UPDATE toca) a propósito: el reporte de Caja
-- Diaria necesita saber exactamente qué día se hizo la devolución en sí,
-- sin depender de que nada más vuelva a tocar la fila después.

ALTER TABLE pedidos
  MODIFY COLUMN estado ENUM('pendiente','pagado','cancelado','enviado','reembolsado') DEFAULT 'pendiente';

ALTER TABLE pedidos
  ADD COLUMN reembolsado_en TIMESTAMP NULL DEFAULT NULL;
