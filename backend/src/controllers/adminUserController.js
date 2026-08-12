const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const logError = require('../utils/logError');

const PASSWORD_MIN_LENGTH = 8;

exports.crear = async (req, res) => {
  try {
    const { username, password, nombre, rol } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ error: `password must be at least ${PASSWORD_MIN_LENGTH} characters` });
    }

    const existing = await userModel.obtenerUsuarioPorUsername(username);
    if (existing) return res.status(409).json({ error: 'username already exists' });

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const userId = await userModel.crearUsuario({ username, password_hash: hash, nombre, rol });
    const usuario = await userModel.obtenerUsuarioPorId(userId);
    res.status(201).json(usuario);
  } catch (err) {
    logError('[AdminUsuarios]', err);
    res.status(500).json({ error: 'error creating user' });
  }
};

exports.listar = async (req, res) => {
  try {
    const usuarios = await userModel.listarUsuarios();
    res.json(usuarios);
  } catch (err) {
    logError('[AdminUsuarios]', err);
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
    logError('[AdminUsuarios]', err);
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
      if (password.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({ error: `password must be at least ${PASSWORD_MIN_LENGTH} characters` });
      }
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }
    const affected = await userModel.actualizarUsuario(id, updates);
    if (!affected) return res.status(404).json({ error: 'not found or no changes' });
    const updated = await userModel.obtenerUsuarioPorId(id);
    res.json(updated);
  } catch (err) {
    logError('[AdminUsuarios]', err);
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
    logError('[AdminUsuarios]', err);
    res.status(500).json({ error: 'error deleting user' });
  }
};
