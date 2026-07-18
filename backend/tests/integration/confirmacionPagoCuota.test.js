const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

jest.mock('../../src/services/whatsappService', () => ({
    enviarMensaje: jest.fn().mockResolvedValue({ messages: [{ id: 'wamid.test' }] }),
    enviarPlantilla: jest.fn().mockResolvedValue({ messages: [{ id: 'wamid.test' }] })
}));

const whatsappService = require('../../src/services/whatsappService');

describe('Confirmación de pago de cuota por WhatsApp', () => {
    let tokenAdmin;
    let clienteId;

    beforeEach(async () => {
        const adminData = await global.crearUsuarioAdminYObtenerToken();
        tokenAdmin = adminData.token;
        clienteId = await global.crearClienteHelper('Cliente WhatsApp');
        whatsappService.enviarMensaje.mockClear();
    });

    async function crearCreditoYCuotas({ montoTotal = 30000, cantidadCuotas = 3, productoNombre = null } = {}) {
        let productoId = null;
        if (productoNombre) {
            const [p] = await pool.query(
                'INSERT INTO productos (nombre, sku, precio, stock) VALUES (?, ?, ?, ?)',
                [productoNombre, `sku-${Date.now()}`, 1000, 10]
            );
            productoId = p.insertId;
        }

        const data = {
            clienteId,
            productoId: productoId || undefined,
            montoTotal,
            cantidadCuotas,
            frecuencia: 'mensual',
            fechaPrimeraCuota: new Date(Date.now() + 86400000).toISOString().split('T')[0]
        };
        const res = await request(app).post('/api/creditos').set('Authorization', `Bearer ${tokenAdmin}`).send(data);
        const detalle = await request(app).get(`/api/creditos/${res.body.data.id}`).set('Authorization', `Bearer ${tokenAdmin}`);
        return detalle.body.data;
    }

    it('Debería enviar la confirmación por WhatsApp cuando la cuota queda totalmente pagada', async () => {
        const credito = await crearCreditoYCuotas({ montoTotal: 36000, cantidadCuotas: 3, productoNombre: 'Samsung Galaxy S26 Ultra' });
        const cuotaId = credito.cuotas[0].id;

        const res = await request(app)
            .post(`/api/creditos/${credito.id}/cuotas/${cuotaId}/pagar`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ monto: 12000 });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.estadoCuota).toBe('pagada');

        expect(whatsappService.enviarMensaje).toHaveBeenCalledTimes(1);
        const args = whatsappService.enviarMensaje.mock.calls[0][0];
        expect(args.telefono).toBe('123456789');
        expect(args.mensaje).toContain('cuota 1/3');
        expect(args.mensaje).toContain('Samsung Galaxy S26 Ultra');
    });

    it('NO debería enviar confirmación cuando el pago es parcial', async () => {
        const credito = await crearCreditoYCuotas({ montoTotal: 30000, cantidadCuotas: 3 });
        const cuotaId = credito.cuotas[0].id;

        const res = await request(app)
            .post(`/api/creditos/${credito.id}/cuotas/${cuotaId}/pagar`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ monto: 5000 }); // la cuota es de 10000, esto es parcial

        expect(res.statusCode).toBe(200);
        expect(res.body.data.estadoCuota).toBe('parcial');
        expect(whatsappService.enviarMensaje).not.toHaveBeenCalled();
    });

    it('Debería avisar que el crédito se liquidó cuando la última cuota queda pagada', async () => {
        const credito = await crearCreditoYCuotas({ montoTotal: 20000, cantidadCuotas: 2 });

        // Pagar la primera cuota (no liquida el crédito todavía)
        await request(app)
            .post(`/api/creditos/${credito.id}/cuotas/${credito.cuotas[0].id}/pagar`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ monto: 10000 });
        whatsappService.enviarMensaje.mockClear();

        // Pagar la última cuota: debe liquidar el crédito
        const res = await request(app)
            .post(`/api/creditos/${credito.id}/cuotas/${credito.cuotas[1].id}/pagar`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ monto: 10000 });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.creditoLiquidado).toBe(true);

        expect(whatsappService.enviarMensaje).toHaveBeenCalledTimes(1);
        const args = whatsappService.enviarMensaje.mock.calls[0][0];
        expect(args.mensaje).toContain('cuota 2/2');
        expect(args.mensaje.toLowerCase()).toContain('completaste tu crédito');
    });

    it('NO debería fallar el pago si el cliente no tiene teléfono registrado (solo se omite el envío)', async () => {
        const [clienteSinTelefono] = await pool.query("INSERT INTO clientes (nombre, telefono) VALUES ('Sin Telefono', NULL)");
        const data = {
            clienteId: clienteSinTelefono.insertId,
            montoTotal: 10000,
            cantidadCuotas: 2,
            frecuencia: 'mensual',
            fechaPrimeraCuota: new Date(Date.now() + 86400000).toISOString().split('T')[0]
        };
        const creado = await request(app).post('/api/creditos').set('Authorization', `Bearer ${tokenAdmin}`).send(data);
        const detalle = await request(app).get(`/api/creditos/${creado.body.data.id}`).set('Authorization', `Bearer ${tokenAdmin}`);

        const res = await request(app)
            .post(`/api/creditos/${creado.body.data.id}/cuotas/${detalle.body.data.cuotas[0].id}/pagar`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ monto: 5000 });

        expect(res.statusCode).toBe(200);
        expect(whatsappService.enviarMensaje).not.toHaveBeenCalled();
    });

    it('NO debería fallar el pago si el envío de WhatsApp arroja un error (ej. API no configurada)', async () => {
        whatsappService.enviarMensaje.mockRejectedValueOnce(new Error('WhatsApp Business API no configurado'));

        const credito = await crearCreditoYCuotas({ montoTotal: 10000, cantidadCuotas: 2 });
        const res = await request(app)
            .post(`/api/creditos/${credito.id}/cuotas/${credito.cuotas[0].id}/pagar`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ monto: 5000 });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.estadoCuota).toBe('pagada');
    });
});
