-- costo_envio NO se agrega acá: ya existe desde la migración 019 (regla de
-- envío gratis >= $100.000). El resto son campos nuevos para la integración
-- con Andreani (todavía en pausa esperando credenciales, ver
-- andreani.service.js), nulos hasta que se cree el envío real.
ALTER TABLE pedidos
  ADD COLUMN codigo_postal_destino VARCHAR(10) NULL DEFAULT NULL,
  ADD COLUMN metodo_envio VARCHAR(50) NULL DEFAULT NULL,
  ADD COLUMN andreani_tracking_id VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN url_etiqueta VARCHAR(500) NULL DEFAULT NULL;
