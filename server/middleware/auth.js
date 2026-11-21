const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ups-store-dev-secret-change-in-production-2026';

function signAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in to the Admin Portal.' });
  }
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

module.exports = { signAdminToken, requireAdmin };
