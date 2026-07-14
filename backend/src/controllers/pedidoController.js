const pedidoModel = require('../models/pedidoModel');
const mercadopagoService = require('../services/mercadopagoService');

exports.listarPedidos = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const estado = req.query.estado || '';

    const { data, total } = await pedidoModel.listarPedidosPaginado({ page, limit, estado });
    res.json({ success: true, data, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al listar pedidos' });
  }
};

exports.obtenerPedido = async (req, res) => {
  try {
    const pedido = await pedidoModel.obtenerPedidoConClientePorId(req.params.id);
    if (!pedido) return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
    const items = await pedidoModel.obtenerItemsPorPedido(req.params.id);
    res.json({ success: true, data: { ...pedido, items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al obtener pedido' });
  }
};

exports.crearPedido = async (req, res) => {
  const pool = require('../config/database');
  const { cliente_id, items, payer } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El pedido debe contener al menos un item' });
  }
  for (const item of items) {
    if (!Number.isInteger(item.producto_id) || !Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      return res.status(400).json({ error: 'Cada item debe tener producto_id y cantidad (entero positivo) válidos' });
    }
  }

  const connection = await pool.getConnection();
  let transactionActive = false;

  try {
    await connection.beginTransaction();
    transactionActive = true;

    // 1. Validar stock y precio contra la BD (nunca confiar en el precio enviado por el cliente)
    const itemsVerificados = [];
    for (const item of items) {
      const [rows] = await connection.query('SELECT id, nombre, precio, stock FROM productos WHERE id = ? FOR UPDATE', [item.producto_id]);
      if (rows.length === 0) {
        throw Object.assign(new Error(`El producto ${item.producto_id} no existe`), { statusCode: 400 });
      }
      const producto = rows[0];
      if (producto.stock < item.cantidad) {
        throw Object.assign(new Error(`El producto ${item.producto_id} no tiene stock suficiente`), { statusCode: 400 });
      }
      await connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.producto_id]);
      itemsVerificados.push({
        producto_id: producto.id,
        nombre: producto.nombre,
        cantidad: item.cantidad,
        precio_unitario: Number(producto.precio)
      });
    }

    // 2. Crear pedido con el total calculado a partir del precio verificado en BD
    const total = itemsVerificados.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0);
    const [result] = await connection.query('INSERT INTO pedidos (cliente_id, total) VALUES (?, ?)', [cliente_id || null, total]);
    const pedidoId = result.insertId;

    // 3. Crear items
    const values = itemsVerificados.map((item) => [pedidoId, item.producto_id, item.cantidad, item.precio_unitario]);
    await connection.query('INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES ?', [values]);

    // 4. Crear preferencia MercadoPago ANTES de hacer commit: si falla, se hace rollback completo
    //    (stock, pedido e items) en vez de dejar un pedido huérfano con stock ya descontado.
    const mpItems = itemsVerificados.map((item) => ({
      title: item.nombre,
      unit_price: item.precio_unitario,
      quantity: item.cantidad,
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

    await connection.query(
      'UPDATE pedidos SET pago_link = ?, mercado_pago_preference_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [preference.init_point, preference.id, pedidoId]
    );

    await connection.commit();
    transactionActive = false;
    connection.release();

    res.status(201).json({ pedido_id: pedidoId, pago_link: preference.init_point, preference_id: preference.id });
  } catch (err) {
    if (transactionActive) {
      await connection.rollback();
    }
    connection.release();

    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
};

exports.webhookPago = async (req, res) => {
  try {
    const { topic, data } = mercadopagoService.validarWebhook(req.body, req.headers, req.query);
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
