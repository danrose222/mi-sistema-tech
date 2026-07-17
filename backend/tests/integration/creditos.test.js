const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

describe('Módulo de Créditos Integración', () => {
    let tokenAdmin;
    let clienteId;

    beforeEach(async () => {
        const adminData = await global.crearUsuarioAdminYObtenerToken();
        tokenAdmin = adminData.token;
        clienteId = await global.crearClienteHelper('Juan Pérez');
    });

    describe('POST /api/creditos', () => {
        it('Debería crear un crédito con 6 cuotas mensuales', async () => {
            const data = {
                clienteId,
                montoTotal: 120000,
                cantidadCuotas: 6,
                frecuencia: 'mensual',
                fechaPrimeraCuota: new Date(Date.now() + 86400000).toISOString().split('T')[0] // mañana
            };

            const res = await request(app)
                .post('/api/creditos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send(data);

            if (res.statusCode !== 201) {
                throw new Error("HTTP " + res.statusCode + " " + JSON.stringify(res.body));
            }
            expect(res.statusCode).toBe(201);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.monto_total).toBe(120000);
            expect(res.body.data.cuotas).toHaveLength(6);
            
            // Validar monto de cada cuota
            expect(parseFloat(res.body.data.cuotas[0].monto)).toBe(20000);
        });

        it('Debería crear un crédito con 12 cuotas semanales', async () => {
            const data = {
                clienteId,
                montoTotal: 60000,
                cantidadCuotas: 12,
                frecuencia: 'semanal',
                fechaPrimeraCuota: new Date(Date.now() + 86400000).toISOString().split('T')[0]
            };

            const res = await request(app)
                .post('/api/creditos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send(data);

            expect(res.statusCode).toBe(201);
            expect(res.body.data.cuotas).toHaveLength(12);
            expect(parseFloat(res.body.data.cuotas[0].monto)).toBe(5000);
        });

        it('Debería fallar con Error 404 si el cliente no existe', async () => {
            const data = {
                clienteId: 9999, // no existe
                montoTotal: 10000,
                cantidadCuotas: 3,
                frecuencia: 'mensual',
                fechaPrimeraCuota: new Date().toISOString()
            };

            const res = await request(app)
                .post('/api/creditos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send(data);

            expect(res.statusCode).toBe(404);
        });

        it('Debería fallar con Error 400 si monto_total <= 0', async () => {
            const data = {
                clienteId,
                montoTotal: 0,
                cantidadCuotas: 3,
                frecuencia: 'mensual',
                fechaPrimeraCuota: new Date().toISOString()
            };

            const res = await request(app)
                .post('/api/creditos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send(data);

            expect(res.statusCode).toBe(400);
        });

        it('Debería fallar con Error 400 si cantidad_cuotas fuera de rango', async () => {
            const data = {
                clienteId,
                montoTotal: 10000,
                cantidadCuotas: 50, // > 48
                frecuencia: 'mensual',
                fechaPrimeraCuota: new Date().toISOString()
            };

            const res = await request(app)
                .post('/api/creditos')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send(data);

            expect(res.statusCode).toBe(400);
        });

        it('Debería fallar con Error 401 sin token', async () => {
            const res = await request(app)
                .post('/api/creditos')
                .send({ clienteId, montoTotal: 1000, cantidadCuotas: 3, frecuencia: 'mensual', fechaPrimeraCuota: new Date().toISOString() });

            expect(res.statusCode).toBe(401);
        });

        it('Debería fallar con Error 403 si usuario no es admin o autorizado', async () => {
            const jwt = require('jsonwebtoken');
            // Token falso o de rol no permitido
            const userToken = jwt.sign({ id: 1, role: 'empleado_base' }, process.env.JWT_SECRET || 'secret_test', { expiresIn: '1h' });
            
            const res = await request(app)
                .post('/api/creditos')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ clienteId, montoTotal: 1000, cantidadCuotas: 3, frecuencia: 'mensual', fechaPrimeraCuota: new Date().toISOString() });

            expect(res.statusCode).toBe(403);
        });
    });

    describe('POST /api/creditos/:id/cuotas/:cuotaId/pagar', () => {
        let credito;

        beforeEach(async () => {
            const data = {
                clienteId,
                montoTotal: 30000,
                cantidadCuotas: 3,
                frecuencia: 'mensual',
                fechaPrimeraCuota: new Date(Date.now() + 86400000).toISOString().split('T')[0]
            };
            const res = await request(app).post('/api/creditos').set('Authorization', `Bearer ${tokenAdmin}`).send(data);
            const resDetalle = await request(app).get(`/api/creditos/${res.body.data.id}`).set('Authorization', `Bearer ${tokenAdmin}`);
            credito = resDetalle.body.data;
        });

        it('Debería registrar un pago completo de la cuota', async () => {
            const cuotaId = credito.cuotas[0].id;
            const res = await request(app)
                .post(`/api/creditos/${credito.id}/cuotas/${cuotaId}/pagar`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto: 10000 }); // Monto exacto de la cuota (30000/3)
            if (res.statusCode !== 200) {
                console.log('RES ERROR:', res.body);
            }
            expect(res.statusCode).toBe(200);
            expect(res.body.data.estadoCuota).toBe('pagada');
        });

        it('Debería registrar un pago parcial', async () => {
            const cuotaId = credito.cuotas[0].id;
            const res = await request(app)
                .post(`/api/creditos/${credito.id}/cuotas/${cuotaId}/pagar`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto: 5000 }); // Pago parcial

            expect(res.statusCode).toBe(200);
        });

        it('Debería dar Error 409 si la cuota ya está pagada totalmente', async () => {
            const cuotaId = credito.cuotas[0].id;
            // Pagar primera vez
            await request(app).post(`/api/creditos/${credito.id}/cuotas/${cuotaId}/pagar`)
                .set('Authorization', `Bearer ${tokenAdmin}`).send({ monto: 10000 });

            // Intentar pagar de nuevo
            const res2 = await request(app)
                .post(`/api/creditos/${credito.id}/cuotas/${cuotaId}/pagar`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto: 1000 });

            expect(res2.statusCode).toBe(409); // Conflict - Ya pagada
        });

        it('Debería dar Error 409 si el monto supera el saldo restante de la cuota', async () => {
            const cuotaId = credito.cuotas[0].id;
            const res = await request(app)
                .post(`/api/creditos/${credito.id}/cuotas/${cuotaId}/pagar`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto: 20000 }); // Supera los 10000

            expect(res.statusCode).toBe(409);
        });

        it('Debería dar Error 404 si la cuota no existe', async () => {
            const res = await request(app)
                .post(`/api/creditos/${credito.id}/cuotas/99999/pagar`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto: 1000 });

            expect(res.statusCode).toBe(404);
        });

        it('Debería reactivar a "activo" un crédito moroso cuando ya no quedan cuotas vencidas', async () => {
            // Simular el escenario que deja el cron marcarCuotasVencidas: la primera
            // cuota vencida y el crédito marcado como moroso, con 2 cuotas futuras
            // todavía pendientes (no vencidas).
            const connection = await pool.getConnection();
            await connection.query('UPDATE cuotas SET estado = "vencida" WHERE id = ?', [credito.cuotas[0].id]);
            await connection.query('UPDATE creditos SET estado = "moroso" WHERE id = ?', [credito.id]);
            connection.release();

            const cuotaId = credito.cuotas[0].id;
            const res = await request(app)
                .post(`/api/creditos/${credito.id}/cuotas/${cuotaId}/pagar`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto: 10000 });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.creditoReactivado).toBe(true);

            const resDetalle = await request(app)
                .get(`/api/creditos/${credito.id}`)
                .set('Authorization', `Bearer ${tokenAdmin}`);
            expect(resDetalle.body.data.estado).toBe('activo');
        });

        it('No debería reactivar el crédito si todavía quedan otras cuotas vencidas', async () => {
            const connection = await pool.getConnection();
            await connection.query('UPDATE cuotas SET estado = "vencida" WHERE credito_id = ?', [credito.id]);
            await connection.query('UPDATE creditos SET estado = "moroso" WHERE id = ?', [credito.id]);
            connection.release();

            const cuotaId = credito.cuotas[0].id;
            const res = await request(app)
                .post(`/api/creditos/${credito.id}/cuotas/${cuotaId}/pagar`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ monto: 10000 });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.creditoReactivado).toBe(false);

            const resDetalle = await request(app)
                .get(`/api/creditos/${credito.id}`)
                .set('Authorization', `Bearer ${tokenAdmin}`);
            expect(resDetalle.body.data.estado).toBe('moroso');
        });
    });

    describe('GET /api/creditos/:id', () => {
        let credito;
        beforeEach(async () => {
            const data = {
                clienteId, montoTotal: 10000, cantidadCuotas: 2, frecuencia: 'semanal', fechaPrimeraCuota: new Date(Date.now() + 86400000).toISOString().split('T')[0]
            };
            const res = await request(app).post('/api/creditos').set('Authorization', `Bearer ${tokenAdmin}`).send(data);
            credito = res.body.data;
        });

        it('Debería retornar un crédito con sus cuotas', async () => {
            const res = await request(app)
                .get(`/api/creditos/${credito.id}`)
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.id).toBe(credito.id);
            expect(res.body.data.cuotas).toBeDefined();
            expect(res.body.data.cuotas).toHaveLength(2);
        });

        it('Debería dar Error 404 si el crédito no existe', async () => {
            const res = await request(app)
                .get(`/api/creditos/99999`)
                .set('Authorization', `Bearer ${tokenAdmin}`);

            expect(res.statusCode).toBe(404);
        });
    });
});
