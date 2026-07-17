-- Migración 013: DNI de cliente para el CRM unificado (buscador rápido + auto-registro web)
-- UNIQUE permite múltiples NULL (clientes históricos sin DNI cargado) pero impide
-- duplicar el mismo DNI en dos filas distintas.

ALTER TABLE clientes
  ADD COLUMN dni VARCHAR(20) NULL DEFAULT NULL AFTER nombre;

ALTER TABLE clientes
  ADD UNIQUE INDEX idx_clientes_dni (dni);
