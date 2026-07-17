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
 * ya pagadas, para el cierre de caja del mostrador.
 */
exports.obtenerCajaDiaria = async (req, res) => {
  try {
    const [[totales]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS totalGeneral, COUNT(*) AS cantidadVentas
       FROM pedidos
       WHERE estado = 'pagado' AND DATE(created_at) = CURDATE()`
    );

    const [desglose] = await pool.query(
      `SELECT pg.proveedor, COALESCE(SUM(pg.monto), 0) AS total
       FROM pagos pg
       JOIN pedidos p ON p.id = pg.pedido_id
       WHERE p.estado = 'pagado' AND DATE(p.created_at) = CURDATE() AND pg.estado = 'aprobado'
       GROUP BY pg.proveedor`
    );

    const resumen = { efectivo: 0, transferencia: 0, tarjetaMp: 0 };
    for (const fila of desglose) {
      const bucket = agruparProveedor(fila.proveedor);
      if (bucket) {
        resumen[bucket] += Number(fila.total);
      }
    }

    res.json({
      success: true,
      data: {
        fecha: new Date().toISOString().split('T')[0],
        cantidadVentas: totales.cantidadVentas,
        totalGeneral: Number(totales.totalGeneral),
        efectivo: resumen.efectivo,
        transferencia: resumen.transferencia,
        tarjetaMp: resumen.tarjetaMp
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error al generar el reporte de caja diaria' });
  }
};
