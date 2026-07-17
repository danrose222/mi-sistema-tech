-- Rollback de Migración 010: Email del comprador en el pedido

ALTER TABLE pedidos DROP COLUMN cliente_email;
