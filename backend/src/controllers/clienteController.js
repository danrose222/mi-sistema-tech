const Cliente = require('../models/clienteModel');
const logError = require('../utils/logError');

// Valida y normaliza estado_cliente/deuda_historica antes de persistir: un
// cliente MOROSO necesita una deuda_historica > 0 (si no, no hay nada que
// regularizar) y uno AL_DIA nunca debe cargar deuda, sin importar lo que
// haya llegado en el body (defensa server-side, más allá del formulario).
function normalizarEstadoCliente(body) {
    const estado_cliente = body.estado_cliente === 'MOROSO' ? 'MOROSO' : 'AL_DIA';

    if (estado_cliente === 'MOROSO') {
        const deuda_historica = Number(body.deuda_historica);
        if (!Number.isFinite(deuda_historica) || deuda_historica <= 0) {
            return { error: 'Un cliente MOROSO debe tener una deuda_historica mayor a cero' };
        }
        return { ...body, estado_cliente, deuda_historica };
    }

    return { ...body, estado_cliente, deuda_historica: 0 };
}

const clienteController = {
    listarClientes: async (req, res) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const search = req.query.search || '';

            const { data, total } = await Cliente.obtenerPaginado({ page, limit, search });
            res.json({ success: true, data, total });
        } catch (error) {
            logError('[Clientes]', error);
            res.status(500).json({ success: false, error: 'Hubo un error al obtener los clientes' });
        }
    },

    // Buscador rápido por DNI (coincidencia exacta): cruza con Créditos para
    // devolver un estado_crediticio calculado, usado por el widget de alerta
    // de morosidad en el navbar del panel admin.
    buscarPorDni: async (req, res) => {
        try {
            const dni = (req.query.dni || '').trim();
            if (!dni) {
                return res.status(400).json({ success: false, error: 'Debe indicar un DNI para buscar' });
            }

            const cliente = await Cliente.obtenerPorDni(dni);
            if (!cliente) {
                return res.status(404).json({ success: false, error: 'No se encontró ningún cliente con ese DNI' });
            }

            const pool = require('../config/database');
            const [creditos] = await pool.query('SELECT estado FROM creditos WHERE cliente_id = ?', [cliente.id]);

            let estado_crediticio = 'sin_historial';
            if (creditos.some((c) => c.estado === 'moroso')) {
                estado_crediticio = 'moroso';
            } else if (creditos.length > 0) {
                estado_crediticio = 'al_dia';
            }

            res.json({ success: true, data: { ...cliente, estado_crediticio } });
        } catch (error) {
            logError('[Clientes]', error);
            res.status(500).json({ success: false, error: 'Hubo un error al buscar el cliente por DNI' });
        }
    },

    obtenerCliente: async (req, res) => {
        try {
            const cliente = await Cliente.obtenerPorId(req.params.id);
            if (!cliente) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
            res.json({ success: true, data: cliente });
        } catch (error) {
            logError('[Clientes]', error);
            res.status(500).json({ success: false, error: 'Hubo un error al obtener el cliente' });
        }
    },

    registrarCliente: async (req, res) => {
        try {
            const { nombre, telefono } = req.body;

            if (!nombre || !nombre.trim()) {
                return res.status(400).json({ success: false, error: 'El nombre es requerido' });
            }
            // Teléfono obligatorio: es el canal usado para los recordatorios de WhatsApp.
            if (!telefono || !telefono.trim()) {
                return res.status(400).json({ success: false, error: 'El teléfono es requerido para poder enviar recordatorios por WhatsApp' });
            }

            const datosCliente = normalizarEstadoCliente(req.body);
            if (datosCliente.error) {
                return res.status(400).json({ success: false, error: datosCliente.error });
            }

            const nuevoCliente = await Cliente.crear(datosCliente);
            const cliente = await Cliente.obtenerPorId(nuevoCliente.insertId);
            res.status(201).json({ success: true, data: cliente });
        } catch (error) {
            logError('[Clientes]', error);
            res.status(500).json({ success: false, error: 'Hubo un error al guardar el cliente' });
        }
    },

    actualizarCliente: async (req, res) => {
        try {
            const existente = await Cliente.obtenerPorId(req.params.id);
            if (!existente) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });

            const datosCliente = normalizarEstadoCliente(req.body);
            if (datosCliente.error) {
                return res.status(400).json({ success: false, error: datosCliente.error });
            }

            await Cliente.actualizar(req.params.id, datosCliente);
            const cliente = await Cliente.obtenerPorId(req.params.id);
            res.json({ success: true, data: cliente });
        } catch (error) {
            logError('[Clientes]', error);
            res.status(500).json({ success: false, error: 'Hubo un error al actualizar el cliente' });
        }
    },

    eliminarCliente: async (req, res) => {
        try {
            const { id } = req.params;
            await Cliente.eliminar(id);
            res.json({ success: true, mensaje: `Cliente número ${id} eliminado con éxito` });
        } catch (error) {
            logError('[Clientes]', error);
            res.status(500).json({ success: false, error: 'Hubo un error al eliminar el cliente' });
        }
    },

    // Registra el cobro (total o parcial) de la deuda histórica de un cliente
    // migrado de un sistema anterior. Descuenta el monto de clientes.deuda_historica
    // y lo asienta en caja_movimientos con un concepto explícito, para que el
    // dinero aparezca en Caja Diaria sin mezclarse con `pedidos` (que representa
    // ventas reales, no cobros de una deuda que ya existía antes del sistema).
    // Cuando la deuda llega a 0, estado_cliente vuelve a AL_DIA automáticamente.
    pagarDeuda: async (req, res) => {
        const pool = require('../config/database');
        const clienteId = req.params.id;
        const monto = Number(req.body.monto_pagado);

        if (!Number.isFinite(monto) || monto <= 0) {
            return res.status(400).json({ success: false, error: 'monto_pagado debe ser un número mayor a cero' });
        }

        const connection = await pool.getConnection();
        let transactionActive = false;

        try {
            await connection.beginTransaction();
            transactionActive = true;

            const [clientes] = await connection.query(
                'SELECT id, deuda_historica FROM clientes WHERE id = ? FOR UPDATE',
                [clienteId]
            );
            if (clientes.length === 0) {
                throw Object.assign(new Error('El cliente especificado no existe'), { statusCode: 404 });
            }

            const deudaActual = Number(clientes[0].deuda_historica);
            if (deudaActual <= 0) {
                throw Object.assign(new Error('El cliente no tiene deuda histórica pendiente'), { statusCode: 409 });
            }
            if (monto > deudaActual + 0.01) {
                throw Object.assign(
                    new Error(`No se permite pagar más de la deuda pendiente ($${deudaActual})`),
                    { statusCode: 409 }
                );
            }

            const nuevaDeuda = Math.max(0, Math.round((deudaActual - monto) * 100) / 100);
            const nuevoEstado = nuevaDeuda === 0 ? 'AL_DIA' : 'MOROSO';
            await connection.query(
                'UPDATE clientes SET deuda_historica = ?, estado_cliente = ? WHERE id = ?',
                [nuevaDeuda, nuevoEstado, clienteId]
            );

            await connection.query(
                `INSERT INTO caja_movimientos (cliente_id, tipo, concepto, monto, usuario_id)
                 VALUES (?, 'ingreso', 'Ingreso por deuda histórica', ?, ?)`,
                [clienteId, monto, req.user ? req.user.id : null]
            );

            await connection.commit();
            transactionActive = false;
            connection.release();

            res.json({ success: true, data: { id: Number(clienteId), deuda_historica: nuevaDeuda, estado_cliente: nuevoEstado } });
        } catch (err) {
            if (transactionActive) {
                await connection.rollback();
            }
            connection.release();

            if (err.statusCode) {
                return res.status(err.statusCode).json({ success: false, error: err.message });
            }
            logError('[Clientes]', err);
            res.status(500).json({ success: false, error: 'Error al registrar el pago de la deuda histórica' });
        }
    }
};

module.exports = clienteController;
