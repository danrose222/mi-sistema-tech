const db = require('../config/database');

const PlanCanje = {
  listarPaginado: async ({ page = 1, limit = 20, estado = '' }) => {
    const offset = (page - 1) * limit;
    const where = estado ? 'WHERE estado = ?' : '';
    const whereParams = estado ? [estado] : [];

    const [rows] = await db.query(
      `SELECT * FROM plan_canje ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM plan_canje ${where}`,
      whereParams
    );

    return { data: rows, total: countRows[0].total };
  },

  obtenerPorId: async (id) => {
    const [rows] = await db.query('SELECT * FROM plan_canje WHERE id = ?', [id]);
    return rows[0];
  },

  crear: async (datos) => {
    const {
      cliente_nombre, cliente_telefono, cliente_dni,
      equipo_marca, equipo_modelo, equipo_capacidad, equipo_estado_general,
      valor_tasado, estado, pedido_id,
      equipo_entregado_condicion, equipo_entregado_marca, equipo_entregado_modelo,
      condicion_pago_diferencia
    } = datos;

    const [result] = await db.query(
      `INSERT INTO plan_canje
        (cliente_nombre, cliente_telefono, cliente_dni,
         equipo_marca, equipo_modelo, equipo_capacidad, equipo_estado_general,
         valor_tasado, estado, pedido_id,
         equipo_entregado_condicion, equipo_entregado_marca, equipo_entregado_modelo,
         condicion_pago_diferencia)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cliente_nombre, cliente_telefono, cliente_dni || null,
        equipo_marca, equipo_modelo, equipo_capacidad || null, equipo_estado_general,
        valor_tasado ?? null, estado, pedido_id || null,
        equipo_entregado_condicion || null, equipo_entregado_marca || null, equipo_entregado_modelo || null,
        condicion_pago_diferencia || null
      ]
    );
    return result;
  },

  actualizar: async (id, datos) => {
    const {
      cliente_nombre, cliente_telefono, cliente_dni,
      equipo_marca, equipo_modelo, equipo_capacidad, equipo_estado_general,
      valor_tasado, estado, pedido_id,
      equipo_entregado_condicion, equipo_entregado_marca, equipo_entregado_modelo,
      condicion_pago_diferencia
    } = datos;

    const [result] = await db.query(
      `UPDATE plan_canje SET
         cliente_nombre = ?, cliente_telefono = ?, cliente_dni = ?,
         equipo_marca = ?, equipo_modelo = ?, equipo_capacidad = ?, equipo_estado_general = ?,
         valor_tasado = ?, estado = ?, pedido_id = ?,
         equipo_entregado_condicion = ?, equipo_entregado_marca = ?, equipo_entregado_modelo = ?,
         condicion_pago_diferencia = ?
       WHERE id = ?`,
      [
        cliente_nombre, cliente_telefono, cliente_dni || null,
        equipo_marca, equipo_modelo, equipo_capacidad || null, equipo_estado_general,
        valor_tasado ?? null, estado, pedido_id || null,
        equipo_entregado_condicion || null, equipo_entregado_marca || null, equipo_entregado_modelo || null,
        condicion_pago_diferencia || null, id
      ]
    );
    return result;
  },

  eliminar: async (id) => {
    const [result] = await db.query('DELETE FROM plan_canje WHERE id = ?', [id]);
    return result;
  }
};

module.exports = PlanCanje;
