-- Rollback de Migración 011: Método de pago para ventas de mostrador (POS)

UPDATE pedidos SET metodo_pago = 'efectivo_local' WHERE metodo_pago = 'efectivo_pos';

ALTER TABLE pedidos
  MODIFY COLUMN metodo_pago ENUM('mercado_pago','transferencia','efectivo_local') NOT NULL DEFAULT 'mercado_pago';
