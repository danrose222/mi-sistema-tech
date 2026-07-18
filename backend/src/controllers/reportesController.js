const pool = require('../config/database');

// El "proveedor" en pagos identifica el medio real: 'efectivo'/'tarjeta'/
// 'transferencia' vienen de ventas de mostrador (ver crearVentaPos),
// 'mercadopago' del checkout público. Ambos "tarjeta" y "mercadopago" son
// dinero que llega por vía electrónica, así que se agrupan en un mismo total.
function agruparProveedor(proveedor) {
  if (proveedor === 'efectivo') return 'efectivo';
  if (proveedor === 'transferencia') return 'transferencia';
  if (proveedor === 'tarjeta' || proveedor === 'mercadopago') return 'tarjetaMp';
  return null;
}

/**
 * Resume el efectivo/tarjeta-MP/transferencia que ingresó hoy por ventas
 * pagadas, restando las devoluciones procesadas hoy, para el cierre de caja
 * del mostrador.
 *
 * Una devolución de una venta del MISMO día no se resta dos veces: al pasar
 * el pedido a "reembolsado" ya deja de contar como "venta de hoy" (el filtro
 * de abajo exige estado = 'pagado'), así que solo hay que restar acá las
 * devoluciones de ventas de OTRO día — dinero que salió de la caja hoy pero
 * que nunca se sumó como ingreso de hoy.
 */
exports.obtenerCajaDiaria = async (req, res) => {
  try {
    const [[ventasHoy]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS cantidad
       FROM pedidos
       WHERE estado = 'pagado' AND DATE(created_at) = CURDATE()`
    );

    const [[devolucionesHoy]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS cantidad
       FROM pedidos
       WHERE estado = 'reembolsado'
         AND DATE(reembolsado_en) = CURDATE()
         AND DATE(created_at) <> CURDATE()`
    );

    const [ingresosPorProveedor] = await pool.query(
      `SELECT pg.proveedor, COALESCE(SUM(pg.monto), 0) AS total
       FROM pagos pg
       JOIN pedidos p ON p.id = pg.pedido_id
       WHERE p.estado = 'pagado' AND DATE(p.created_at) = CURDATE() AND pg.estado = 'aprobado'
       GROUP BY pg.proveedor`
    );

    const [devolucionesPorProveedor] = await pool.query(
      `SELECT pg.proveedor, COALESCE(SUM(pg.monto), 0) AS total
       FROM pagos pg
       JOIN pedidos p ON p.id = pg.pedido_id
       WHERE p.estado = 'reembolsado'
         AND DATE(p.reembolsado_en) = CURDATE()
         AND DATE(p.created_at) <> CURDATE()
         AND pg.estado = 'aprobado'
       GROUP BY pg.proveedor`
    );

    // Ingresos que no son ventas (ej. cobro de deuda histórica de un cliente
    // migrado): viven en caja_movimientos, no en pedidos, para no mezclar
    // "vendimos algo hoy" con "cobramos una deuda de antes del sistema".
    // Igual entran al total general de la caja, porque es dinero real que
    // ingresó hoy.
    const [[otrosIngresosHoy]] = await pool.query(
      `SELECT COALESCE(SUM(monto), 0) AS total, COUNT(*) AS cantidad
       FROM caja_movimientos
       WHERE tipo = 'ingreso' AND DATE(created_at) = CURDATE()`
    );

    const resumen = { efectivo: 0, transferencia: 0, tarjetaMp: 0 };
    for (const fila of ingresosPorProveedor) {
      const bucket = agruparProveedor(fila.proveedor);
      if (bucket) resumen[bucket] += Number(fila.total);
    }
    for (const fila of devolucionesPorProveedor) {
      const bucket = agruparProveedor(fila.proveedor);
      if (bucket) resumen[bucket] -= Number(fila.total);
    }

    res.json({
      success: true,
      data: {
        fecha: new Date().toISOString().split('T')[0],
        cantidadVentas: ventasHoy.cantidad,
        cantidadDevoluciones: devolucionesHoy.cantidad,
        totalGeneral: Number(ventasHoy.total) - Number(devolucionesHoy.total) + Number(otrosIngresosHoy.total),
        efectivo: resumen.efectivo,
        transferencia: resumen.transferencia,
        tarjetaMp: resumen.tarjetaMp,
        otrosIngresos: Number(otrosIngresosHoy.total),
        cantidadOtrosIngresos: otrosIngresosHoy.cantidad
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al generar el reporte de caja diaria' });
  }
};
