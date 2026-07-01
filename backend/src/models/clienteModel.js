const db = require('../config/database');

const Cliente = {
    obtenerTodos: async () => {
        const [rows] = await db.query('SELECT * FROM clientes');
        return rows;
    },
    
    crear: async (datosCliente) => {
        const { nombre, telefono, email } = datosCliente;
        const [result] = await db.query(
            'INSERT INTO clientes (nombre, telefono, email) VALUES (?, ?, ?)',
            [nombre, telefono, email]
        );
        return result;
    },
    
    eliminar: async (id) => {
        const [result] = await db.query('DELETE FROM clientes WHERE id = ?', [id]);
        return result;
    }
};

module.exports = Cliente;