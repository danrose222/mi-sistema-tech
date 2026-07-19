const db = require('../config/database');

const Cliente = {
    obtenerPaginado: async ({ page = 1, limit = 20, search = '' }) => {
        const offset = (page - 1) * limit;
        const like = `%${search}%`;

        const where = search ? 'WHERE nombre LIKE ? OR email LIKE ? OR telefono LIKE ?' : '';
        const whereParams = search ? [like, like, like] : [];

        const [rows] = await db.query(
            `SELECT * FROM clientes ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...whereParams, limit, offset]
        );
        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total FROM clientes ${where}`,
            whereParams
        );

        return { data: rows, total: countRows[0].total };
    },

    obtenerPorId: async (id) => {
        const [rows] = await db.query('SELECT * FROM clientes WHERE id = ?', [id]);
        return rows[0];
    },

    crear: async (datosCliente) => {
        const { nombre, telefono, email, direccion, notas, dni, deuda_historica, estado_cliente } = datosCliente;
        const [result] = await db.query(
            'INSERT INTO clientes (nombre, telefono, email, direccion, notas, dni, deuda_historica, estado_cliente) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nombre, telefono || null, email || null, direccion || null, notas || null, dni || null, Number(deuda_historica) || 0, estado_cliente === 'MOROSO' ? 'MOROSO' : 'AL_DIA']
        );
        return result;
    },

    actualizar: async (id, datosCliente) => {
        const { nombre, telefono, email, direccion, notas, dni, deuda_historica, estado_cliente } = datosCliente;
        const [result] = await db.query(
            'UPDATE clientes SET nombre = ?, telefono = ?, email = ?, direccion = ?, notas = ?, dni = ?, deuda_historica = ?, estado_cliente = ? WHERE id = ?',
            [nombre, telefono || null, email || null, direccion || null, notas || null, dni || null, Number(deuda_historica) || 0, estado_cliente === 'MOROSO' ? 'MOROSO' : 'AL_DIA', id]
        );
        return result;
    },

    obtenerPorDni: async (dni) => {
        const [rows] = await db.query('SELECT * FROM clientes WHERE dni = ?', [dni]);
        return rows[0];
    },

    eliminar: async (id) => {
        const [result] = await db.query('DELETE FROM clientes WHERE id = ?', [id]);
        return result;
    }
};

module.exports = Cliente;