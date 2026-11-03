const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/productos');
// PNG de 1x1 px: alcanza para pasar el filtro de tipo de multer.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

describe('Carga masiva de fotos de productos', () => {
    let tokenAdmin;
    const archivosCreados = [];

    beforeEach(async () => {
        ({ token: tokenAdmin } = await global.crearUsuarioAdminYObtenerToken());
    });

    afterAll(() => {
        for (const url of archivosCreados) {
            fs.rmSync(path.join(UPLOADS_DIR, path.basename(url)), { force: true });
        }
    });

    it('Debería fallar con 401 sin token', async () => {
        const res = await request(app)
            .post('/api/productos/imagenes/masivo')
            .attach('imagenes', PNG, 'CEL-1_frente.png');
        expect(res.statusCode).toBe(401);
    });

    it('Debería asignar cada foto a su producto por SKU, en orden, y reportar las que no coinciden', async () => {
        const [r1] = await pool.query("INSERT INTO productos (nombre, sku, precio, stock) VALUES ('Cel 1', 'CEL-1', 1000, 1)");
        const [r10] = await pool.query("INSERT INTO productos (nombre, sku, precio, stock) VALUES ('Cel 10', 'CEL-10', 1000, 1)");
        await pool.query("INSERT INTO producto_imagenes (producto_id, imagen_url) VALUES (?, '/uploads/productos/vieja.png')", [r1.insertId]);

        const res = await request(app)
            .post('/api/productos/imagenes/masivo')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('imagenes', PNG, 'CEL-1_2_dorso.png')
            .attach('imagenes', PNG, 'CEL-1_1_frente.png')
            .attach('imagenes', PNG, 'CEL-10-1.png')
            .attach('imagenes', PNG, 'sin-sku.png');

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toEqual({ productos_actualizados: 2, imagenes_asignadas: 3, sin_producto: ['sin-sku.png'] });

        const [imgs1] = await pool.query('SELECT imagen_url FROM producto_imagenes WHERE producto_id = ? ORDER BY id', [r1.insertId]);
        const [imgs10] = await pool.query('SELECT imagen_url FROM producto_imagenes WHERE producto_id = ? ORDER BY id', [r10.insertId]);
        archivosCreados.push(...imgs1.map((i) => i.imagen_url), ...imgs10.map((i) => i.imagen_url));

        // Reemplaza la foto vieja y "CEL-10-1" no se confunde con el SKU "CEL-1".
        expect(imgs1).toHaveLength(2);
        expect(imgs1.some((i) => i.imagen_url.endsWith('vieja.png'))).toBe(false);
        expect(imgs10).toHaveLength(1);
        for (const { imagen_url } of [...imgs1, ...imgs10]) {
            expect(fs.existsSync(path.join(UPLOADS_DIR, path.basename(imagen_url)))).toBe(true);
        }
    });

    it('Debería fallar con 400 si no se adjunta ninguna imagen', async () => {
        const res = await request(app)
            .post('/api/productos/imagenes/masivo')
            .set('Authorization', `Bearer ${tokenAdmin}`);
        expect(res.statusCode).toBe(400);
    });
});
