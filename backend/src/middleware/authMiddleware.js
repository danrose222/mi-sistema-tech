const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

exports.authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
};

exports.authorizeRole = (roles = []) => (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'unauthenticated' });
  if (!roles.length || roles.includes(user.role)) return next();
  return res.status(403).json({ error: 'forbidden' });
};
