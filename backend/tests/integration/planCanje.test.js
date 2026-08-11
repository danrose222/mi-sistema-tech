const request = require('supertest');
const app = require('../../src/app');

function datosValidos(overrides = {}) {
    return {
        cliente_nombre: 'Juan Pérez',
        cliente_telefono: '+5493548000000',
        cliente_dni: '30111222',
        equipo_marca: 'Samsung',
        equipo_modelo: 'Galaxy S21',
        equipo_capacidad: '128GB',
        equipo_estado_general: 'bueno',
        ...overrides
    };
}

describe('Plan Canje (CRUD)', () => {
    let token;

    beforeEach(async () => {
        const adminData = await global.crearUsuarioAdminYObtenerToken();
        token = adminData.token;
    });

    it('Debería rechazar el acceso sin token', async () => {
        const res = await request(app).get('/api/plan-canje');
        expect(res.statusCode).toBe(401);
    });

    it('Debería rechazar la creación sin nombre de cliente', async () => {
        const res = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos({ cliente_nombre: '' }));
        expect(res.statusCode).toBe(400);
    });

    it('Debería rechazar la creación sin teléfono', async () => {
        const res = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos({ cliente_telefono: '' }));
        expect(res.statusCode).toBe(400);
    });

    it('Debería crear una operación válida en estado pendiente_revision por defecto', async () => {
        const res = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos());

        expect(res.statusCode).toBe(201);
        expect(res.body.data.estado).toBe('pendiente_revision');
        expect(res.body.data.valor_tasado).toBeNull();
    });

    it('Debería rechazar pasar a estado "tasado" sin un valor_tasado válido', async () => {
        const creado = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos());

        const res = await request(app)
            .put(`/api/plan-canje/${creado.body.data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos({ estado: 'tasado' }));

        expect(res.statusCode).toBe(400);
    });

    it('Debería permitir pasar a "tasado" cargando un valor_tasado > 0', async () => {
        const creado = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos());

        const res = await request(app)
            .put(`/api/plan-canje/${creado.body.data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos({ estado: 'tasado', valor_tasado: 150000 }));

        expect(res.statusCode).toBe(200);
        expect(res.body.data.estado).toBe('tasado');
        expect(Number(res.body.data.valor_tasado)).toBe(150000);
    });

    it('Debería filtrar el listado por estado', async () => {
        const a = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos({ cliente_nombre: 'Cliente Pendiente' }));

        const b = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos({ cliente_nombre: 'Cliente Tasado' }));

        await request(app)
            .put(`/api/plan-canje/${b.body.data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos({ cliente_nombre: 'Cliente Tasado', estado: 'tasado', valor_tasado: 90000 }));

        const res = await request(app)
            .get('/api/plan-canje?estado=tasado')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.every((registro) => registro.estado === 'tasado')).toBe(true);
        expect(res.body.data.some((registro) => registro.id === b.body.data.id)).toBe(true);
        expect(res.body.data.some((registro) => registro.id === a.body.data.id)).toBe(false);
    });

    it('Debería aceptar un valor_tasado cargado desde pendiente_revision (cotización preliminar)', async () => {
        const res = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos({ valor_tasado: 100000 }));

        expect(res.statusCode).toBe(201);
        expect(res.body.data.estado).toBe('pendiente_revision');
        expect(Number(res.body.data.valor_tasado)).toBe(100000);
    });

    it('Debería rechazar un valor_tasado negativo', async () => {
        const res = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos({ valor_tasado: -500 }));

        expect(res.statusCode).toBe(400);
    });

    it('Debería guardar el equipo entregado y la condición de pago de la diferencia', async () => {
        const res = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos({
                equipo_entregado_condicion: 'nuevo',
                equipo_entregado_marca: 'Apple',
                equipo_entregado_modelo: 'iPhone 15',
                condicion_pago_diferencia: 'financiado'
            }));

        expect(res.statusCode).toBe(201);
        expect(res.body.data.equipo_entregado_condicion).toBe('nuevo');
        expect(res.body.data.equipo_entregado_marca).toBe('Apple');
        expect(res.body.data.equipo_entregado_modelo).toBe('iPhone 15');
        expect(res.body.data.condicion_pago_diferencia).toBe('financiado');
    });

    it('Debería rechazar una condicion_pago_diferencia inválida', async () => {
        const res = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos({ condicion_pago_diferencia: 'criptomonedas' }));

        expect(res.statusCode).toBe(400);
    });

    it('Debería eliminar una operación existente', async () => {
        const creado = await request(app)
            .post('/api/plan-canje')
            .set('Authorization', `Bearer ${token}`)
            .send(datosValidos());

        const res = await request(app)
            .delete(`/api/plan-canje/${creado.body.data.id}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);

        const consulta = await request(app)
            .get(`/api/plan-canje/${creado.body.data.id}`)
            .set('Authorization', `Bearer ${token}`);
        expect(consulta.statusCode).toBe(404);
    });
});
