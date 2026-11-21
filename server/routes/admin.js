const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const {
  query,
  get,
  run,
  insertAndGetId,
  upsertSetting,
  getSettingsMap,
  isPostgres,
} = require('../db');
const { signAdminToken, requireAdmin } = require('../middleware/auth');
const { uploadMediaFile, getStorageStatus } = require('../services/storage');
const {
  getYoolaConfig,
  sendYoolaSms,
  sendPaymentVerifiedSms,
  sendOrderStatusSms,
} = require('../services/yoolaSms');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 55 * 1024 * 1024 }, // supports video adverts up to 55MB
});

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

function toDbBool(val) {
  const truthy = val === true || val === 'true' || val === 1 || val === '1';
  return isPostgres ? truthy : truthy ? 1 : 0;
}

// ==================== AUTH ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const admin = await get('SELECT * FROM admins WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin email or password.' });
    }
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid admin email or password.' });
    }
    const token = signAdminToken(admin);
    res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protect all routes below
router.use(requireAdmin);

router.get('/me', async (req, res) => {
  res.json({ admin: req.admin });
});

router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    const admin = await get('SELECT * FROM admins WHERE id = ?', [req.admin.id]);
    const valid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await run('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, admin.id]);
    res.json({ message: 'Admin password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DASHBOARD ====================
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [orders, products, adverts, news, transactions, smsLogs, storageStatus, yoolaConfig] =
      await Promise.all([
        query('SELECT * FROM orders ORDER BY created_at DESC'),
        query('SELECT * FROM products'),
        query('SELECT * FROM adverts'),
        query('SELECT * FROM news'),
        query('SELECT * FROM transactions ORDER BY tx_date DESC, id DESC'),
        query('SELECT * FROM sms_logs ORDER BY id DESC LIMIT 20'),
        getStorageStatus(),
        getYoolaConfig(),
      ]);

    const pendingVerification = orders.filter(
      (o) =>
        o.payment_status === 'pending_verification' ||
        o.payment_status === 'pay_on_delivery_pending' ||
        o.payment_status === 'pending_proof'
    ).length;

    const verifiedOrders = orders.filter((o) => o.payment_status === 'verified');
    const verifiedOrderRevenue = verifiedOrders.reduce((sum, o) => sum + Number(o.total_ugx || 0), 0);

    const todayIncome = transactions
      .filter((t) => t.tx_date === today && t.tx_type === 'income')
      .reduce((s, t) => s + Number(t.amount_ugx || 0), 0);

    const todayExpense = transactions
      .filter((t) => t.tx_date === today && t.tx_type === 'expense')
      .reduce((s, t) => s + Number(t.amount_ugx || 0), 0);

    const totalIncome = transactions
      .filter((t) => t.tx_type === 'income')
      .reduce((s, t) => s + Number(t.amount_ugx || 0), 0);

    const totalExpense = transactions
      .filter((t) => t.tx_type === 'expense')
      .reduce((s, t) => s + Number(t.amount_ugx || 0), 0);

    const bulkOrders = orders.filter((o) => o.delivery_type === 'bulk_free_delivery').length;
    const pickupOrders = orders.filter((o) => o.delivery_type === 'prison_unit_pickup').length;

    res.json({
      stats: {
        totalOrders: orders.length,
        pendingVerification,
        verifiedOrdersCount: verifiedOrders.length,
        verifiedOrderRevenue,
        todayIncome,
        todayExpense,
        todayNet: todayIncome - todayExpense,
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        totalProducts: products.length,
        activeProducts: products.filter((p) => p.active === true || p.active === 1).length,
        totalAdverts: adverts.length,
        totalNews: news.length,
        bulkOrders,
        pickupOrders,
        smsCount: smsLogs.length,
      },
      recentOrders: orders.slice(0, 8).map(formatOrder),
      integrations: {
        database: isPostgres ? 'PostgreSQL (Cloud)' : 'SQLite (Local)',
        storage: storageStatus,
        yoolaSms: {
          configured: yoolaConfig.configured,
          sandbox: yoolaConfig.sandbox,
          sender: yoolaConfig.sender,
          enabled: yoolaConfig.enabled,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PRODUCTS ====================
router.get('/products', async (req, res) => {
  try {
    const products = await query('SELECT * FROM products ORDER BY id DESC');
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const {
      sku,
      name,
      category,
      description,
      specifications = '',
      price_ugx,
      unit_label = 'Unit',
      stock_qty = 10,
      bulk_min_qty = 5,
      featured = false,
      active = true,
      image_url = '',
    } = req.body;

    if (!name || !category || !price_ugx) {
      return res.status(400).json({ error: 'Product name, category, and price tag (UGX) are required.' });
    }

    let finalImageUrl = image_url.trim() || '/images/products/wooden-bed.jpg';
    if (req.file) {
      const up = await uploadMediaFile(req.file, 'products');
      finalImageUrl = up.url;
    }

    const generatedSku =
      (sku && sku.trim()) ||
      `UPS-${category.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const id = await insertAndGetId(
      `INSERT INTO products (sku, name, category, description, specifications, price_ugx, unit_label, stock_qty, bulk_min_qty, image_url, featured, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedSku,
        name.trim(),
        category.trim(),
        (description || '').trim(),
        specifications.trim(),
        parseInt(price_ugx, 10),
        unit_label.trim(),
        parseInt(stock_qty, 10) || 0,
        parseInt(bulk_min_qty, 10) || 5,
        finalImageUrl,
        toDbBool(featured),
        toDbBool(active),
        now,
        now,
      ]
    );

    const product = await get('SELECT * FROM products WHERE id = ?', [id]);
    res.status(201).json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/products/:id', upload.single('image'), async (req, res) => {
  try {
    const existing = await get('SELECT * FROM products WHERE id = ?', [Number(req.params.id)]);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const {
      sku = existing.sku,
      name = existing.name,
      category = existing.category,
      description = existing.description,
      specifications = existing.specifications,
      price_ugx = existing.price_ugx,
      unit_label = existing.unit_label,
      stock_qty = existing.stock_qty,
      bulk_min_qty = existing.bulk_min_qty,
      featured = existing.featured,
      active = existing.active,
      image_url = existing.image_url,
    } = req.body;

    let finalImageUrl = image_url || existing.image_url;
    if (req.file) {
      const up = await uploadMediaFile(req.file, 'products');
      finalImageUrl = up.url;
    }

    const now = new Date().toISOString();
    await run(
      `UPDATE products
       SET sku=?, name=?, category=?, description=?, specifications=?, price_ugx=?, unit_label=?, stock_qty=?, bulk_min_qty=?, image_url=?, featured=?, active=?, updated_at=?
       WHERE id=?`,
      [
        sku.trim(),
        name.trim(),
        category.trim(),
        description.trim(),
        specifications.trim(),
        parseInt(price_ugx, 10),
        unit_label.trim(),
        parseInt(stock_qty, 10),
        parseInt(bulk_min_qty, 10),
        finalImageUrl,
        toDbBool(featured),
        toDbBool(active),
        now,
        existing.id,
      ]
    );

    const product = await get('SELECT * FROM products WHERE id = ?', [existing.id]);
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await run('DELETE FROM products WHERE id = ?', [Number(req.params.id)]);
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ORDERS & VERIFICATION ====================
router.get('/orders', async (req, res) => {
  try {
    const { status, payment_method, search } = req.query;
    let rows = await query('SELECT * FROM orders ORDER BY created_at DESC');

    if (status && status !== 'all') {
      if (status === 'needs_verification') {
        rows = rows.filter(
          (o) =>
            o.payment_status === 'pending_verification' ||
            o.payment_status === 'pay_on_delivery_pending' ||
            o.payment_status === 'pending_proof'
        );
      } else {
        rows = rows.filter((o) => o.order_status === status || o.payment_status === status);
      }
    }
    if (payment_method && payment_method !== 'all') {
      rows = rows.filter((o) => o.payment_method === payment_method);
    }
    if (search) {
      const q = String(search).toLowerCase();
      rows = rows.filter(
        (o) =>
          o.reference_code.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.toLowerCase().includes(q) ||
          o.district.toLowerCase().includes(q)
      );
    }

    res.json({ orders: rows.map(formatOrder) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/:id/verify', async (req, res) => {
  try {
    const order = await get('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { admin_notes = '', payment_tx_ref } = req.body || {};
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const txRef = payment_tx_ref ? payment_tx_ref.trim() : order.payment_tx_ref;

    await run(
      `UPDATE orders
       SET payment_status = 'verified', order_status = 'verified', payment_tx_ref = ?, verified_by = ?, verified_at = ?, admin_notes = ?, updated_at = ?
       WHERE id = ?`,
      [txRef, req.admin.name, now, admin_notes.trim(), now, order.id]
    );

    // Deduct stock safely
    let items = [];
    try {
      items = JSON.parse(order.items_json || '[]');
    } catch {
      items = [];
    }
    if (order.payment_status !== 'verified') {
      for (const item of items) {
        await run(
          'UPDATE products SET stock_qty = CASE WHEN stock_qty >= ? THEN stock_qty - ? ELSE 0 END WHERE id = ?',
          [item.quantity, item.quantity, item.product_id]
        );
      }

      // Auto-record in Financial Management Ledger if not already recorded for this order
      const existingTx = await get('SELECT id FROM transactions WHERE order_id = ?', [order.id]);
      if (!existingTx) {
        const primaryCat = items[0]?.category ? `${items[0].category} Sales` : 'Online Store Sales';
        const desc = `Verified Order ${order.reference_code} (${items.map((i) => `${i.quantity}x ${i.name}`).join(', ')})`;
        await run(
          `INSERT INTO transactions (tx_date, tx_type, category, payment_method, amount_ugx, reference_code, customer_or_party, description, order_id, recorded_by, created_at)
           VALUES (?, 'income', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            today,
            primaryCat,
            order.payment_method,
            order.total_ugx,
            order.reference_code,
            order.customer_name,
            desc.slice(0, 300),
            order.id,
            req.admin.name,
            now,
          ]
        );
      }
    }

    const updatedOrder = formatOrder(await get('SELECT * FROM orders WHERE id = ?', [order.id]));
    const sms = await sendPaymentVerifiedSms(updatedOrder).catch((e) => ({
      ok: false,
      error: e.message,
    }));

    res.json({
      order: updatedOrder,
      sms,
      message: 'Payment verified, transaction logged to Finance Ledger, and confirmation SMS sent!',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/:id/reject', async (req, res) => {
  try {
    const order = await get('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { reason = 'Proof of payment could not be verified. Please re-submit a clear receipt.' } = req.body;
    const now = new Date().toISOString();

    await run(
      `UPDATE orders SET payment_status = 'rejected', admin_notes = ?, updated_at = ? WHERE id = ?`,
      [reason.trim(), now, order.id]
    );

    const updatedOrder = formatOrder(await get('SELECT * FROM orders WHERE id = ?', [order.id]));
    const sms = await sendYoolaSms({
      phone: updatedOrder.customer_phone,
      message: `UPS Store Notice (${updatedOrder.reference_code}): Payment verification needs attention — ${reason.trim()}. Please upload valid proof on our website.`,
      eventType: 'payment_rejected',
      referenceCode: updatedOrder.reference_code,
    }).catch((e) => ({ ok: false, error: e.message }));

    res.json({ order: updatedOrder, sms, message: 'Order payment marked as rejected and customer notified.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const order = await get('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { order_status, admin_notes } = req.body;
    const allowed = ['pending_verification', 'verified', 'dispatched', 'ready_for_pickup', 'delivered', 'cancelled'];
    if (!allowed.includes(order_status)) {
      return res.status(400).json({ error: 'Invalid order status.' });
    }

    const now = new Date().toISOString();
    await run(
      'UPDATE orders SET order_status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = ? WHERE id = ?',
      [order_status, admin_notes !== undefined ? admin_notes : null, now, order.id]
    );

    const updatedOrder = formatOrder(await get('SELECT * FROM orders WHERE id = ?', [order.id]));
    const friendlyStatus = order_status.replace(/_/g, ' ');
    const sms = await sendOrderStatusSms(updatedOrder, friendlyStatus).catch((e) => ({
      ok: false,
      error: e.message,
    }));

    res.json({ order: updatedOrder, sms, message: `Order updated to ${friendlyStatus} and SMS sent.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADVERTS & AUTO-ANIMATION ====================
router.get('/adverts', async (req, res) => {
  try {
    const adverts = await query('SELECT * FROM adverts ORDER BY sort_order ASC, id DESC');
    res.json({ adverts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/adverts', upload.single('media'), async (req, res) => {
  try {
    const {
      title,
      subtitle = '',
      badge_text = 'OFFICIAL UPS PROMO',
      price_callout = '',
      cta_text = 'Shop Now',
      media_type,
      media_url = '',
      animation_style = 'ken-burns',
      duration_sec = 6,
      active = true,
      sort_order = 0,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Advert title is required.' });

    let finalUrl = media_url.trim();
    let detectedType = media_type || 'image';

    if (req.file) {
      const isVid = (req.file.mimetype || '').startsWith('video/');
      detectedType = isVid ? 'video' : 'image';
      const up = await uploadMediaFile(req.file, isVid ? 'adverts-video' : 'adverts-image');
      finalUrl = up.url;
    }

    if (!finalUrl) {
      return res.status(400).json({ error: 'Please upload an advert photo/video or choose a product image.' });
    }

    const now = new Date().toISOString();
    const id = await insertAndGetId(
      `INSERT INTO adverts (title, subtitle, badge_text, price_callout, cta_text, media_type, media_url, animation_style, duration_sec, active, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        subtitle.trim(),
        badge_text.trim(),
        price_callout.trim(),
        cta_text.trim(),
        detectedType,
        finalUrl,
        animation_style,
        parseInt(duration_sec, 10) || 6,
        toDbBool(active),
        parseInt(sort_order, 10) || 0,
        now,
      ]
    );

    const advert = await get('SELECT * FROM adverts WHERE id = ?', [id]);
    res.status(201).json({ advert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/adverts/:id', upload.single('media'), async (req, res) => {
  try {
    const existing = await get('SELECT * FROM adverts WHERE id = ?', [Number(req.params.id)]);
    if (!existing) return res.status(404).json({ error: 'Advert not found' });

    let finalUrl = req.body.media_url || existing.media_url;
    let detectedType = req.body.media_type || existing.media_type;
    if (req.file) {
      const isVid = (req.file.mimetype || '').startsWith('video/');
      detectedType = isVid ? 'video' : 'image';
      const up = await uploadMediaFile(req.file, isVid ? 'adverts-video' : 'adverts-image');
      finalUrl = up.url;
    }

    await run(
      `UPDATE adverts SET title=?, subtitle=?, badge_text=?, price_callout=?, cta_text=?, media_type=?, media_url=?, animation_style=?, duration_sec=?, active=?, sort_order=? WHERE id=?`,
      [
        (req.body.title ?? existing.title).trim(),
        (req.body.subtitle ?? existing.subtitle).trim(),
        (req.body.badge_text ?? existing.badge_text).trim(),
        (req.body.price_callout ?? existing.price_callout).trim(),
        (req.body.cta_text ?? existing.cta_text).trim(),
        detectedType,
        finalUrl,
        req.body.animation_style ?? existing.animation_style,
        parseInt(req.body.duration_sec ?? existing.duration_sec, 10) || 6,
        req.body.active !== undefined ? toDbBool(req.body.active) : existing.active,
        parseInt(req.body.sort_order ?? existing.sort_order, 10) || 0,
        existing.id,
      ]
    );

    const advert = await get('SELECT * FROM adverts WHERE id = ?', [existing.id]);
    res.json({ advert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/adverts/:id', async (req, res) => {
  try {
    await run('DELETE FROM adverts WHERE id = ?', [Number(req.params.id)]);
    res.json({ message: 'Advert deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NEWS ====================
router.get('/news', async (req, res) => {
  try {
    const news = await query('SELECT * FROM news ORDER BY created_at DESC');
    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/news', upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      category = 'Institutional News',
      summary,
      content,
      author = req.admin.name,
      published = true,
      image_url = '',
    } = req.body;

    if (!title || !summary || !content) {
      return res.status(400).json({ error: 'News title, summary, and full content are required.' });
    }

    let finalImg = image_url.trim();
    if (req.file) {
      const up = await uploadMediaFile(req.file, 'news');
      finalImg = up.url;
    }

    const now = new Date().toISOString();
    const id = await insertAndGetId(
      `INSERT INTO news (title, category, summary, content, image_url, author, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        category.trim(),
        summary.trim(),
        content.trim(),
        finalImg,
        author.trim(),
        toDbBool(published),
        now,
        now,
      ]
    );

    const article = await get('SELECT * FROM news WHERE id = ?', [id]);
    res.status(201).json({ article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/news/:id', upload.single('image'), async (req, res) => {
  try {
    const existing = await get('SELECT * FROM news WHERE id = ?', [Number(req.params.id)]);
    if (!existing) return res.status(404).json({ error: 'News article not found' });

    let finalImg = req.body.image_url ?? existing.image_url;
    if (req.file) {
      const up = await uploadMediaFile(req.file, 'news');
      finalImg = up.url;
    }

    const now = new Date().toISOString();
    await run(
      `UPDATE news SET title=?, category=?, summary=?, content=?, image_url=?, author=?, published=?, updated_at=? WHERE id=?`,
      [
        (req.body.title ?? existing.title).trim(),
        (req.body.category ?? existing.category).trim(),
        (req.body.summary ?? existing.summary).trim(),
        (req.body.content ?? existing.content).trim(),
        finalImg,
        (req.body.author ?? existing.author).trim(),
        req.body.published !== undefined ? toDbBool(req.body.published) : existing.published,
        now,
        existing.id,
      ]
    );

    const article = await get('SELECT * FROM news WHERE id = ?', [existing.id]);
    res.json({ article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/news/:id', async (req, res) => {
  try {
    await run('DELETE FROM news WHERE id = ?', [Number(req.params.id)]);
    res.json({ message: 'News article deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== FINANCIAL MANAGEMENT ====================
router.get('/transactions', async (req, res) => {
  try {
    const { from, to, type, payment_method } = req.query;
    let rows = await query('SELECT * FROM transactions ORDER BY tx_date DESC, id DESC');

    if (from) rows = rows.filter((t) => t.tx_date >= from);
    if (to) rows = rows.filter((t) => t.tx_date <= to);
    if (type && type !== 'all') rows = rows.filter((t) => t.tx_type === type);
    if (payment_method && payment_method !== 'all') {
      rows = rows.filter((t) => t.payment_method === payment_method);
    }

    const today = new Date().toISOString().slice(0, 10);
    const totalIncome = rows.filter((t) => t.tx_type === 'income').reduce((s, t) => s + Number(t.amount_ugx), 0);
    const totalExpense = rows.filter((t) => t.tx_type === 'expense').reduce((s, t) => s + Number(t.amount_ugx), 0);
    const todayIncome = rows
      .filter((t) => t.tx_date === today && t.tx_type === 'income')
      .reduce((s, t) => s + Number(t.amount_ugx), 0);
    const todayExpense = rows
      .filter((t) => t.tx_date === today && t.tx_type === 'expense')
      .reduce((s, t) => s + Number(t.amount_ugx), 0);

    const byPaymentMethod = {};
    for (const t of rows.filter((x) => x.tx_type === 'income')) {
      byPaymentMethod[t.payment_method] = (byPaymentMethod[t.payment_method] || 0) + Number(t.amount_ugx);
    }

    res.json({
      transactions: rows,
      summary: {
        todayDate: today,
        todayIncome,
        todayExpense,
        todayNet: todayIncome - todayExpense,
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        byPaymentMethod,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transactions', async (req, res) => {
  try {
    const {
      tx_date = new Date().toISOString().slice(0, 10),
      tx_type,
      category,
      payment_method,
      amount_ugx,
      reference_code = '',
      customer_or_party = '',
      description,
    } = req.body;

    if (!['income', 'expense'].includes(tx_type) || !category || !payment_method || !amount_ugx || !description) {
      return res.status(400).json({ error: 'All required financial transaction fields must be filled.' });
    }

    const now = new Date().toISOString();
    const id = await insertAndGetId(
      `INSERT INTO transactions (tx_date, tx_type, category, payment_method, amount_ugx, reference_code, customer_or_party, description, order_id, recorded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [
        tx_date,
        tx_type,
        category.trim(),
        payment_method.trim(),
        parseInt(amount_ugx, 10),
        reference_code.trim() || `FIN-${Date.now().toString().slice(-6)}`,
        customer_or_party.trim(),
        description.trim(),
        req.admin.name,
        now,
      ]
    );

    const tx = await get('SELECT * FROM transactions WHERE id = ?', [id]);
    res.status(201).json({ transaction: tx });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/transactions/:id', async (req, res) => {
  try {
    await run('DELETE FROM transactions WHERE id = ?', [Number(req.params.id)]);
    res.json({ message: 'Transaction deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SETTINGS, AWS S3 & YOOLA SMS ====================
router.get('/settings', async (req, res) => {
  try {
    const settings = await getSettingsMap();
    const storageStatus = await getStorageStatus();
    const yoolaConfig = await getYoolaConfig();
    const smsLogs = await query('SELECT * FROM sms_logs ORDER BY id DESC LIMIT 40');

    // Mask API key partially for UI display while still letting admin replace it
    const safeSettings = { ...settings };
    if (safeSettings.yoola_sms_api_key) {
      safeSettings.yoola_sms_api_key_masked =
        safeSettings.yoola_sms_api_key.slice(0, 4) + '••••••••' + safeSettings.yoola_sms_api_key.slice(-4);
    }

    res.json({
      settings: safeSettings,
      storageStatus,
      yoolaStatus: {
        configured: yoolaConfig.configured,
        sender: yoolaConfig.sender,
        sandbox: yoolaConfig.sandbox,
        enabled: yoolaConfig.enabled,
        apiUrl: yoolaConfig.apiUrl,
      },
      smsLogs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const allowedKeys = [
      'store_name',
      'store_tagline',
      'mtn_momo_number',
      'mtn_momo_name',
      'airtel_money_number',
      'airtel_money_name',
      'bank_name',
      'bank_account_name',
      'bank_account_number',
      'bank_branch',
      'bulk_min_qty',
      'bulk_min_ugx',
      'support_phone',
      'support_email',
      'yoola_sms_api_key',
      'yoola_sms_sender_id',
      'yoola_sms_sandbox',
      'yoola_sms_enabled',
      'aws_region',
      'aws_s3_bucket',
      'aws_s3_public_url',
    ];

    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        // Don't overwrite API key with empty string unless explicitly cleared via separate flag
        if (key === 'yoola_sms_api_key' && req.body[key] === '__UNCHANGED__') continue;
        await upsertSetting(key, req.body[key]);
      }
    }

    const updated = await getSettingsMap();
    res.json({ settings: updated, message: 'Settings saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sms/test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone) return res.status(400).json({ error: 'Recipient phone number is required.' });
    const text =
      (message && message.trim()) ||
      'Test notification from Uganda Prisons Service Products Store via Yoola SMS. System operational!';
    const result = await sendYoolaSms({
      phone,
      message: text,
      eventType: 'admin_test',
      referenceCode: 'TEST-SMS',
    });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
