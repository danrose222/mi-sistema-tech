-- Migración 005: Historial crediticio del cliente
-- Se actualiza automáticamente a "Bueno"/"Excelente" cuando el cliente liquida
-- por completo un crédito (ver creditos.service.js -> pagarCuota).

ALTER TABLE clientes
  ADD COLUMN historial_crediticio VARCHAR(20) NOT NULL DEFAULT 'Normal';
