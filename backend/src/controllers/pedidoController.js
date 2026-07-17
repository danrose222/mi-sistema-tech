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

const METODOS_PAGO_VALIDOS = ['mercado_pago', 'transferencia', 'efectivo_local'];

exports.crearPedido = async (req, res) => {
  const pool = require('../config/database');
  const { cliente_id, items, payer } = req.body;
  const metodo_pago = req.body.metodo_pago || 'mercado_pago';

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El pedido debe contener al menos un item' });
  }
  for (const item of items) {
    if (!Number.isInteger(item.producto_id) || !Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      return res.status(400).json({ error: 'Cada item debe tener producto_id y cantidad (entero positivo) válidos' });
    }
  }
  if (!METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
    return res.status(400).json({ error: 'Método de pago inválido' });
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
    const [result] = await connection.query(
      'INSERT INTO pedidos (cliente_id, total, metodo_pago) VALUES (?, ?, ?)',
      [cliente_id || null, total, metodo_pago]
    );
    const pedidoId = result.insertId;

    // 3. Crear items
    const values = itemsVerificados.map((item) => [pedidoId, item.producto_id, item.cantidad, item.precio_unitario]);
    await connection.query('INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES ?', [values]);

    // 4. Transferencia y efectivo en local son acuerdos por fuera de la pasarela:
    // el pedido queda "pendiente" a la espera de que se confirme manualmente,
    // sin generar preferencia ni pago_link de Mercado Pago.
    let pagoLink = null;
    let preferenceId = null;

    if (metodo_pago === 'mercado_pago') {
      // Se crea la preferencia ANTES de hacer commit: si falla, se hace
      // rollback completo (stock, pedido e items) en vez de dejar un pedido
      // huérfano con stock ya descontado.
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

      pagoLink = preference.init_point;
      preferenceId = preference.id;

      await connection.query(
        'UPDATE pedidos SET pago_link = ?, mercado_pago_preference_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [pagoLink, preferenceId, pedidoId]
      );
    }

    await connection.commit();
    transactionActive = false;
    connection.release();

    res.status(201).json({ pedido_id: pedidoId, metodo_pago, pago_link: pagoLink, preference_id: preferenceId });
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
  let data;
  try {
    ({ data } = mercadopagoService.validarWebhook(req.body, req.headers, req.query));
  } catch (err) {
    if (err.message === 'Firma inválida') {
      return res.status(400).json({ error: 'Firma inválida' });
    }
    console.error('[Webhook MP] Error al validar la notificación:', err);
    return res.status(400).json({ error: 'Webhook inválido' });
  }

  const paymentId = data.id || (data.data && data.data.id);
  if (!paymentId) {
    return res.status(400).json({ error: 'Webhook inválido: payment id faltante' });
  }

  // Responder 200 ya mismo: MercadoPago reintenta la notificación si no recibe
  // respuesta en pocos segundos, y esperar la consulta a su API + las escrituras
  // en la base puede superar ese margen y generar reintentos/duplicados. El
  // procesamiento real (idempotencia, consulta de pago, guardado) sigue abajo,
  // desacoplado de la respuesta HTTP.
  res.status(200).json({ received: true });

  procesarPagoWebhook(paymentId).catch((err) => {
    console.error('[Webhook MP] Error al procesar el pago en segundo plano:', err);
  });
};

async function procesarPagoWebhook(paymentId) {
  const pagoExistente = await pedidoModel.obtenerPagoPorProveedorId(paymentId);
  if (pagoExistente) return;

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
}
