const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ups-store-dev-secret-change-in-production-2026';

function signAdminToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name, role: admin.role, type: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function signCustomerToken(customer) {
  return jwt.sign(
    {
      id: customer.id,
      phone: customer.phone,
      email: customer.email || '',
      full_name: customer.full_name,
      type: 'customer',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in to the Admin Portal.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type === 'customer') {
      return res.status(403).json({ error: 'Admin privileges required.' });
    }
    req.admin = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Please sign in to your UPS Market account.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'customer') {
      return res.status(401).json({ error: 'Invalid customer session.' });
    }
    req.customer = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session expired. Please sign in again.' });
  }
}

function optionalCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type === 'customer') {
        req.customer = decoded;
      }
    } catch {
      // ignore invalid optional token
    }
  }
  return next();
}

module.exports = {
  signAdminToken,
  signCustomerToken,
  requireAdmin,
  requireCustomer,
  optionalCustomer,
};
