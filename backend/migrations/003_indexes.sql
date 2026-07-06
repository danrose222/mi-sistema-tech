-- Migración 003: Índices para rendimiento
-- Índices para búsquedas frecuentes

CREATE INDEX idx_productos_slug ON productos(slug);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_creditos_cliente ON creditos(cliente_id);
CREATE INDEX idx_cuotas_credito_estado ON cuotas(credito_id, estado);
