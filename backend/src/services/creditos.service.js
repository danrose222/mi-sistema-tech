/**
 * @fileoverview Servicio de lógica de negocio para la gestión de créditos y cuotas.
 */

const creditosRepo = require('../repositories/creditos.repository');
const cuotasRepo = require('../repositories/cuotas.repository');
const cuentasCorrientesRepo = require('../repositories/cuentas-corrientes.repository');
const notificacionesService = require('./notificaciones.service');

/**
 * Función auxiliar para sumar meses a una fecha.
 * @param {Date} date - Fecha inicial.
 * @param {number} months - Meses a sumar.
 * @returns {string} Fecha en formato YYYY-MM-DD.
 */
function addMonths(date, months) {
  const d = new Date(date.valueOf());
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

/**
 * Función auxiliar para sumar días a una fecha.
 * @param {Date} date - Fecha inicial.
 * @param {number} days - Días a sumar.
 * @returns {string} Fecha en formato YYYY-MM-DD.
 */
function addDays(date, days) {
  const d = new Date(date.valueOf());
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Crea un nuevo crédito con sus cuotas y registra el movimiento.
 * @param {Object} pool - Pool de conexiones.
 * @param {Object} data - Datos del crédito.
 * @param {Object} [externalConnection] - Conexión ya abierta con una transacción en curso
 *   (ej. desde crearVentaPos, para que stock + pedido + crédito + cuotas sean atómicos).
 *   Si se pasa, esta función NO abre ni cierra su propia transacción: la maneja el llamador.
 * @returns {Promise<Object>} Crédito creado con sus cuotas.
 */
async function crearCredito(pool, data, externalConnection = null) {
  const { clienteId, pedidoId, productoId, montoTotal, cantidadCuotas, frecuencia, fechaPrimeraCuota, usuarioId } = data;

  // Validaciones básicas
  if (!clienteId) throw new Error('El clienteId es requerido');
  if (!montoTotal || montoTotal <= 0) throw new Error('El montoTotal debe ser mayor a cero');
  if (!cantidadCuotas || cantidadCuotas <= 0) throw new Error('La cantidad de cuotas debe ser mayor a cero');
  if (!['semanal', 'mensual'].includes(frecuencia)) throw new Error('Frecuencia inválida (semanal o mensual)');
  if (!fechaPrimeraCuota) throw new Error('La fecha de la primera cuota es requerida');

  const dbValidacion = externalConnection || pool;

  // a) y b) Validar existencia de cliente (y pedido/producto si aplica)
  const [clientes] = await dbValidacion.execute('SELECT id, deuda_historica FROM clientes WHERE id = ?', [clienteId]);
  if (clientes.length === 0) throw new Error('El cliente especificado no existe');

  // Clientes migrados de un sistema anterior con saldo pendiente no pueden
  // tomar un crédito nuevo hasta cancelar esa deuda: se cruzarían dos deudas
  // distintas bajo el mismo cliente sin ninguna forma de distinguirlas en los
  // reportes. Se valida acá (no en el controller) porque este service también
  // lo usa crearVentaPos para las ventas a crédito del POS.
  if (Number(clientes[0].deuda_historica) > 0) {
    throw new Error('El cliente registra una deuda histórica. Debe cancelarla antes de solicitar un nuevo crédito.');
  }

  if (pedidoId) {
    const [pedidos] = await dbValidacion.execute('SELECT id FROM pedidos WHERE id = ?', [pedidoId]);
    if (pedidos.length === 0) throw new Error('El pedido especificado no existe');
  }

  if (productoId) {
    const [productos] = await dbValidacion.execute('SELECT id FROM productos WHERE id = ?', [productoId]);
    if (productos.length === 0) throw new Error('El producto especificado no existe');
  }

  // c) Calcular monto cuota y redondeos
  // Redondeamos a 2 decimales para evitar problemas de precisión en JS
  const montoTotalNumber = parseFloat(montoTotal);
  let montoCuota = Math.round((montoTotalNumber / cantidadCuotas) * 100) / 100;

  // Ajustamos la última cuota para que la suma total sea exactamente el montoTotal
  const montoUltimaCuota = Math.round((montoTotalNumber - (montoCuota * (cantidadCuotas - 1))) * 100) / 100;

  const connection = externalConnection || await pool.getConnection();

  try {
    console.log(`[CreditosService] Iniciando creación de crédito para cliente ${clienteId}`);

    // d) Iniciar transacción (si la conexión es propia; una externa ya tiene una en curso)
    if (!externalConnection) await connection.beginTransaction();

    // Crear crédito
    const nuevoCredito = await creditosRepo.crear(connection, {
      cliente_id: clienteId,
      pedido_id: pedidoId || null,
      producto_id: productoId || null,
      monto_total: montoTotalNumber,
      cantidad_cuotas: cantidadCuotas,
      frecuencia,
      monto_cuota: montoCuota,
      fecha_primera_cuota: fechaPrimeraCuota,
      estado: 'activo'
    });

    // Generar cuotas
    const cuotasArray = [];
    const fechaInicial = new Date(fechaPrimeraCuota);

    for (let i = 0; i < cantidadCuotas; i++) {
      let fechaVencimiento;
      if (frecuencia === 'semanal') {
        fechaVencimiento = addDays(fechaInicial, i * 7);
      } else { // mensual
        fechaVencimiento = addMonths(fechaInicial, i);
      }

      const montoDeEstaCuota = (i === cantidadCuotas - 1) ? montoUltimaCuota : montoCuota;

      cuotasArray.push({
        credito_id: nuevoCredito.id,
        numero: i + 1,
        monto: montoDeEstaCuota,
        fecha_vencimiento: fechaVencimiento
      });
    }

    await cuotasRepo.crearMuchas(connection, cuotasArray);

    // Registrar movimiento en cuenta corriente (Venta / Crédito)
    await cuentasCorrientesRepo.registrarMovimiento(connection, {
      cliente_id: clienteId,
      tipo: 'venta',
      monto: montoTotalNumber,
      referencia_tipo: 'credito',
      referencia_id: nuevoCredito.id,
      descripcion: `Otorgamiento de crédito #${nuevoCredito.id}`,
      usuario_id: usuarioId || null
    });

    if (!externalConnection) await connection.commit();
    console.log(`[CreditosService] Crédito #${nuevoCredito.id} creado exitosamente con ${cantidadCuotas} cuotas.`);

    return {
      ...nuevoCredito,
      cuotas: cuotasArray
    };

  } catch (error) {
    if (!externalConnection) {
      await connection.rollback();
      console.error('[CreditosService] Error al crear crédito, haciendo rollback:', error);
      throw new Error(`Error en la transacción al crear crédito: ${error.message}`);
    }
    // Con conexión externa, el rollback y el mensaje de error los maneja el
    // llamador (ej. crearVentaPos): relanzamos el error tal cual.
    throw error;
  } finally {
    if (!externalConnection) connection.release();
  }
}

/**
 * Registra el pago (total o parcial) de una cuota.
 * @param {Object} pool - Pool de conexiones.
 * @param {number} cuotaId - ID de la cuota.
 * @param {number} monto - Monto a pagar.
 * @param {number} [pagoId] - ID del pago registrado.
 * @param {number} [usuarioId] - ID del usuario.
 * @returns {Promise<Object>} Resultado de la operación.
 */
async function pagarCuota(pool, cuotaId, monto, pagoId = null, usuarioId = null) {
  if (!cuotaId) throw new Error('El ID de la cuota es requerido');
  if (!monto || monto <= 0) throw new Error('El monto a pagar debe ser mayor a cero');

  const montoPago = parseFloat(monto);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // a) Buscar cuota y crédito for update para evitar condiciones de carrera
    const [cuotasDb] = await connection.execute(
      'SELECT cu.*, cr.cliente_id FROM cuotas cu JOIN creditos cr ON cu.credito_id = cr.id WHERE cu.id = ? FOR UPDATE', 
      [cuotaId]
    );

    if (cuotasDb.length === 0) throw new Error('La cuota especificada no existe');
    const cuota = cuotasDb[0];

    // b) Validar estado de la cuota
    if (cuota.estado === 'pagada') {
      throw new Error('Esta cuota ya se encuentra totalmente pagada');
    }

    // Calcular restante
    const montoCuota = parseFloat(cuota.monto);
    const montoYaPagado = parseFloat(cuota.monto_pagado || 0);
    const restante = Math.round((montoCuota - montoYaPagado) * 100) / 100;

    // Edge case: No permitir pagar más de lo que resta
    if (montoPago > restante) {
      throw new Error(`No se permite pagar más del monto restante de la cuota. Restante: $${restante}`);
    }

    // c) Calcular nuevo monto pagado
    const nuevoMontoPagado = Math.round((montoYaPagado + montoPago) * 100) / 100;

    // d) Determinar nuevo estado (debido a problemas de precisión de punto flotante, usamos un margen mínimo)
    const margenError = 0.01;
    const pagadoCompletamente = Math.abs(montoCuota - nuevoMontoPagado) <= margenError;
    const nuevoEstado = pagadoCompletamente ? 'pagada' : 'parcial';

    // Fecha actual para el pago
    const fechaPago = new Date().toISOString().split('T')[0];

    console.log(`[CreditosService] Registrando pago de $${montoPago} para cuota #${cuotaId}`);

    // e) Transacción
    
    // Actualizar cuota
    await connection.execute(
      'UPDATE cuotas SET fecha_pago = ?, monto_pagado = ?, pago_id = ?, estado = ? WHERE id = ?',
      [fechaPago, nuevoMontoPagado, pagoId || cuota.pago_id, nuevoEstado, cuotaId]
    );

    // Registrar movimiento en cuenta corriente (tipo 'pago', monto negativo)
    await cuentasCorrientesRepo.registrarMovimiento(connection, {
      cliente_id: cuota.cliente_id,
      tipo: 'pago',
      monto: -montoPago, // Negativo para descontar deuda
      referencia_tipo: 'cuota',
      referencia_id: cuotaId,
      descripcion: `Pago de cuota #${cuota.numero} del crédito #${cuota.credito_id}`,
      usuario_id: usuarioId
    });

    // Verificar si todas las cuotas del crédito están pagadas
    const [pendientes] = await connection.execute(
      'SELECT count(*) as count FROM cuotas WHERE credito_id = ? AND estado != "pagada"',
      [cuota.credito_id]
    );

    let creditoLiquidado = false;
    let creditoReactivado = false;
    let historialActualizado = null;
    if (pendientes[0].count === 0) {
      // Liquidar crédito
      await connection.execute(
        'UPDATE creditos SET estado = "liquidado" WHERE id = ?',
        [cuota.credito_id]
      );
      creditoLiquidado = true;
      console.log(`[CreditosService] Crédito #${cuota.credito_id} ha sido liquidado en su totalidad.`);

      // Al liquidar un crédito, mejoramos el historial crediticio del cliente:
      // "Normal" -> "Bueno" en la primera liquidación, "Bueno" -> "Excelente" en
      // las siguientes. Nunca degradamos un historial ya alcanzado.
      const [clienteRows] = await connection.execute(
        'SELECT historial_crediticio FROM clientes WHERE id = ? FOR UPDATE',
        [cuota.cliente_id]
      );
      const historialActual = clienteRows[0]?.historial_crediticio || 'Normal';
      historialActualizado = historialActual === 'Normal' ? 'Bueno' : 'Excelente';

      await connection.execute(
        'UPDATE clientes SET historial_crediticio = ? WHERE id = ?',
        [historialActualizado, cuota.cliente_id]
      );
      console.log(`[CreditosService] Historial crediticio del cliente #${cuota.cliente_id} actualizado a "${historialActualizado}".`);
    } else {
      // Todavía quedan cuotas pendientes a futuro: si el crédito estaba moroso
      // y este pago dejó al día todas sus cuotas vencidas, vuelve a "activo".
      const [creditoRows] = await connection.execute(
        'SELECT estado FROM creditos WHERE id = ? FOR UPDATE',
        [cuota.credito_id]
      );

      if (creditoRows[0]?.estado === 'moroso') {
        const [vencidas] = await connection.execute(
          'SELECT count(*) as count FROM cuotas WHERE credito_id = ? AND estado = "vencida"',
          [cuota.credito_id]
        );

        if (vencidas[0].count === 0) {
          await connection.execute('UPDATE creditos SET estado = "activo" WHERE id = ?', [cuota.credito_id]);
          creditoReactivado = true;
          console.log(`[CreditosService] Crédito #${cuota.credito_id} volvió a "activo": ya no tiene cuotas vencidas.`);
        }
      }
    }

    await connection.commit();

    // Confirmación por WhatsApp de que el pago se acreditó: solo cuando la
    // cuota queda totalmente paga (no en pagos parciales, donde "ya se
    // acreditó tu cuota" sería engañoso). Va después del commit y no lanza
    // excepción si falla (ver notificaciones.service.js#enviarConfirmacionPago),
    // así un WhatsApp caído no revierte ni bloquea el pago ya confirmado.
    if (nuevoEstado === 'pagada') {
      await notificacionesService.enviarConfirmacionPago(pool, cuotaId, creditoLiquidado);
    }

    return { success: true, estadoCuota: nuevoEstado, creditoLiquidado, creditoReactivado, historialActualizado };

  } catch (error) {
    await connection.rollback();
    console.error('[CreditosService] Error al pagar cuota:', error);
    throw error; // Relanzamos el error original para que el controlador lo maneje
  } finally {
    connection.release();
  }
}

/**
 * Elimina un crédito y todas sus cuotas dentro de una transacción.
 * Solo se permite si el crédito todavía no registra ningún pago (para no
 * corromper el historial de cuenta corriente ni el dinero ya cobrado); si ya
 * tiene pagos, debe anularse cambiando su estado en vez de borrarse.
 * @param {Object} pool - Pool de conexiones.
 * @param {number} creditoId - ID del crédito a eliminar.
 * @returns {Promise<Object>} Confirmación de la eliminación.
 */
async function eliminarCredito(pool, creditoId) {
  if (!creditoId) throw new Error('El ID del crédito es requerido');

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // a) Bloquear y validar existencia del crédito
    const [creditos] = await connection.execute('SELECT id FROM creditos WHERE id = ? FOR UPDATE', [creditoId]);
    if (creditos.length === 0) throw new Error('El crédito especificado no existe');

    // b) Bloquear el borrado si ya se registró algún pago real sobre sus cuotas
    const [pagosRows] = await connection.execute(
      'SELECT COALESCE(SUM(monto_pagado), 0) AS totalPagado FROM cuotas WHERE credito_id = ? FOR UPDATE',
      [creditoId]
    );
    const totalPagado = parseFloat(pagosRows[0].totalPagado);
    if (totalPagado > 0) {
      throw new Error('No se permite eliminar un crédito que ya registra pagos. Cambie su estado a "cancelado" en su lugar.');
    }

    console.log(`[CreditosService] Eliminando crédito #${creditoId} (sin pagos registrados)`);

    // c) Eliminar primero las cuotas (hijas)
    await connection.execute('DELETE FROM cuotas WHERE credito_id = ?', [creditoId]);

    // d) Revertir el movimiento de cuenta corriente que se generó al otorgar
    // el crédito, para que el saldo del cliente no quede con una "venta" fantasma
    await connection.execute(
      "DELETE FROM cuentas_corrientes WHERE referencia_tipo = 'credito' AND referencia_id = ?",
      [creditoId]
    );

    // e) Finalmente eliminar el crédito (padre)
    await connection.execute('DELETE FROM creditos WHERE id = ?', [creditoId]);

    await connection.commit();
    console.log(`[CreditosService] Crédito #${creditoId} eliminado exitosamente junto con sus cuotas.`);

    return { id: Number(creditoId), eliminado: true };

  } catch (error) {
    await connection.rollback();
    console.error('[CreditosService] Error al eliminar crédito, haciendo rollback:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Obtiene el detalle de un crédito, sus cuotas, y calcula resúmenes.
 * @param {Object} pool - Pool de conexiones.
 * @param {number} creditoId - ID del crédito.
 * @returns {Promise<Object>} Detalle completo del crédito.
 */
async function obtenerDetalleCredito(pool, creditoId) {
  if (!creditoId) throw new Error('El ID del crédito es requerido');

  const credito = await creditosRepo.buscarPorId(pool, creditoId);
  if (!credito) throw new Error('Crédito no encontrado');

  const cuotas = await cuotasRepo.buscarPorCredito(pool, creditoId);

  // Calcular totales
  let totalPagado = 0;
  let proximaCuota = null;

  for (const cuota of cuotas) {
    totalPagado += parseFloat(cuota.monto_pagado || 0);
    
    // Si todavía no encontramos próxima cuota y esta no está pagada, la guardamos
    if (!proximaCuota && cuota.estado !== 'pagada') {
      proximaCuota = cuota;
    }
  }

  const montoTotal = parseFloat(credito.monto_total);
  const totalPendiente = Math.round((montoTotal - totalPagado) * 100) / 100;
  
  return {
    ...credito,
    cuotas,
    resumen: {
      totalPagado: Math.round(totalPagado * 100) / 100,
      totalPendiente,
      proximaCuota
    }
  };
}

/**
 * Lista los créditos paginados, utilizando el repositorio.
 * @param {Object} pool - Pool de conexiones.
 * @param {Object} filtros - Filtros de búsqueda (estado, clienteId, pagina, porPagina).
 * @returns {Promise<Object>} Objeto con data y total.
 */
async function listarCreditos(pool, filtros) {
  return await creditosRepo.listar(pool, filtros);
}

/**
 * Busca cuotas vencidas y las actualiza, marcando también los créditos correspondientes como morosos.
 * Ideal para ser ejecutada por un cron job diario.
 * @param {Object} pool - Pool de conexiones.
 * @returns {Promise<{cuotasVencidasActualizadas: number, creditosMorosos: number}>} Resumen de actualizaciones.
 */
async function marcarCuotasVencidas(pool) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const hoy = new Date().toISOString().split('T')[0];
    console.log(`[CreditosService] Buscando cuotas vencidas hasta el ${hoy}`);

    // Buscar cuotas con fecha de vencimiento menor o igual a hoy
    const cuotas = await cuotasRepo.buscarVencidas(connection, hoy);

    if (cuotas.length === 0) {
      await connection.commit();
      return { cuotasVencidasActualizadas: 0, creditosMorosos: 0 };
    }

    const creditosIds = new Set();

    for (const cuota of cuotas) {
      // Actualizar cuota a vencida
      await cuotasRepo.actualizarEstado(connection, cuota.id, 'vencida');
      creditosIds.add(cuota.credito_id);
    }

    // Actualizar créditos a moroso
    // Convertimos Set a Array para iterarlo
    for (const creditoId of Array.from(creditosIds)) {
      // Asegurarse de no sobreescribir si ya está cancelado o liquidado (aunque no debería tener cuotas pendientes)
      await connection.execute(
        'UPDATE creditos SET estado = "moroso" WHERE id = ? AND estado = "activo"',
        [creditoId]
      );
    }

    await connection.commit();
    console.log(`[CreditosService] Se marcaron ${cuotas.length} cuotas como vencidas y se afectaron ${creditosIds.size} créditos.`);

    return {
      cuotasVencidasActualizadas: cuotas.length,
      creditosMorosos: creditosIds.size
    };

  } catch (error) {
    await connection.rollback();
    console.error('[CreditosService] Error al marcar cuotas vencidas:', error);
    throw new Error(`Fallo en el proceso de marcar cuotas vencidas: ${error.message}`);
  } finally {
    connection.release();
  }
}

exports.crearCredito = crearCredito;
exports.pagarCuota = pagarCuota;
exports.eliminarCredito = eliminarCredito;
exports.obtenerDetalleCredito = obtenerDetalleCredito;
exports.listarCreditos = listarCreditos;
exports.marcarCuotasVencidas = marcarCuotasVencidas;
