-- Migración 010: Email del comprador en el pedido
-- El checkout ya pide el email en payer.email, pero nunca se guardaba en
-- ningún lado (cliente_id casi siempre queda NULL en compras de invitado).
-- Sin esta columna no hay forma de saber a quién mandarle el comprobante
-- cuando el pago se aprueba.

ALTER TABLE pedidos
  ADD COLUMN cliente_email VARCHAR(255) DEFAULT NULL;
