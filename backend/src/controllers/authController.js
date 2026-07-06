const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

exports.register = async (req, res) => {
  try {
    const { username, password, nombre, rol } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const existing = await userModel.obtenerUsuarioPorUsername(username);
    if (existing) return res.status(409).json({ error: 'username already exists' });

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const userId = await userModel.crearUsuario({ username, password_hash: hash, nombre, rol });
    const user = await userModel.obtenerUsuarioPorId(userId);
    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error creating user' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const user = await userModel.obtenerUsuarioPorUsername(username);
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign({ sub: user.id, role: user.rol }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ 
      token, 
      usuario: { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error logging in' });
  }
};
