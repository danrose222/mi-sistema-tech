-- Migración 014: venta a crédito desde el POS
-- 'credito_local' se suma como método de pago y 'financiado' como estado:
-- el pedido queda entregado (stock descontado) pero el dinero todavía no
-- ingresó a caja, así que NO puede reusar 'pagado' (Caja Diaria sumaría
-- una venta cuyo efectivo todavía no se cobró) ni 'pendiente' (el cron de
-- reservas de 48hs lo cancelaría y repondría el stock que ya se entregó).

ALTER TABLE pedidos
  MODIFY COLUMN metodo_pago ENUM('mercado_pago','transferencia','efectivo_local','efectivo_pos','credito_local') NOT NULL DEFAULT 'mercado_pago';

ALTER TABLE pedidos
  MODIFY COLUMN estado ENUM('pendiente','pagado','cancelado','enviado','reembolsado','financiado') DEFAULT 'pendiente';
