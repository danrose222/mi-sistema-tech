const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está configurado. Definilo en las variables de entorno antes de iniciar el servidor.');
}

exports.authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // El token firma el id de usuario en el claim estándar `sub`; normalizamos a
    // `id` acá porque el resto del backend (ej. creditos.routes.js) lee req.user.id.
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'token expired' });
    }
    return res.status(401).json({ error: 'invalid token' });
  }
};

exports.authorizeRole = (roles = []) => (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'unauthenticated' });
  if (!roles.length || roles.includes(user.role)) return next();
  return res.status(403).json({ error: 'forbidden' });
};
