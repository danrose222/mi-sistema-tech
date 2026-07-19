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
        it('Debería fallar con 403 al intentar otorgar un crédito si el cliente está MOROSO', async () => {
            await pool.query('UPDATE clientes SET deuda_historica = ?, estado_cliente = ? WHERE id = ?', [15000, 'MOROSO', clienteId]);

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
            expect(res.body.error).toBe(
                'Operación denegada. El cliente está catalogado como MOROSO por una deuda antigua de $15000. Debe regularizar su situación.'
            );
        });

        it('Debería permitir otorgar un crédito normalmente si el cliente está AL_DIA', async () => {
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

        it('Debería fallar con 403 al intentar una venta a crédito del POS si el cliente está MOROSO', async () => {
            await pool.query('UPDATE clientes SET deuda_historica = ?, estado_cliente = ? WHERE id = ?', [5000, 'MOROSO', clienteId]);

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
            expect(res.body.error).toMatch(/MOROSO/i);

            // El stock no debe haberse tocado: la venta se abortó antes del commit.
            const [productos] = await pool.query('SELECT stock FROM productos WHERE id = ?', [p.insertId]);
            expect(productos[0].stock).toBe(5);
        });
    });

    describe('PUT /api/clientes/:id/pagar-deuda', () => {
        beforeEach(async () => {
            await pool.query('UPDATE clientes SET deuda_historica = ?, estado_cliente = ? WHERE id = ?', [10000, 'MOROSO', clienteId]);
        });

        it('Debería fallar con 401 sin token', async () => {
            const res = await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda`)
                .send({ monto_pagado: 5000 });
            expect(res.statusCode).toBe(401);
        });

        it('Debería registrar un pago parcial, descontarlo de la deuda y mantener estado_cliente en MOROSO', async () => {
            const res = await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 4000 });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.deuda_historica).toBe(6000);
            expect(res.body.data.estado_cliente).toBe('MOROSO');

            const [clientes] = await pool.query('SELECT deuda_historica, estado_cliente FROM clientes WHERE id = ?', [clienteId]);
            expect(Number(clientes[0].deuda_historica)).toBe(6000);
            expect(clientes[0].estado_cliente).toBe('MOROSO');
        });

        it('Debería dejar la deuda en 0, pasar estado_cliente a AL_DIA y permitir otorgar un crédito después', async () => {
            const pago = await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 10000 });

            expect(pago.statusCode).toBe(200);
            expect(pago.body.data.deuda_historica).toBe(0);
            expect(pago.body.data.estado_cliente).toBe('AL_DIA');

            const [clientes] = await pool.query('SELECT estado_cliente FROM clientes WHERE id = ?', [clienteId]);
            expect(clientes[0].estado_cliente).toBe('AL_DIA');

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
                .put(`/api/clientes/${clienteId}/pagar-deuda`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 0 });
            expect(res.statusCode).toBe(400);
        });

        it('Debería fallar con 404 si el cliente no existe', async () => {
            const res = await request(app)
                .put('/api/clientes/999999/pagar-deuda')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 1000 });
            expect(res.statusCode).toBe(404);
        });

        it('Debería fallar con 409 si el cliente no tiene deuda histórica pendiente', async () => {
            const clienteSinDeuda = await global.crearClienteHelper('Cliente Sin Deuda');
            const res = await request(app)
                .put(`/api/clientes/${clienteSinDeuda}/pagar-deuda`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 1000 });
            expect(res.statusCode).toBe(409);
        });

        it('Debería fallar con 409 si el monto pagado supera la deuda pendiente', async () => {
            const res = await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 99999 });
            expect(res.statusCode).toBe(409);
        });

        it('Debería registrar el ingreso en caja_movimientos con el concepto correcto', async () => {
            await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto_pagado: 3000 });

            const [movimientos] = await pool.query(
                'SELECT * FROM caja_movimientos WHERE cliente_id = ?',
                [clienteId]
            );
            expect(movimientos).toHaveLength(1);
            expect(movimientos[0].tipo).toBe('ingreso');
            expect(movimientos[0].concepto).toBe('Ingreso por deuda histórica');
            expect(Number(movimientos[0].monto)).toBe(3000);
        });

        it('Debería reflejarse en el reporte de Caja Diaria (otrosIngresos y totalGeneral)', async () => {
            await request(app)
                .put(`/api/clientes/${clienteId}/pagar-deuda`)
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

    describe('Alta y edición de clientes con estado_cliente', () => {
        it('Debería crear un cliente con estado_cliente AL_DIA por defecto si no se envía', async () => {
            const res = await request(app)
                .post('/api/clientes')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ nombre: 'Cliente Nuevo', telefono: '123456789' });

            expect(res.statusCode).toBe(201);
            expect(res.body.data.estado_cliente).toBe('AL_DIA');
            expect(Number(res.body.data.deuda_historica)).toBe(0);
        });

        it('Debería crear un cliente MOROSO con su deuda_historica', async () => {
            const res = await request(app)
                .post('/api/clientes')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ nombre: 'Cliente Migrado', telefono: '123456789', estado_cliente: 'MOROSO', deuda_historica: 8000 });

            expect(res.statusCode).toBe(201);
            expect(res.body.data.estado_cliente).toBe('MOROSO');
            expect(Number(res.body.data.deuda_historica)).toBe(8000);
        });

        it('Debería fallar con 400 si estado_cliente es MOROSO pero deuda_historica es 0', async () => {
            const res = await request(app)
                .post('/api/clientes')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ nombre: 'Cliente Inválido', telefono: '123456789', estado_cliente: 'MOROSO', deuda_historica: 0 });

            expect(res.statusCode).toBe(400);
        });

        it('Debería forzar deuda_historica a 0 si estado_cliente es AL_DIA aunque se envíe un monto', async () => {
            const res = await request(app)
                .post('/api/clientes')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ nombre: 'Cliente Al Dia Con Monto', telefono: '123456789', estado_cliente: 'AL_DIA', deuda_historica: 5000 });

            expect(res.statusCode).toBe(201);
            expect(res.body.data.estado_cliente).toBe('AL_DIA');
            expect(Number(res.body.data.deuda_historica)).toBe(0);
        });

        it('Debería permitir editar un cliente para marcarlo MOROSO con su deuda', async () => {
            const res = await request(app)
                .put(`/api/clientes/${clienteId}`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ nombre: 'Cliente Deuda Historica', telefono: '123456789', estado_cliente: 'MOROSO', deuda_historica: 12000 });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.estado_cliente).toBe('MOROSO');
            expect(Number(res.body.data.deuda_historica)).toBe(12000);
        });
    });
});
