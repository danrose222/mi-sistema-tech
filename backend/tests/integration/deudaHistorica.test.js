const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

describe('Deuda histórica de clientes', () => {
    let tokenAdmin;
    let clienteId;

    beforeEach(async () => {
        const adminData = await global.crearUsuarioAdminYObtenerToken();
        tokenAdmin = adminData.token;
        clienteId = await global.crearClienteHelper('Cliente Deuda Historica');
    });

    describe('Bloqueo de créditos nuevos con deuda histórica pendiente', () => {
        it('Debería fallar con 403 al intentar otorgar un crédito si el cliente tiene deuda histórica', async () => {
            await pool.query('UPDATE clientes SET deuda_historica = ? WHERE id = ?', [15000, clienteId]);

            const res = await request(app)
                .post('/api/creditos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    clienteId,
                    montoTotal: 50000,
                    cantidadCuotas: 3,
                    frecuencia: 'mensual',
                    fechaPrimeraCuota: new Date(Date.now() + 86400000).toISOString().split('T')[0]
                });

            expect(res.statusCode).toBe(403);
            expect(res.body.error).toBe('El cliente registra una deuda histórica. Debe cancelarla antes de solicitar un nuevo crédito.');
        });

        it('Debería permitir otorgar un crédito normalmente si deuda_historica es 0', async () => {
            const res = await request(app)
                .post('/api/creditos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    clienteId,
                    montoTotal: 50000,
                    cantidadCuotas: 3,
                    frecuencia: 'mensual',
                    fechaPrimeraCuota: new Date(Date.now() + 86400000).toISOString().split('T')[0]
                });

            expect(res.statusCode).toBe(201);
        });

        it('Debería fallar con 403 al intentar una venta a crédito del POS si el cliente tiene deuda histórica', async () => {
            await pool.query('UPDATE clientes SET deuda_historica = ? WHERE id = ?', [5000, clienteId]);

            const [p] = await pool.query(
                'INSERT INTO productos (nombre, sku, precio, stock) VALUES (?, ?, ?, ?)',
                ['Producto Deuda Test', 'sku-deuda', 10000, 5]
            );

            const res = await request(app)
                .post('/api/pedidos/pos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    items: [{ producto_id: p.insertId, cantidad: 1 }],
                    metodo_pago: 'credito_local',
                    credito: {
                        clienteId,
                        cantidadCuotas: 3,
                        frecuencia: 'mensual',
                        fechaPrimeraCuota: new Date(Date.now() + 86400000).toISOString().split('T')[0]
                    }
                });

            expect(res.statusCode).toBe(400); // crearVentaPos envuelve el error del service con statusCode 400
            expect(res.body.error).toMatch(/deuda histórica/i);

            // El stock no debe haberse tocado: la venta se abortó antes del commit.
            const [productos] = await pool.query('SELECT stock FROM productos WHERE id = ?', [p.insertId]);
            expect(productos[0].stock).toBe(5);
        });
    });

    describe('PUT /api/clientes/:id/pagar-deuda-historica', () => {
        beforeEach(async () => {
            await pool.query('UPDATE clientes SET deuda_historica = ? WHERE id = ?', [10000, clienteId]);
        });

        it('Debería fallar con 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda-historica`)
                .send({ monto_pagado: 5000 });
            expect(res.statusCode).toBe(401);
        });

        it('Debería registrar un pago parcial y descontarlo de la deuda', async () => {
            const res = await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda-historica`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 4000 });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.deuda_historica).toBe(6000);

            const [clientes] = await pool.query('SELECT deuda_historica FROM clientes WHERE id = ?', [clienteId]);
            expect(Number(clientes[0].deuda_historica)).toBe(6000);
        });

        it('Debería dejar la deuda en 0 con un pago total y permitir otorgar un crédito después', async () => {
            const pago = await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda-historica`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 10000 });

            expect(pago.statusCode).toBe(200);
            expect(pago.body.data.deuda_historica).toBe(0);

            const credito = await request(app)
                .post('/api/creditos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({
                    clienteId,
                    montoTotal: 30000,
                    cantidadCuotas: 3,
                    frecuencia: 'mensual',
                    fechaPrimeraCuota: new Date(Date.now() + 86400000).toISOString().split('T')[0]
                });
            expect(credito.statusCode).toBe(201);
        });

        it('Debería fallar con 400 si monto_pagado es cero o negativo', async () => {
            const res = await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda-historica`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 0 });
            expect(res.statusCode).toBe(400);
        });

        it('Debería fallar con 404 si el cliente no existe', async () => {
            const res = await request(app)
                .put('/api/clientes/999999/pagar-deuda-historica')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 1000 });
            expect(res.statusCode).toBe(404);
        });

        it('Debería fallar con 409 si el cliente no tiene deuda histórica pendiente', async () => {
            const clienteSinDeuda = await global.crearClienteHelper('Cliente Sin Deuda');
            const res = await request(app)
                .put(`/api/clientes/${clienteSinDeuda}/pagar-deuda-historica`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 1000 });
            expect(res.statusCode).toBe(409);
        });

        it('Debería fallar con 409 si el monto pagado supera la deuda pendiente', async () => {
            const res = await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda-historica`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 99999 });
            expect(res.statusCode).toBe(409);
        });

        it('Debería registrar el ingreso en caja_movimientos con el concepto correcto', async () => {
            await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda-historica`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 3000 });

            const [movimientos] = await pool.query(
                'SELECT * FROM caja_movimientos WHERE cliente_id = ?',
                [clienteId]
            );
            expect(movimientos).toHaveLength(1);
            expect(movimientos[0].tipo).toBe('ingreso');
            expect(movimientos[0].concepto).toBe('Ingreso por cobro de deuda histórica');
            expect(Number(movimientos[0].monto)).toBe(3000);
        });

        it('Debería reflejarse en el reporte de Caja Diaria (otrosIngresos y totalGeneral)', async () => {
            await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda-historica`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 4000 });

            const res = await request(app)
                .get('/api/reportes/caja-diaria')
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.otrosIngresos).toBe(4000);
            expect(res.body.data.totalGeneral).toBe(4000); // no hubo otras ventas hoy
        });
    });
});
