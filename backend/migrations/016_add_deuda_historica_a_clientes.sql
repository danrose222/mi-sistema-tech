-- Migración 016: deuda histórica de clientes migrados de sistemas anteriores
-- (cuadernos/planillas), y una tabla genérica de movimientos de caja para
-- registrar ingresos que no son ventas (ej. cobro de esa deuda) sin
-- mezclarlos con `pedidos`, que representa exclusivamente ventas reales.

ALTER TABLE clientes
  ADD COLUMN deuda_historica DECIMAL(10,2) NOT NULL DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS caja_movimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NULL,
  tipo ENUM('ingreso', 'egreso') NOT NULL DEFAULT 'ingreso',
  concepto VARCHAR(255) NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  usuario_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX (created_at)
) ENGINE=InnoDB;
