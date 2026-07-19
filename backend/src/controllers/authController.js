const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está configurado. Definilo en las variables de entorno antes de iniciar el servidor.');
}

exports.register = async (req, res) => {
  try {
    const { username, password, nombre } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const existing = await userModel.obtenerUsuarioPorUsername(username);
    if (existing) return res.status(409).json({ error: 'username already exists' });

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    // El rol nunca se toma del body: el registro público solo puede crear cuentas 'cajero'.
    // Para crear administradores usar POST /api/admin/usuarios (requiere sesión de admin).
    const userId = await userModel.crearUsuario({ username, password_hash: hash, nombre, rol: 'cajero' });
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

    const token = jwt.sign({ sub: user.id, role: user.rol }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ 
      token, 
      usuario: { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error logging in' });
  }
};
