const pool = require('../config/database');

exports.crearUsuario = async ({ username, password_hash, nombre, rol }) => {
  const [result] = await pool.query(
    'INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)',
    [username, password_hash, nombre || null, rol || 'cajero']
  );
  return result.insertId;
};

exports.obtenerUsuarioPorUsername = async (username) => {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE username = ? LIMIT 1', [username]);
  return rows[0];
};

exports.obtenerUsuarioPorId = async (id) => {
  const [rows] = await pool.query('SELECT id, username, nombre, rol, created_at FROM usuarios WHERE id = ?', [id]);
  return rows[0];
};

exports.listarUsuarios = async () => {
  const [rows] = await pool.query('SELECT id, username, nombre, rol, created_at FROM usuarios ORDER BY created_at DESC');
  return rows;
};

exports.actualizarUsuario = async (id, { nombre, rol, password_hash }) => {
  const fields = [];
  const values = [];
  if (nombre !== undefined) {
    fields.push('nombre = ?');
    values.push(nombre);
  }
  if (rol !== undefined) {
    fields.push('rol = ?');
    values.push(rol);
  }
  if (password_hash) {
    fields.push('password_hash = ?');
    values.push(password_hash);
  }
  if (!fields.length) return 0;
  values.push(id);
  const [result] = await pool.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
  return result.affectedRows;
};

exports.borrarUsuario = async (id) => {
  const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
  return result.affectedRows;
};
