-- Migración 011: Método de pago para ventas de mostrador (POS)
-- 'efectivo_local' significa "paga al retirar" (reserva online pendiente,
-- sujeta al cron de liberación de 48hs); una venta de POS ya se cobró en el
-- momento en el mostrador, así que necesita su propio valor para no quedar
-- indistinguible de una reserva y terminar cancelada por ese mismo cron.

ALTER TABLE pedidos
  MODIFY COLUMN metodo_pago ENUM('mercado_pago','transferencia','efectivo_local','efectivo_pos') NOT NULL DEFAULT 'mercado_pago';
