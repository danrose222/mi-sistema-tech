const pool = require('../config/database');
const cuotasRepo = require('../repositories/cuotas.repository');
const logError = require('../utils/logError');

exports.obtenerResumen = async (req, res) => {
  try {
    const [
      [{ totalClientes }],
      [{ totalProductos }],
      [{ productosStockBajo }],
      [{ pedidosPendientes }],
      [{ ventasMes }],
      [{ creditosActivos }],
      cuotasVencidas
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS totalClientes FROM clientes').then(([rows]) => rows),
      pool.query('SELECT COUNT(*) AS totalProductos FROM productos WHERE activo = 1').then(([rows]) => rows),
      pool.query('SELECT COUNT(*) AS productosStockBajo FROM productos WHERE activo = 1 AND stock <= 5').then(([rows]) => rows),
      pool.query("SELECT COUNT(*) AS pedidosPendientes FROM pedidos WHERE estado = 'pendiente'").then(([rows]) => rows),
      pool.query(
        "SELECT COALESCE(SUM(total), 0) AS ventasMes FROM pedidos WHERE estado = 'pagado' AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')"
      ).then(([rows]) => rows),
      pool.query("SELECT COUNT(*) AS creditosActivos FROM creditos WHERE estado IN ('activo', 'moroso')").then(([rows]) => rows),
      cuotasRepo.buscarVencidas(pool, new Date().toISOString().split('T')[0])
    ]);

    res.json({
      success: true,
      data: {
        totalClientes,
        totalProductos,
        productosStockBajo,
        pedidosPendientes,
        ventasMes: Number(ventasMes),
        creditosActivos,
        cuotasVencidas: cuotasVencidas.length
      }
    });
  } catch (err) {
    logError('[Dashboard]', err);
    res.status(500).json({ success: false, error: 'Error al obtener el resumen del dashboard' });
  }
};

/**
 * Desglose de ventas del mes en curso: total recaudado, unidades vendidas y
 * un detalle por producto (GROUP BY), para el widget "Ventas del Mes" del
 * dashboard. Solo cuenta pedidos con estado 'pagado' del mes/año actuales.
 */
exports.obtenerVentasMes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        pr.id AS producto_id,
        pr.nombre AS producto,
        SUM(pi.cantidad) AS cantidad_vendida,
        SUM(pi.cantidad * pi.precio_unitario) AS subtotal
      FROM pedido_items pi
      JOIN pedidos p ON pi.pedido_id = p.id
      JOIN productos pr ON pi.producto_id = pr.id
      WHERE p.estado = 'pagado'
        AND YEAR(p.created_at) = YEAR(CURDATE())
        AND MONTH(p.created_at) = MONTH(CURDATE())
      GROUP BY pr.id, pr.nombre
      ORDER BY subtotal DESC
    `);

    const desglose = rows.map(r => ({
      producto_id: r.producto_id,
      producto: r.producto,
      cantidad_vendida: Number(r.cantidad_vendida),
      subtotal: Number(r.subtotal)
    }));

    // total_recaudado/total_productos se derivan del mismo desglose: pedidos.total
    // ya se calcula como Σ(cantidad * precio_unitario) al crear el pedido
    // (ver pedidoController.js), así que ambas sumas son consistentes entre sí.
    const total_recaudado = desglose.reduce((acc, item) => acc + item.subtotal, 0);
    const total_productos = desglose.reduce((acc, item) => acc + item.cantidad_vendida, 0);

    res.json({
      success: true,
      data: { total_recaudado, total_productos, desglose }
    });
  } catch (err) {
    logError('[Dashboard]', err);
    res.status(500).json({ success: false, error: 'Error al obtener el desglose de ventas del mes' });
  }
};
