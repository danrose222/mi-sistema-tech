ALTER TABLE clientes
  ADD COLUMN estado_cliente ENUM('AL_DIA', 'MOROSO') NOT NULL DEFAULT 'AL_DIA';

-- Clientes ya migrados con saldo pendiente quedan marcados como MOROSO
UPDATE clientes SET estado_cliente = 'MOROSO' WHERE deuda_historica > 0;
