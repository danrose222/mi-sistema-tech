-- Migración 009: Método de pago del pedido
-- Hasta ahora el checkout redirigía siempre a Mercado Pago. Con acuerdos
-- manuales (transferencia/efectivo) hay que guardar cuál eligió el cliente
-- para saber si corresponde generar preferencia de MP o solo dejar el
-- pedido pendiente de un acuerdo por fuera de la pasarela.

ALTER TABLE pedidos
  ADD COLUMN metodo_pago ENUM('mercado_pago','transferencia','efectivo_local') NOT NULL DEFAULT 'mercado_pago';
