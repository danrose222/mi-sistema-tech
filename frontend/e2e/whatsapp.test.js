const request = require('supertest');
const express = require('express');
const whatsappController = require('../src/controllers/whatsappController');
const whatsappService = require('../src/services/whatsappService');
const pedidoModel = require('../src/models/pedidoModel');

// Mockear los módulos de servicio y modelo
jest.mock('../src/services/whatsappService');
jest.mock('../src/models/pedidoModel');

const app = express();
app.use(express.json());

// Registrar solo la ruta que se va a probar
app.post('/api/whatsapp/recordatorio', whatsappController.enviarRecordatorio);

describe('POST /api/whatsapp/recordatorio', () => {

  // Limpiar mocks después de cada prueba
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('debería enviar un recordatorio usando un pedido_id válido', async () => {
    const mockPedido = {
      id: 1,
      cliente_nombre: 'Juan Perez',
      cliente_telefono: '123456789',
      pago_link: 'http://example.com/pago'
    };
    pedidoModel.obtenerPedidoConClientePorId.mockResolvedValue(mockPedido);
    whatsappService.enviarMensaje.mockResolvedValue({ success: true, message_id: 'wamid.123' });

    const response = await request(app)
      .post('/api/whatsapp/recordatorio')
      .send({ pedido_id: 1 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(pedidoModel.obtenerPedidoConClientePorId).toHaveBeenCalledWith(1);
    expect(whatsappService.enviarMensaje).toHaveBeenCalledWith({
      telefono: '123456789',
      mensaje: 'Hola Juan Perez, tu pago está pendiente. Ingresa al link para completar: http://example.com/pago'
    });
  });

  test('debería enviar un mensaje con teléfono y texto explícitos', async () => {
    whatsappService.enviarMensaje.mockResolvedValue({ success: true, message_id: 'wamid.456' });

    const response = await request(app)
      .post('/api/whatsapp/recordatorio')
      .send({ telefono: '987654321', mensaje: 'Mensaje de prueba directo' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(whatsappService.enviarMensaje).toHaveBeenCalledWith({
      telefono: '987654321',
      mensaje: 'Mensaje de prueba directo'
    });
    expect(pedidoModel.obtenerPedidoConClientePorId).not.toHaveBeenCalled();
  });

  test('debería devolver 404 si el pedido no se encuentra', async () => {
    pedidoModel.obtenerPedidoConClientePorId.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/whatsapp/recordatorio')
      .send({ pedido_id: 999 });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Pedido no encontrado');
  });

  test('debería devolver 400 si faltan teléfono y mensaje', async () => {
    const response = await request(app)
      .post('/api/whatsapp/recordatorio')
      .send({}); // Body vacío

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Se requiere teléfono y mensaje');
  });
});