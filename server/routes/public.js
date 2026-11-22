const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const { query, get, run, insertAndGetId, getSettingsMap, isPostgres } = require('../db');
const { UGANDA_PRISON_UNITS } = require('../data/prisonUnits');
const { uploadMediaFile, getStorageStatus } = require('../services/storage');
const { sendOrderCreatedSms, sendProofSubmittedSms } = require('../services/yoolaSms');
const { optionalCustomer } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function generateReferenceCode() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = crypto.randomInt(1000, 9999);
  return `UPS-${y}${m}${day}-${rand}`;
}

function formatOrder(row) {
  if (!row) return null;
  let items = [];
  try {
    items = JSON.parse(row.items_json || '[]');
  } catch {
    items = [];
  }
  return { ...row, items };
}

router.get('/health', async (req, res) => {
  try {
    await get('SELECT 1 as ok');
    const storage = await getStorageStatus();
    res.json({
      ok: true,
      service: 'Uganda Prisons Service Products Store',
      database: isPostgres ? 'PostgreSQL' : 'SQLite',
      storage: storage.provider,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/store-info', async (req, res) => {
  try {
    const s = await getSettingsMap();
    res.json({
      storeName: s.store_name || 'Uganda Prisons Service Products Store',
      storeTagline: s.store_tagline || '',
      payments: {
        mtnMomo: {
          number: s.mtn_momo_number || '',
          accountName: s.mtn_momo_name || 'Uganda Prisons Service Industries',
        },
        airtelMoney: {
          number: s.airtel_money_number || '',
          accountName: s.airtel_money_name || 'Uganda Prisons Service Industries',
        },
        bank: {
          bankName: s.bank_name || '',
          accountName: s.bank_account_name || '',
          accountNumber: s.bank_account_number || '',
          branch: s.bank_branch || '',
        },
      },
      bulkRules: {
        minQty: Number(s.bulk_min_qty || 5),
        minUgx: Number(s.bulk_min_ugx || 1000000),
      },
      support: {
        phone: s.support_phone || '+256 394 915 409',
        email: s.support_email || 'sales@prisons.go.ug',
      },
      prisonUnits: UGANDA_PRISON_UNITS,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    const activeVal = isPostgres ? true : 1;
    let rows = await query('SELECT * FROM products WHERE active = ? ORDER BY featured DESC, id ASC', [activeVal]);

    if (category && category !== 'All') {
      rows = rows.filter((p) => p.category.toLowerCase() === String(category).toLowerCase());
    }
    if (search) {
      const q = String(search).toLowerCase().trim();
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }
    if (sort === 'price_asc') rows.sort((a, b) => a.price_ugx - b.price_ugx);
    if (sort === 'price_desc') rows.sort((a, b) => b.price_ugx - a.price_ugx);
    if (sort === 'name_asc') rows.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ products: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await get('SELECT * FROM products WHERE id = ?', [Number(req.params.id)]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/adverts', async (req, res) => {
  try {
    const activeVal = isPostgres ? true : 1;
    const adverts = await query(
      'SELECT * FROM adverts WHERE active = ? ORDER BY sort_order ASC, id DESC',
      [activeVal]
    );
    res.json({ adverts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/news', async (req, res) => {
  try {
    const pubVal = isPostgres ? true : 1;
    const news = await query(
      'SELECT * FROM news WHERE published = ? ORDER BY created_at DESC',
      [pubVal]
    );
    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders', optionalCustomer, async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email = '',
      district,
      delivery_address = '',
      prison_unit = '',
      payment_method,
      items = [],
    } = req.body;

    if (!customer_name || !customer_phone || !district || !payment_method) {
      return res.status(400).json({
        error: 'Please provide your full name, phone number, district, and payment method.',
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your order must include at least one product.' });
    }

    const validPayments = [
      'MTN Mobile Money (MoMo)',
      'Airtel Money',
      'Bank Transfer (UPS Account)',
      'Cash / Pay on Delivery',
    ];
    if (!validPayments.includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method selected.' });
    }

    const settings = await getSettingsMap();
    const bulkMinQty = Number(settings.bulk_min_qty || 5);
    const bulkMinUgx = Number(settings.bulk_min_ugx || 1000000);

    let subtotal = 0;
    let totalQty = 0;
    let itemQualifiesBulk = false;
    const verifiedItems = [];

    for (const item of items) {
      const prod = await get('SELECT * FROM products WHERE id = ?', [Number(item.product_id)]);
      if (!prod) {
        return res.status(400).json({ error: `Product ID ${item.product_id} is no longer available.` });
      }
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const lineTotal = prod.price_ugx * qty;
      subtotal += lineTotal;
      totalQty += qty;
      if (qty >= Number(prod.bulk_min_qty || bulkMinQty)) {
        itemQualifiesBulk = true;
      }
      verifiedItems.push({
        product_id: prod.id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        unit_label: prod.unit_label,
        price_ugx: prod.price_ugx,
        quantity: qty,
        line_total_ugx: lineTotal,
        image_url: prod.image_url,
      });
    }

    const isBulk = itemQualifiesBulk || totalQty >= bulkMinQty || subtotal >= bulkMinUgx;
    const delivery_type = isBulk ? 'bulk_free_delivery' : 'prison_unit_pickup';

    if (delivery_type === 'bulk_free_delivery' && !delivery_address.trim()) {
      return res.status(400).json({
        error: 'Your order qualifies for FREE Bulk Delivery! Please provide your delivery address/location.',
      });
    }
    if (delivery_type === 'prison_unit_pickup' && !prison_unit.trim()) {
      return res.status(400).json({
        error: 'Please select a nearby Uganda Prisons Service unit for order pickup.',
      });
    }

    let reference_code = generateReferenceCode();
    // Ensure uniqueness
    while (await get('SELECT id FROM orders WHERE reference_code = ?', [reference_code])) {
      reference_code = generateReferenceCode();
    }

    const now = new Date().toISOString();
    const payment_status =
      payment_method === 'Cash / Pay on Delivery' ? 'pay_on_delivery_pending' : 'pending_proof';
    const order_status = 'pending_verification';

    const orderId = await insertAndGetId(
      `INSERT INTO orders (
        reference_code, customer_id, customer_name, customer_phone, customer_email, district,
        delivery_type, delivery_address, prison_unit, payment_method,
        payment_status, order_status, subtotal_ugx, delivery_fee_ugx, total_ugx,
        items_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reference_code,
        req.customer?.id || null,
        customer_name.trim(),
        customer_phone.trim(),
        customer_email.trim(),
        district.trim(),
        delivery_type,
        delivery_address.trim(),
        prison_unit.trim(),
        payment_method,
        payment_status,
        order_status,
        subtotal,
        0,
        subtotal,
        JSON.stringify(verifiedItems),
        now,
        now,
      ]
    );

    const createdOrder = formatOrder(await get('SELECT * FROM orders WHERE id = ?', [orderId]));

    // Trigger Yoola SMS notification asynchronously (capture result cleanly)
    const smsResult = await sendOrderCreatedSms(createdOrder).catch((e) => ({
      ok: false,
      error: e.message,
    }));

    res.status(201).json({
      order: createdOrder,
      sms: smsResult,
      message: `Order created! Your automated Purchase Reference is ${reference_code}.`,
    });
  } catch (err) {
    console.error('[Order Create Error]', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/track/:reference', async (req, res) => {
  try {
    const ref = String(req.params.reference || '').trim().toUpperCase();
    const order = await get('SELECT * FROM orders WHERE UPPER(reference_code) = ?', [ref]);
    if (!order) {
      return res.status(404).json({
        error: `No order found with Purchase Reference "${ref}". Please check your reference code and try again.`,
      });
    }
    res.json({ order: formatOrder(order) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/:reference/proof', upload.single('proof'), async (req, res) => {
  try {
    const ref = String(req.params.reference || '').trim().toUpperCase();
    const order = await get('SELECT * FROM orders WHERE UPPER(reference_code) = ?', [ref]);
    if (!order) {
      return res.status(404).json({ error: 'Order reference not found.' });
    }

    const { payment_tx_ref = '', proof_notes = '', customer_name = '' } = req.body;
    let proofUrl = order.payment_proof_url || '';

    if (req.file) {
      const uploaded = await uploadMediaFile(req.file, 'proofs');
      proofUrl = uploaded.url;
    }

    if (!proofUrl && !payment_tx_ref.trim()) {
      return res.status(400).json({
        error: 'Please upload a payment receipt image/PDF or enter your Mobile Money / Bank Transaction ID.',
      });
    }

    const now = new Date().toISOString();
    const updatedNotes = [
      customer_name ? `Submitted by: ${customer_name.trim()}` : '',
      proof_notes ? proof_notes.trim() : '',
    ]
      .filter(Boolean)
      .join(' | ');

    await run(
      `UPDATE orders
       SET payment_tx_ref = ?, payment_proof_url = ?, proof_notes = ?, payment_status = 'pending_verification', updated_at = ?
       WHERE id = ?`,
      [payment_tx_ref.trim(), proofUrl, updatedNotes, now, order.id]
    );

    const updatedOrder = formatOrder(await get('SELECT * FROM orders WHERE id = ?', [order.id]));
    const smsResult = await sendProofSubmittedSms(updatedOrder).catch((e) => ({
      ok: false,
      error: e.message,
    }));

    res.json({
      order: updatedOrder,
      sms: smsResult,
      message: 'Proof of payment submitted! Sales Admin will verify your payment and send confirmation SMS.',
    });
  } catch (err) {
    console.error('[Proof Upload Error]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
