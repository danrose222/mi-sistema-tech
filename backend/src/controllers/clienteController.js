const Cliente = require('../models/clienteModel');

const clienteController = {
    listarClientes: async (req, res) => {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const search = req.query.search || '';

            const { data, total } = await Cliente.obtenerPaginado({ page, limit, search });
            res.json({ success: true, data, total });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Hubo un error al obtener los clientes' });
        }
    },

    obtenerCliente: async (req, res) => {
        try {
            const cliente = await Cliente.obtenerPorId(req.params.id);
            if (!cliente) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
            res.json({ success: true, data: cliente });
        } catch (error) {
            console.error(error);
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

            const nuevoCliente = await Cliente.crear(req.body);
            const cliente = await Cliente.obtenerPorId(nuevoCliente.insertId);
            res.status(201).json({ success: true, data: cliente });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Hubo un error al guardar el cliente' });
        }
    },

    actualizarCliente: async (req, res) => {
        try {
            const existente = await Cliente.obtenerPorId(req.params.id);
            if (!existente) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });

            await Cliente.actualizar(req.params.id, req.body);
            const cliente = await Cliente.obtenerPorId(req.params.id);
            res.json({ success: true, data: cliente });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Hubo un error al actualizar el cliente' });
        }
    },

    eliminarCliente: async (req, res) => {
        try {
            const { id } = req.params;
            await Cliente.eliminar(id);
            res.json({ success: true, mensaje: `Cliente número ${id} eliminado con éxito` });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Hubo un error al eliminar el cliente' });
        }
    }
};

module.exports = clienteController;
