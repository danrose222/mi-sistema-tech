const PlanCanje = require('../models/planCanjeModel');
const logError = require('../utils/logError');

const ESTADOS_VALIDOS = ['pendiente_revision', 'tasado', 'aceptado', 'rechazado', 'completado'];
const CONDICIONES_VALIDAS = ['excelente', 'bueno', 'regular', 'malo'];
const ESTADOS_QUE_REQUIEREN_VALOR = ['tasado', 'aceptado', 'completado'];
const CONDICIONES_EQUIPO_ENTREGADO_VALIDAS = ['nuevo', 'usado'];
const CONDICIONES_PAGO_VALIDAS = ['efectivo', 'mercado_pago', 'transferencia', 'financiado'];

// El valor tasado se puede cargar en cualquier momento (a veces el admin ya
// tiene una cotización estimada desde el primer contacto por WhatsApp), pero
// se exige > 0 recién a partir de "tasado" en adelante: no tiene sentido que
// la operación avance a ese estado sin un monto real cargado.
function normalizarPlanCanje(body) {
  const estado = ESTADOS_VALIDOS.includes(body.estado) ? body.estado : 'pendiente_revision';
  const equipo_estado_general = CONDICIONES_VALIDAS.includes(body.equipo_estado_general)
    ? body.equipo_estado_general
    : 'bueno';

  let valor_tasado = null;
  if (body.valor_tasado !== undefined && body.valor_tasado !== null && body.valor_tasado !== '') {
    valor_tasado = Number(body.valor_tasado);
    if (!Number.isFinite(valor_tasado) || valor_tasado < 0) {
      return { error: 'valor_tasado debe ser un número mayor o igual a cero' };
    }
  }
  if (ESTADOS_QUE_REQUIEREN_VALOR.includes(estado) && !(valor_tasado > 0)) {
    return { error: `El estado "${estado}" requiere un valor tasado mayor a cero` };
  }

  // Equipo que el cliente se lleva a cambio: se define recién cuando eligió
  // qué quiere, así que queda NULL hasta ese momento sin bloquear el alta.
  const equipo_entregado_condicion = CONDICIONES_EQUIPO_ENTREGADO_VALIDAS.includes(body.equipo_entregado_condicion)
    ? body.equipo_entregado_condicion
    : null;
  if (body.equipo_entregado_condicion && !equipo_entregado_condicion) {
    return { error: 'equipo_entregado_condicion debe ser "nuevo" o "usado"' };
  }

  const condicion_pago_diferencia = CONDICIONES_PAGO_VALIDAS.includes(body.condicion_pago_diferencia)
    ? body.condicion_pago_diferencia
    : null;
  if (body.condicion_pago_diferencia && !condicion_pago_diferencia) {
    return { error: 'condicion_pago_diferencia inválida' };
  }

  let pedido_id = null;
  if (body.pedido_id !== undefined && body.pedido_id !== null && body.pedido_id !== '') {
    pedido_id = Number(body.pedido_id);
    if (!Number.isInteger(pedido_id) || pedido_id <= 0) {
      return { error: 'pedido_id debe ser un número entero válido' };
    }
  }

  return {
    ...body,
    estado, equipo_estado_general, valor_tasado, pedido_id,
    equipo_entregado_condicion, condicion_pago_diferencia
  };
}

const planCanjeController = {
  listar: async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const estado = ESTADOS_VALIDOS.includes(req.query.estado) ? req.query.estado : '';

      const { data, total } = await PlanCanje.listarPaginado({ page, limit, estado });
      res.json({ success: true, data, total });
    } catch (error) {
      logError('[PlanCanje]', error);
      res.status(500).json({ success: false, error: 'Hubo un error al obtener las operaciones de Plan Canje' });
    }
  },

  obtener: async (req, res) => {
    try {
      const registro = await PlanCanje.obtenerPorId(req.params.id);
      if (!registro) return res.status(404).json({ success: false, error: 'Operación de Plan Canje no encontrada' });
      res.json({ success: true, data: registro });
    } catch (error) {
      logError('[PlanCanje]', error);
      res.status(500).json({ success: false, error: 'Hubo un error al obtener la operación' });
    }
  },

  crear: async (req, res) => {
    try {
      const { cliente_nombre, cliente_telefono, equipo_marca, equipo_modelo } = req.body;
      if (!cliente_nombre || !cliente_nombre.trim()) {
        return res.status(400).json({ success: false, error: 'El nombre del cliente es requerido' });
      }
      if (!cliente_telefono || !cliente_telefono.trim()) {
        return res.status(400).json({ success: false, error: 'El teléfono del cliente es requerido para coordinar por WhatsApp' });
      }
      if (!equipo_marca || !equipo_marca.trim()) {
        return res.status(400).json({ success: false, error: 'La marca del equipo es requerida' });
      }
      if (!equipo_modelo || !equipo_modelo.trim()) {
        return res.status(400).json({ success: false, error: 'El modelo del equipo es requerido' });
      }

      const datos = normalizarPlanCanje(req.body);
      if (datos.error) return res.status(400).json({ success: false, error: datos.error });

      const result = await PlanCanje.crear(datos);
      const registro = await PlanCanje.obtenerPorId(result.insertId);
      res.status(201).json({ success: true, data: registro });
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
        return res.status(400).json({ success: false, error: 'El pedido vinculado no existe' });
      }
      logError('[PlanCanje]', error);
      res.status(500).json({ success: false, error: 'Hubo un error al registrar la operación de Plan Canje' });
    }
  },

  actualizar: async (req, res) => {
    try {
      const existente = await PlanCanje.obtenerPorId(req.params.id);
      if (!existente) return res.status(404).json({ success: false, error: 'Operación de Plan Canje no encontrada' });

      const datos = normalizarPlanCanje(req.body);
      if (datos.error) return res.status(400).json({ success: false, error: datos.error });

      await PlanCanje.actualizar(req.params.id, datos);
      const registro = await PlanCanje.obtenerPorId(req.params.id);
      res.json({ success: true, data: registro });
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
        return res.status(400).json({ success: false, error: 'El pedido vinculado no existe' });
      }
      logError('[PlanCanje]', error);
      res.status(500).json({ success: false, error: 'Hubo un error al actualizar la operación' });
    }
  },

  eliminar: async (req, res) => {
    try {
      const existente = await PlanCanje.obtenerPorId(req.params.id);
      if (!existente) return res.status(404).json({ success: false, error: 'Operación de Plan Canje no encontrada' });

      await PlanCanje.eliminar(req.params.id);
      res.json({ success: true, mensaje: `Operación número ${req.params.id} eliminada con éxito` });
    } catch (error) {
      logError('[PlanCanje]', error);
      res.status(500).json({ success: false, error: 'Hubo un error al eliminar la operación' });
    }
  }
};

module.exports = planCanjeController;
