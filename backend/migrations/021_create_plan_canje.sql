-- Plan Canje: el cliente entrega un equipo usado como parte de pago para
-- llevarse otro equipo. La mayoría de los contactos llegan por WhatsApp, así
-- que el admin carga el registro a mano y lo va actualizando a medida que
-- avanza la operación (tasación, aceptación, uso del saldo en una compra).
CREATE TABLE IF NOT EXISTS plan_canje (
  id INT AUTO_INCREMENT PRIMARY KEY,

  cliente_nombre VARCHAR(200) NOT NULL,
  cliente_telefono VARCHAR(50) NOT NULL,
  cliente_dni VARCHAR(20) DEFAULT NULL,

  equipo_marca VARCHAR(100) NOT NULL,
  equipo_modelo VARCHAR(150) NOT NULL,
  equipo_capacidad VARCHAR(50) DEFAULT NULL,
  equipo_estado_general ENUM('excelente','bueno','regular','malo') NOT NULL DEFAULT 'bueno',

  -- Monto a favor del cliente. Queda NULL hasta que se tasa el equipo
  -- (el backend exige un valor > 0 antes de permitir avanzar el estado a
  -- 'tasado' o más allá, ver planCanjeController.js).
  valor_tasado DECIMAL(12,2) DEFAULT NULL,

  estado ENUM('pendiente_revision','tasado','aceptado','rechazado','completado')
    NOT NULL DEFAULT 'pendiente_revision',

  -- Pedido en el que efectivamente se usó el saldo a favor. NULL hasta que
  -- la operación llega a 'completado'. ON DELETE SET NULL: si el pedido se
  -- borra, el historial del canje se conserva (no tiene sentido perder el
  -- registro de que el cliente entregó un equipo).
  pedido_id INT DEFAULT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL,
  INDEX (estado)
) ENGINE=InnoDB;
