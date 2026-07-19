const request = require('supertest');
const ExcelJS = require('exceljs');
const app = require('../../src/app');
const pool = require('../../src/config/database');

async function construirExcel(headers, filas) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Productos');
    worksheet.addRow(headers);
    filas.forEach((fila) => worksheet.addRow(fila));
    return workbook.xlsx.writeBuffer();
}

describe('Importación de productos desde Excel', () => {
    let tokenAdmin;

    beforeEach(async () => {
        const adminData = await global.crearUsuarioAdminYObtenerToken();
        tokenAdmin = adminData.token;
    });

    it('Debería fallar con 401 sin token', async () => {
        const buffer = await construirExcel(['nombre', 'precio'], [['Producto Test', 1000]]);
        const res = await request(app)
            .post('/api/productos/importar')
            .attach('archivo', buffer, 'productos.xlsx');
        expect(res.statusCode).toBe(401);
    });

    it('Debería importar productos válidos correctamente', async () => {
        const buffer = await construirExcel(
            ['nombre', 'sku', 'barcode', 'precio', 'stock', 'descripcion', 'requiere_imei'],
            [
                ['Samsung Galaxy S25', 'IMP-SAM-S25', '7790000000001', 850000, 5, 'Celular gama alta', 'SI'],
                ['Cable HDMI 2M', 'IMP-CAB-HDMI', '', 8000, 20, '', 'NO']
            ]
        );

        const res = await request(app)
            .post('/api/productos/importar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('archivo', buffer, 'productos.xlsx');

        expect(res.statusCode).toBe(201);
        expect(res.body.data.creados).toBe(2);

        const [productos] = await pool.query(
            'SELECT nombre, sku, precio, stock, requiere_imei FROM productos WHERE sku IN (?, ?) ORDER BY sku',
            ['IMP-CAB-HDMI', 'IMP-SAM-S25']
        );
        expect(productos).toHaveLength(2);
        expect(productos[0].nombre).toBe('Cable HDMI 2M');
        expect(Number(productos[0].precio)).toBe(8000);
        expect(productos[0].requiere_imei).toBe(0);
        expect(productos[1].nombre).toBe('Samsung Galaxy S25');
        expect(productos[1].requiere_imei).toBe(1);
    });

    it('No debería importar nada si alguna fila tiene el nombre vacío (todo o nada)', async () => {
        const buffer = await construirExcel(
            ['nombre', 'precio'],
            [
                ['Producto Válido', 1000],
                ['', 2000]
            ]
        );

        const res = await request(app)
            .post('/api/productos/importar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('archivo', buffer, 'productos.xlsx');

        expect(res.statusCode).toBe(400);
        expect(res.body.errores).toHaveLength(1);
        expect(res.body.errores[0].fila).toBe(3);

        const [productos] = await pool.query('SELECT id FROM productos WHERE nombre = ?', ['Producto Válido']);
        expect(productos).toHaveLength(0);
    });

    it('Debería fallar con 400 si el precio no es un número válido', async () => {
        const buffer = await construirExcel(['nombre', 'precio'], [['Producto Precio Malo', 'no-es-numero']]);
        const res = await request(app)
            .post('/api/productos/importar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('archivo', buffer, 'productos.xlsx');

        expect(res.statusCode).toBe(400);
        expect(res.body.errores[0].motivo).toMatch(/precio/i);
    });

    it('Debería fallar con 400 si hay un SKU duplicado dentro del mismo archivo', async () => {
        const buffer = await construirExcel(
            ['nombre', 'sku', 'precio'],
            [
                ['Producto A', 'SKU-DUP', 1000],
                ['Producto B', 'SKU-DUP', 2000]
            ]
        );
        const res = await request(app)
            .post('/api/productos/importar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('archivo', buffer, 'productos.xlsx');

        expect(res.statusCode).toBe(400);
        expect(res.body.errores[0].motivo).toMatch(/sku/i);
    });

    it('Debería fallar con 400 si el SKU ya existe en la base de datos', async () => {
        await pool.query(
            'INSERT INTO productos (nombre, sku, precio, stock) VALUES (?, ?, ?, ?)',
            ['Producto Existente', 'SKU-YA-EXISTE', 5000, 1]
        );

        const buffer = await construirExcel(['nombre', 'sku', 'precio'], [['Producto Nuevo', 'SKU-YA-EXISTE', 1000]]);
        const res = await request(app)
            .post('/api/productos/importar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('archivo', buffer, 'productos.xlsx');

        expect(res.statusCode).toBe(400);
        expect(res.body.errores[0].motivo).toMatch(/sku/i);
    });

    it('Debería fallar con 400 si falta la columna precio', async () => {
        const buffer = await construirExcel(['nombre'], [['Producto Sin Precio']]);
        const res = await request(app)
            .post('/api/productos/importar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('archivo', buffer, 'productos.xlsx');

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/precio/i);
    });

    it('Debería fallar con 400 si el archivo no es un .xlsx', async () => {
        const res = await request(app)
            .post('/api/productos/importar')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .attach('archivo', Buffer.from('esto no es un excel'), 'productos.txt');

        expect(res.statusCode).toBe(400);
    });

    it('Debería descargar la plantilla como un .xlsx válido', async () => {
        const res = await request(app)
            .get('/api/productos/importar/plantilla')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .responseType('blob');

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('spreadsheetml');

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(res.body);
        const worksheet = workbook.worksheets[0];
        const headerValues = worksheet.getRow(1).values.filter(Boolean);
        expect(headerValues).toContain('nombre');
        expect(headerValues).toContain('precio');
    });
});
