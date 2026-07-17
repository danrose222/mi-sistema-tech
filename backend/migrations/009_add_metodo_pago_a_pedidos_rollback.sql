-- Rollback de Migración 009: Método de pago del pedido

ALTER TABLE pedidos DROP COLUMN metodo_pago;
