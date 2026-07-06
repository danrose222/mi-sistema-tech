const pedidoModel = require('../models/pedidoModel');
const mercadopagoService = require('../services/mercadopagoService');

exports.listarPedidos = async (req, res) => {
  try {
    const pedidos = await pedidoModel.listarPedidos();
    res.json(pedidos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar pedidos' });
  }
};

exports.obtenerPedido = async (req, res) => {
  try {
    const pedido = await pedidoModel.obtenerPedidoPorId(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    const items = await pedidoModel.obtenerItemsPorPedido(req.params.id);
    res.json({ ...pedido, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pedido' });
  }
};

exports.crearPedido = async (req, res) => {
  const pool = require('../config/database');
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { cliente_id, items, payer } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'El pedido debe contener al menos un item' });
    }

    // 1. Validar y descontar stock
    for (const item of items) {
      const [rows] = await connection.query('SELECT stock FROM productos WHERE id = ? FOR UPDATE', [item.producto_id]);
      if (rows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: `El producto ${item.producto_id} no existe` });
      }
      if (rows[0].stock < item.cantidad) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: `El producto ${item.producto_id} no tiene stock suficiente` });
      }
      await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.producto_id]);
    }

    // 2. Crear pedido
    const total = items.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0);
    const [result] = await connection.query('INSERT INTO pedidos (cliente_id, total) VALUES (?, ?)', [cliente_id || null, total]);
    const pedidoId = result.insertId;

    // 3. Crear items
    const values = items.map((item) => [pedidoId, item.producto_id, item.cantidad, item.precio_unitario]);
    await connection.query('INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES ?', [values]);

    // Commit de BD local
    await connection.commit();
    connection.release();

    // 4. Crear preferencia MercadoPago
    const mpItems = items.map((item) => ({
      title: item.nombre || 'Producto',
      unit_price: Number(item.precio_unitario),
      quantity: Number(item.cantidad),
      currency_id: 'ARS'
    }));

    const back_urls = {
      success: process.env.FRONTEND_SUCCESS_URL || 'http://localhost:4200/pago-exitoso',
      failure: process.env.FRONTEND_FAILURE_URL || 'http://localhost:4200/pago-fallido',
      pending: process.env.FRONTEND_PENDING_URL || 'http://localhost:4200/pago-pendiente'
    };

    const preference = await mercadopagoService.crearPreference({
      items: mpItems,
      payer,
      external_reference: String(pedidoId),
      back_urls
    });

    await pedidoModel.guardarLinkPago(pedidoId, preference.init_point, preference.id);
    res.status(201).json({ pedido_id: pedidoId, pago_link: preference.init_point, preference_id: preference.id });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error(err);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
};

exports.webhookPago = async (req, res) => {
  try {
    const { topic, data } = mercadopagoService.validarWebhook(req.body, req.headers);
    const paymentId = data.id || (data.data && data.data.id);
    if (!paymentId) {
      return res.status(400).json({ error: 'Webhook inválido: payment id faltante' });
    }

    // Comprobar idempotencia: ¿Ya procesamos este pago?
    const pagoExistente = await pedidoModel.obtenerPagoPorProveedorId(paymentId);
    if (pagoExistente) {
      return res.json({ received: true, message: 'Pago ya procesado (Idempotencia)' });
    }

    const payment = await mercadopagoService.obtenerPago(paymentId);
    const external_reference = payment.external_reference || (payment.order && payment.order.external_reference);
    const status = payment.status;
    const transactionAmount = payment.transaction_amount || 0;

    const statusMap = {
      approved: 'aprobado',
      rejected: 'rechazado',
      pending: 'pendiente',
      in_process: 'pendiente'
    };
    const mappedStatus = statusMap[status] || 'pendiente';

    await pedidoModel.crearPago({
      pedido_id: external_reference ? Number(external_reference) : null,
      proveedor: 'mercadopago',
      proveedor_payment_id: payment.id,
      monto: transactionAmount,
      estado: mappedStatus,
      raw_payload: payment
    });

    if (external_reference && status === 'approved') {
      await pedidoModel.actualizarPedidoEstado(Number(external_reference), 'pagado');
    }

    res.json({ received: true });
  } catch (err) {
    if (err.message === 'Firma inválida') {
        return res.status(400).json({ error: 'Firma inválida' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al procesar webhook de pago' });
  }
};
