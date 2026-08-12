const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logError = require('../utils/logError');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está configurado. Definilo en las variables de entorno antes de iniciar el servidor.');
}

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
    logError('[Auth]', err);
    res.status(500).json({ error: 'error logging in' });
  }
};
