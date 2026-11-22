const express = require('express');
const bcrypt = require('bcryptjs');
const { query, get, run, insertAndGetId } = require('../db');
const { signCustomerToken, requireCustomer } = require('../middleware/auth');
const { normalizeUgandaPhone, sendYoolaSms } = require('../services/yoolaSms');

const router = express.Router();

function sanitizeCustomer(row) {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}

function formatOrder(row) {
  let items = [];
  try {
    items = JSON.parse(row.items_json || '[]');
  } catch {
    items = [];
  }
  return { ...row, items };
}

router.post('/register', async (req, res) => {
  try {
    const {
      full_name,
      phone,
      email = '',
      password,
      default_district = 'Kampala',
      default_address = '',
      default_prison_unit = '',
    } = req.body;

    if (!full_name || !phone || !password) {
      return res.status(400).json({ error: 'Full name, phone number, and password are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normPhone = normalizeUgandaPhone(phone);
    if (!normPhone || normPhone.length < 9) {
      return res.status(400).json({ error: 'Please enter a valid Uganda phone number (e.g. 0772123456).' });
    }

    const existingPhone = await get('SELECT id FROM customers WHERE phone = ?', [normPhone]);
    if (existingPhone) {
      return res.status(409).json({
        error: 'An account with this phone number already exists. Please Sign In instead.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail) {
      const existingEmail = await get('SELECT id FROM customers WHERE LOWER(email) = ?', [cleanEmail]);
      if (existingEmail) {
        return res.status(409).json({
          error: 'An account with this email already exists. Please Sign In instead.',
        });
      }
    }

    const now = new Date().toISOString();
    const password_hash = await bcrypt.hash(String(password), 10);

    const id = await insertAndGetId(
      `INSERT INTO customers (full_name, phone, email, password_hash, default_district, default_address, default_prison_unit, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        normPhone,
        cleanEmail,
        password_hash,
        default_district.trim(),
        default_address.trim(),
        default_prison_unit.trim(),
        now,
        now,
      ]
    );

    const customer = sanitizeCustomer(await get('SELECT * FROM customers WHERE id = ?', [id]));
    const token = signCustomerToken(customer);

    // Send Welcome SMS via Yoola SMS asynchronously
    sendYoolaSms({
      phone: normPhone,
      message: `Welcome ${customer.full_name} to Uganda Prisons Service Official Online Market (UPS Market)! Shop furniture, leather shoes & certified seeds nationwide with Free Bulk Delivery or 26 Prison Pickup Units.`,
      eventType: 'customer_registered',
      referenceCode: `CUST-${customer.id}`,
    }).catch(() => {});

    res.status(201).json({
      token,
      customer,
      message: `Welcome ${customer.full_name}! Your UPS Market account has been created.`,
    });
  } catch (err) {
    console.error('[Customer Register Error]', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please enter your phone number (or email) and password.' });
    }

    const raw = String(identifier).trim();
    const normPhone = normalizeUgandaPhone(raw);

    const customer = await get(
      'SELECT * FROM customers WHERE phone = ? OR (email <> ? AND LOWER(email) = LOWER(?))',
      [normPhone, '', raw]
    );

    if (!customer) {
      return res.status(401).json({ error: 'Invalid phone/email or password.' });
    }

    const valid = await bcrypt.compare(String(password), customer.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid phone/email or password.' });
    }

    const safe = sanitizeCustomer(customer);
    const token = signCustomerToken(safe);
    res.json({ token, customer: safe, message: `Welcome back, ${safe.full_name}!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireCustomer, async (req, res) => {
  try {
    const customer = sanitizeCustomer(await get('SELECT * FROM customers WHERE id = ?', [req.customer.id]));
    if (!customer) return res.status(404).json({ error: 'Account not found.' });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', requireCustomer, async (req, res) => {
  try {
    const existing = await get('SELECT * FROM customers WHERE id = ?', [req.customer.id]);
    if (!existing) return res.status(404).json({ error: 'Account not found.' });

    const {
      full_name = existing.full_name,
      email = existing.email,
      default_district = existing.default_district,
      default_address = existing.default_address,
      default_prison_unit = existing.default_prison_unit,
    } = req.body;

    const now = new Date().toISOString();
    await run(
      `UPDATE customers
       SET full_name = ?, email = ?, default_district = ?, default_address = ?, default_prison_unit = ?, updated_at = ?
       WHERE id = ?`,
      [
        full_name.trim(),
        email.trim().toLowerCase(),
        default_district.trim(),
        default_address.trim(),
        default_prison_unit.trim(),
        now,
        existing.id,
      ]
    );

    const updated = sanitizeCustomer(await get('SELECT * FROM customers WHERE id = ?', [existing.id]));
    res.json({ customer: updated, message: 'Address book & profile updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders', requireCustomer, async (req, res) => {
  try {
    const customer = await get('SELECT * FROM customers WHERE id = ?', [req.customer.id]);
    if (!customer) return res.status(404).json({ error: 'Account not found.' });

    const allOrders = await query('SELECT * FROM orders ORDER BY created_at DESC');
    const custNorm = normalizeUgandaPhone(customer.phone);

    const mine = allOrders.filter(
      (o) =>
        Number(o.customer_id) === Number(customer.id) ||
        normalizeUgandaPhone(o.customer_phone) === custNorm
    );

    res.json({ orders: mine.map(formatOrder) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
