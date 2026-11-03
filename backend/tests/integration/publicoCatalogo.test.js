const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

async function crearCategoria(nombre, slug, orden) {
    const [r] = await pool.query('INSERT INTO categorias (nombre, slug, orden) VALUES (?, ?, ?)', [nombre, slug, orden]);
    return r.insertId;
}

async function crearProducto(nombre, { categoriaId = null, destacado = 0, activo = 1 } = {}) {
    const [r] = await pool.query(
        'INSERT INTO productos (nombre, precio, stock, categoria_id, destacado, activo) VALUES (?, 1000, 1, ?, ?, ?)',
        [nombre, categoriaId, destacado, activo]
    );
    return r.insertId;
}

describe('Catálogo público: orden, categorías y destacados', () => {
    let celulares;
    let auriculares;

    beforeEach(async () => {
        celulares = await crearCategoria('Celulares', 'celulares', 1);
        auriculares = await crearCategoria('Auriculares', 'auriculares', 20);
        await crearCategoria('Teclados', 'teclados', 90); // sin productos
        await crearProducto('Auricular Aaa', { categoriaId: auriculares });
        await crearProducto('Celular Zzz', { categoriaId: celulares });
        await crearProducto('Celular Bbb', { categoriaId: celulares });
        await crearProducto('Auricular Destacado', { categoriaId: auriculares, destacado: 1 });
        await crearProducto('Sin Categoría');
        await crearProducto('Celular Inactivo', { categoriaId: celulares, activo: 0 });
    });

    it('Debería listar primero los destacados, después por orden de categoría y al final sin categoría', async () => {
        const res = await request(app).get('/api/publico/productos');

        expect(res.statusCode).toBe(200);
        expect(res.body.data.map((p) => p.nombre)).toEqual([
            'Auricular Destacado',
            'Celular Bbb',
            'Celular Zzz',
            'Auricular Aaa',
            'Sin Categoría'
        ]);
        const destacado = res.body.data[0];
        expect(destacado.destacado).toBe(true);
        expect(destacado.categoria_nombre).toBe('Auriculares');
        expect(destacado.categoria_slug).toBe('auriculares');
    });

    it('Debería filtrar por categoría usando el slug o el nombre', async () => {
        const porSlug = await request(app).get('/api/publico/productos').query({ categoria: 'celulares' });
        expect(porSlug.body.data.map((p) => p.nombre)).toEqual(['Celular Bbb', 'Celular Zzz']);
        expect(porSlug.body.total).toBe(2);

        const porNombre = await request(app).get('/api/publico/productos').query({ categoria: 'Auriculares' });
        expect(porNombre.body.total).toBe(2);
    });

    it('Debería devolver solo las categorías con productos activos, en su orden', async () => {
        const res = await request(app).get('/api/publico/categorias');

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toEqual([
            { id: celulares, nombre: 'Celulares', slug: 'celulares', total: 2 },
            { id: auriculares, nombre: 'Auriculares', slug: 'auriculares', total: 2 }
        ]);
    });
});
