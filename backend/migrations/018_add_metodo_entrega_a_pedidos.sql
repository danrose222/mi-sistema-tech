ALTER TABLE pedidos
  ADD COLUMN metodo_entrega ENUM('retiro_local', 'envio_domicilio') NOT NULL DEFAULT 'retiro_local',
  ADD COLUMN direccion_envio TEXT NULL DEFAULT NULL;
