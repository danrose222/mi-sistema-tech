const pedidoModel = require('../models/pedidoModel');
const mercadopagoService = require('../services/mercadopagoService');
const emailService = require('../services/emailService');

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

// Devolución/reembolso de un pedido ya pagado: repone el stock de sus items
// y lo pasa a "reembolsado". No borra los registros de `pagos` (quedan como
// historial de auditoría) ni inserta un movimiento negativo aparte; el
// reporte de Caja Diaria resta las devoluciones del día al vuelo (ver
// reportesController.obtenerCajaDiaria) usando reembolsado_en.
exports.procesarDevolucion = async (req, res) => {
  const pool = require('../config/database');
  const pedidoId = req.params.id;

  const connection = await pool.getConnection();
  let transactionActive = false;

  try {
    await connection.beginTransaction();
    transactionActive = true;

    const [pedidos] = await connection.query('SELECT id, estado FROM pedidos WHERE id = ? FOR UPDATE', [pedidoId]);
    if (pedidos.length === 0) {
      throw Object.assign(new Error('El pedido especificado no existe'), { statusCode: 404 });
    }
    if (pedidos[0].estado !== 'pagado') {
      throw Object.assign(
        new Error(`Solo se pueden devolver pedidos pagados (estado actual: "${pedidos[0].estado}")`),
        { statusCode: 409 }
      );
    }

    const [items] = await connection.query('SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ?', [pedidoId]);
    for (const item of items) {
      // FOR UPDATE por consistencia con el resto de las operaciones de stock
      // (crearPedido, crearVentaPos, reservasCron) aunque acá siempre suma.
      await connection.query('SELECT id FROM productos WHERE id = ? FOR UPDATE', [item.producto_id]);
      await connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [item.cantidad, item.producto_id]);
    }

    await connection.query(
      "UPDATE pedidos SET estado = 'reembolsado', reembolsado_en = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [pedidoId]
    );

    await connection.commit();
    transactionActive = false;
    connection.release();

    res.json({ success: true, data: { id: Number(pedidoId), estado: 'reembolsado' } });
  } catch (err) {
    if (transactionActive) {
      await connection.rollback();
    }
    connection.release();

    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al procesar la devolución' });
  }
};

const METODOS_PAGO_VALIDOS = ['mercado_pago', 'transferencia', 'efectivo_local'];

// CRM unificado: si la compra web trae DNI, la venta se asocia siempre a un
// cliente de la base general (buscándolo o creándolo), en vez de quedar
// "suelta" con solo cliente_email. Se hace con SELECT + INSERT (no INSERT
// ... ON DUPLICATE KEY) para no pisar silenciosamente nombre/teléfono/email
// de un cliente ya existente con los datos que puso en este checkout puntual.
async function buscarOCrearClientePorDni(connection, { dni, nombre, telefono, email }) {
  const [existente] = await connection.query('SELECT id FROM clientes WHERE dni = ?', [dni]);
  if (existente.length > 0) {
    return existente[0].id;
  }

  try {
    const [insertado] = await connection.query(
      'INSERT INTO clientes (nombre, telefono, email, dni) VALUES (?, ?, ?, ?)',
      [nombre || 'Cliente Web', telefono || null, email || null, dni]
    );
    return insertado.insertId;
  } catch (err) {
    // Condición de carrera: dos checkouts simultáneos con el mismo DNI.
    if (err.code === 'ER_DUP_ENTRY') {
      const [ganador] = await connection.query('SELECT id FROM clientes WHERE dni = ?', [dni]);
      if (ganador.length > 0) return ganador[0].id;
    }
    throw err;
  }
}

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

    // 1.5 CRM unificado: si no vino un cliente_id ya resuelto (ej. cliente logueado)
    // pero sí un DNI, se busca/crea el cliente en la base general del local.
    let clienteIdFinal = cliente_id || null;
    if (!clienteIdFinal && payer?.dni) {
      const dni = String(payer.dni).trim();
      if (dni) {
        clienteIdFinal = await buscarOCrearClientePorDni(connection, {
          dni,
          nombre: payer.name,
          telefono: payer.phone?.number,
          email: payer.email
        });
      }
    }

    // 2. Crear pedido con el total calculado a partir del precio verificado en BD
    const total = itemsVerificados.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0);
    const [result] = await connection.query(
      'INSERT INTO pedidos (cliente_id, total, metodo_pago, cliente_email) VALUES (?, ?, ?, ?)',
      [clienteIdFinal, total, metodo_pago, payer?.email || null]
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

const MARGEN_ERROR_MONTO = 0.01;

// Venta de mostrador (POS): a diferencia de crearPedido, la ruta exige
// autenticación (ver pedidoRoutes.js) y el pago ya se cobró en el momento,
// así que el pedido nace directamente en estado "pagado" — no pasa por
// 'pendiente' ni por el cron de liberación de reservas de 48hs.
exports.crearVentaPos = async (req, res) => {
  const pool = require('../config/database');
  const { items, desglose_pago } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'La venta debe contener al menos un item' });
  }
  for (const item of items) {
    if (!Number.isInteger(item.producto_id) || !Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      return res.status(400).json({ error: 'Cada item debe tener producto_id y cantidad (entero positivo) válidos' });
    }
  }

  if (!desglose_pago || typeof desglose_pago !== 'object') {
    return res.status(400).json({ error: 'Debe indicar el desglose de pago (efectivo, tarjeta, transferencia)' });
  }
  const montos = {
    efectivo: Number(desglose_pago.efectivo) || 0,
    tarjeta: Number(desglose_pago.tarjeta) || 0,
    transferencia: Number(desglose_pago.transferencia) || 0
  };
  if (Object.values(montos).some((monto) => monto < 0 || !Number.isFinite(monto))) {
    return res.status(400).json({ error: 'Los montos del desglose de pago no pueden ser negativos' });
  }

  const connection = await pool.getConnection();
  let transactionActive = false;

  try {
    await connection.beginTransaction();
    transactionActive = true;

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
        cantidad: item.cantidad,
        precio_unitario: Number(producto.precio)
      });
    }

    const total = Math.round(itemsVerificados.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0) * 100) / 100;

    // Tarjeta y transferencia son montos exactos (no hay "vuelto" en un
    // pago electrónico): si entre las dos superan el total, es un error de
    // carga del cajero, no una situación real de cobro.
    const noEfectivo = Math.round((montos.tarjeta + montos.transferencia) * 100) / 100;
    if (noEfectivo > total + MARGEN_ERROR_MONTO) {
      throw Object.assign(
        new Error(`La tarjeta y/o transferencia ($${noEfectivo}) no pueden superar el total de la venta ($${total})`),
        { statusCode: 400 }
      );
    }

    const totalTendido = Math.round((montos.efectivo + noEfectivo) * 100) / 100;
    if (totalTendido < total - MARGEN_ERROR_MONTO) {
      throw Object.assign(
        new Error(`El pago ingresado ($${totalTendido}) no cubre el total de la venta ($${total})`),
        { statusCode: 400 }
      );
    }

    // El vuelto sale de la parte en efectivo: es la única forma de pago que
    // admite un monto "de más" tendido por el cliente.
    const vuelto = Math.max(0, Math.round((totalTendido - total) * 100) / 100);
    const efectivoAplicado = Math.round((montos.efectivo - vuelto) * 100) / 100;

    const [result] = await connection.query(
      "INSERT INTO pedidos (cliente_id, total, metodo_pago, estado) VALUES (NULL, ?, 'efectivo_pos', 'pagado')",
      [total]
    );
    const pedidoId = result.insertId;

    const values = itemsVerificados.map((item) => [pedidoId, item.producto_id, item.cantidad, item.precio_unitario]);
    await connection.query('INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES ?', [values]);

    // Un registro en `pagos` por cada método realmente aplicado a la venta
    // (no al vuelto): es lo que después suma el reporte de Caja Diaria.
    const desglosePagos = [
      ['efectivo', efectivoAplicado],
      ['tarjeta', montos.tarjeta],
      ['transferencia', montos.transferencia]
    ].filter(([, monto]) => monto > MARGEN_ERROR_MONTO);

    if (desglosePagos.length > 0) {
      const valoresPagos = desglosePagos.map(([proveedor, monto]) => [pedidoId, proveedor, monto, 'aprobado']);
      await connection.query(
        'INSERT INTO pagos (pedido_id, proveedor, monto, estado) VALUES ?',
        [valoresPagos]
      );
    }

    await connection.commit();
    transactionActive = false;
    connection.release();

    res.status(201).json({ pedido_id: pedidoId, total, vuelto });
  } catch (err) {
    if (transactionActive) {
      await connection.rollback();
    }
    connection.release();

    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la venta' });
  }
};

exports.webhookPago = async (req, res) => {
  let topic, data;
  try {
    ({ topic, data } = mercadopagoService.validarWebhook(req.body, req.headers, req.query));
  } catch (err) {
    if (err.message === 'Firma inválida') {
      console.error('[Webhook MP] Firma inválida, notificación rechazada.');
      return res.status(400).json({ error: 'Firma inválida' });
    }
    console.error('[Webhook MP] Error al validar la notificación:', err);
    return res.status(400).json({ error: 'Webhook inválido' });
  }

  console.log(`[Webhook MP] Notificación recibida - topic: ${topic || 'desconocido'}`);

  // Además de 'payment', Mercado Pago manda otros topics (merchant_order,
  // chargebacks, etc.) que no traen un payment id utilizable acá. Se acepta
  // igual con 200 para que no reintente, pero no hay nada que consultar.
  const esNotificacionDePago = typeof topic === 'string' && topic.toLowerCase().startsWith('payment');
  if (!esNotificacionDePago) {
    return res.status(200).json({ received: true, procesado: false });
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

  console.log(`[Webhook MP] Procesando pago #${paymentId} en segundo plano...`);

  procesarPagoWebhook(paymentId).catch((err) => {
    console.error(`[Webhook MP] Error al procesar el pago #${paymentId} en segundo plano:`, err);
  });
};

async function procesarPagoWebhook(paymentId) {
  const pagoExistente = await pedidoModel.obtenerPagoPorProveedorId(paymentId);
  if (pagoExistente) {
    console.log(`[Webhook MP] Pago #${paymentId} ya estaba procesado (idempotencia), se omite.`);
    return;
  }

  // GET https://api.mercadopago.com/v1/payments/{id} vía el SDK oficial,
  // usando el mismo token con el que se creó la preferencia (ver
  // mercadopagoService.js: MP_ACCESS_TOKEN_TEST en local, MP_ACCESS_TOKEN en prod).
  const payment = await mercadopagoService.obtenerPago(paymentId);
  const external_reference = payment.external_reference || (payment.order && payment.order.external_reference);
  const status = payment.status;
  const transactionAmount = payment.transaction_amount || 0;

  console.log(`[Webhook MP] Pago #${paymentId} -> status: ${status}, pedido: ${external_reference || 'sin referencia'}`);

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

  // El stock ya se descuenta al crear el pedido (ver crearPedido más arriba):
  // se reserva apenas se genera el pedido para no vender de más mientras el
  // pago está pendiente. Tocarlo de nuevo acá lo descontaría dos veces.
  if (external_reference && status === 'approved') {
    await pedidoModel.actualizarPedidoEstado(Number(external_reference), 'pagado');
    console.log(`[Webhook MP] Pedido #${external_reference} actualizado a "pagado".`);

    // El envío del comprobante va en su propio try/catch: un SMTP caído o mal
    // configurado no debe revertir ni bloquear la actualización del pago,
    // que ya se confirmó y persistió en la línea anterior.
    try {
      const pedidoPagado = await pedidoModel.obtenerPedidoConClientePorId(Number(external_reference));
      const itemsPedido = await pedidoModel.obtenerItemsPorPedido(Number(external_reference));
      await emailService.enviarComprobanteCompra({ pedido: pedidoPagado, items: itemsPedido });
      console.log(`[Webhook MP] Comprobante de compra enviado por email para el pedido #${external_reference}.`);
    } catch (err) {
      console.error(`[Webhook MP] Error al enviar el comprobante por email del pedido #${external_reference}:`, err);
    }
  }
}
