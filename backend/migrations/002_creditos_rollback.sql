-- Rollback de Migración 002: Sistema de créditos y cuotas
-- Eliminar las tablas en orden inverso a su creación para evitar errores de llaves foráneas

DROP TABLE IF EXISTS cuentas_corrientes;
DROP TABLE IF EXISTS cuotas;
DROP TABLE IF EXISTS creditos;
