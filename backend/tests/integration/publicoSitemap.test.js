const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

async function crearProducto({ nombre, activo = 1 }) {
    const [result] = await pool.query(
        'INSERT INTO productos (nombre, precio, stock, activo) VALUES (?, ?, ?, ?)',
        [nombre, 1000, 5, activo]
    );
    return result.insertId;
}

describe('GET /api/publico/sitemap.xml', () => {
    it('Debería responder XML válido con las URLs estáticas aunque no haya productos', async () => {
        const res = await request(app).get('/api/publico/sitemap.xml');

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/xml/);
        expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(res.text).toContain('<urlset');
        expect(res.text).toContain('</loc>');
    });

    it('Debería incluir solo productos activos, con su slug', async () => {
        const idActivo = await crearProducto({ nombre: 'iPhone 15 Pro' });
        await crearProducto({ nombre: 'Producto Inactivo', activo: 0 });

        const res = await request(app).get('/api/publico/sitemap.xml');

        expect(res.statusCode).toBe(200);
        expect(res.text).toContain(`/producto/${idActivo}-iphone-15-pro`);
        expect(res.text).not.toContain('producto-inactivo');
    });
});
