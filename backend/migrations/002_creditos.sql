-- Migración 002: Sistema de créditos y cuotas

-- Tabla para gestionar los créditos de los clientes
CREATE TABLE IF NOT EXISTS creditos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  pedido_id INT NULL,
  monto_total DECIMAL(12,2) NOT NULL,
  cantidad_cuotas INT NOT NULL,
  frecuencia ENUM('semanal','mensual') NOT NULL,
  monto_cuota DECIMAL(12,2) NOT NULL,
  fecha_primera_cuota DATE NOT NULL,
  estado ENUM('activo','moroso','liquidado','cancelado') DEFAULT 'activo',
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL,
  INDEX (estado),
  INDEX (cliente_id)
) ENGINE=InnoDB;

-- Tabla para gestionar las cuotas de cada crédito
CREATE TABLE IF NOT EXISTS cuotas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  credito_id INT NOT NULL,
  numero INT NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago DATE NULL,
  estado ENUM('pendiente','pagada','vencida','parcial') DEFAULT 'pendiente',
  monto_pagado DECIMAL(12,2) DEFAULT 0,
  pago_id INT NULL,
  UNIQUE KEY (credito_id, numero),
  FOREIGN KEY (credito_id) REFERENCES creditos(id) ON DELETE CASCADE,
  FOREIGN KEY (pago_id) REFERENCES pagos(id) ON DELETE SET NULL,
  INDEX (estado),
  INDEX (fecha_vencimiento)
) ENGINE=InnoDB;

-- Tabla para gestionar las cuentas corrientes de los clientes
CREATE TABLE IF NOT EXISTS cuentas_corrientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  tipo ENUM('venta','pago','ajuste','interes','anulacion') NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  saldo_resultante DECIMAL(12,2) NOT NULL,
  referencia_tipo VARCHAR(50) NULL,
  referencia_id INT NULL,
  descripcion VARCHAR(255) NULL,
  usuario_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX (cliente_id),
  INDEX (created_at)
) ENGINE=InnoDB;
