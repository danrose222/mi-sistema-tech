const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');

exports.listar = async (req, res) => {
  try {
    const usuarios = await userModel.listarUsuarios();
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error listing users' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const id = req.params.id;
    const usuario = await userModel.obtenerUsuarioPorId(id);
    if (!usuario) return res.status(404).json({ error: 'not found' });
    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error getting user' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, rol, password } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (rol !== undefined) updates.rol = rol;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }
    const affected = await userModel.actualizarUsuario(id, updates);
    if (!affected) return res.status(404).json({ error: 'not found or no changes' });
    const updated = await userModel.obtenerUsuarioPorId(id);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error updating user' });
  }
};

exports.borrar = async (req, res) => {
  try {
    const id = req.params.id;
    const affected = await userModel.borrarUsuario(id);
    if (!affected) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error deleting user' });
  }
};
