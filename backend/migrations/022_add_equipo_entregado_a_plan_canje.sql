-- Completa el ciclo del canje: además del equipo que el cliente ENTREGA
-- (columnas equipo_* ya existentes), ahora se registra qué se lleva a
-- cambio y cómo abona la diferencia de precio. Todo nullable porque estos
-- datos suelen definirse recién cuando el cliente ya decidió, no en el
-- primer contacto por WhatsApp.
ALTER TABLE plan_canje
  ADD COLUMN equipo_entregado_condicion ENUM('nuevo','usado') DEFAULT NULL,
  ADD COLUMN equipo_entregado_marca VARCHAR(100) DEFAULT NULL,
  ADD COLUMN equipo_entregado_modelo VARCHAR(150) DEFAULT NULL,
  ADD COLUMN condicion_pago_diferencia ENUM('efectivo','mercado_pago','transferencia','financiado') DEFAULT NULL;
