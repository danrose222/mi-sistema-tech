const Cliente = require('../models/clienteModel');

const clienteController = {
    listarClientes: async (req, res) => {
        try {
            const clientes = await Cliente.obtenerTodos();
            res.json(clientes);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Hubo un error al obtener los clientes' });
        }
    },

    registrarCliente: async (req, res) => {
        try {
            const nuevoCliente = await Cliente.crear(req.body);
            res.status(201).json({ 
                mensaje: 'Cliente guardado con éxito', 
                id: nuevoCliente.insertId 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Hubo un error al guardar el cliente' });
        }
    },

    eliminarCliente: async (req, res) => {
        try {
            const { id } = req.params; 
            await Cliente.eliminar(id);
            res.json({ mensaje: `Cliente número ${id} eliminado con éxito` });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Hubo un error al eliminar el cliente' });
        }
    }
};

module.exports = clienteController;