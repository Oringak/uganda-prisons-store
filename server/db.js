const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const isPostgres = Boolean(process.env.DATABASE_URL);
let pgPool = null;
let sqliteDb = null;

function convertPlaceholdersToPg(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

async function initConnection() {
  if (isPostgres) {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
    });
    await pgPool.query('SELECT 1');
    console.log('[DB] Connected to PostgreSQL');
  } else {
    const { DatabaseSync } = require('node:sqlite');
    const dataDir = path.join(__dirname, '..', 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = path.join(dataDir, 'ups_store.sqlite');
    sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec('PRAGMA foreign_keys = ON;');
    console.log('[DB] Connected to local SQLite:', dbPath);
  }
}

async function query(sql, params = []) {
  if (isPostgres) {
    const pgSql = convertPlaceholdersToPg(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  }
  const stmt = sqliteDb.prepare(sql);
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT') || trimmed.includes('RETURNING')) {
    return stmt.all(...params);
  }
  stmt.run(...params);
  return [];
}

async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  if (isPostgres) {
    const pgSql = convertPlaceholdersToPg(sql);
    const res = await pgPool.query(pgSql, params);
    return {
      changes: res.rowCount,
      lastInsertRowid: res.rows?.[0]?.id ?? null,
    };
  }
  const stmt = sqliteDb.prepare(sql);
  const info = stmt.run(...params);
  return {
    changes: info.changes,
    lastInsertRowid: Number(info.lastInsertRowid || 0),
  };
}

async function insertAndGetId(sql, params = []) {
  if (isPostgres) {
    const pgSql = convertPlaceholdersToPg(sql) + ' RETURNING id';
    const res = await pgPool.query(pgSql, params);
    return res.rows[0]?.id;
  }
  const stmt = sqliteDb.prepare(sql);
  const info = stmt.run(...params);
  return Number(info.lastInsertRowid);
}

async function createTables() {
  const idType = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const moneyType = isPostgres ? 'BIGINT' : 'INTEGER';
  const boolTrue = isPostgres ? 'TRUE' : '1';
  const boolFalse = isPostgres ? 'FALSE' : '0';
  const boolType = isPostgres ? 'BOOLEAN' : 'INTEGER';

  const statements = [
    `CREATE TABLE IF NOT EXISTS admins (
      id ${idType},
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales_admin',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id ${idType},
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      specifications TEXT DEFAULT '',
      price_ugx ${moneyType} NOT NULL,
      unit_label TEXT NOT NULL DEFAULT 'Unit',
      stock_qty INTEGER NOT NULL DEFAULT 10,
      bulk_min_qty INTEGER NOT NULL DEFAULT 5,
      image_url TEXT NOT NULL,
      featured ${boolType} NOT NULL DEFAULT ${boolFalse},
      active ${boolType} NOT NULL DEFAULT ${boolTrue},
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id ${idType},
      reference_code TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT DEFAULT '',
      district TEXT NOT NULL,
      delivery_type TEXT NOT NULL,
      delivery_address TEXT DEFAULT '',
      prison_unit TEXT DEFAULT '',
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending_proof',
      order_status TEXT NOT NULL DEFAULT 'pending_verification',
      subtotal_ugx ${moneyType} NOT NULL,
      delivery_fee_ugx ${moneyType} NOT NULL DEFAULT 0,
      total_ugx ${moneyType} NOT NULL,
      items_json TEXT NOT NULL,
      payment_tx_ref TEXT DEFAULT '',
      payment_proof_url TEXT DEFAULT '',
      proof_notes TEXT DEFAULT '',
      verified_by TEXT DEFAULT '',
      verified_at TEXT DEFAULT '',
      admin_notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS adverts (
      id ${idType},
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      badge_text TEXT DEFAULT 'OFFICIAL PROMO',
      price_callout TEXT DEFAULT '',
      cta_text TEXT DEFAULT 'Shop Now',
      media_type TEXT NOT NULL DEFAULT 'image',
      media_url TEXT NOT NULL,
      animation_style TEXT NOT NULL DEFAULT 'ken-burns',
      duration_sec INTEGER NOT NULL DEFAULT 6,
      active ${boolType} NOT NULL DEFAULT ${boolTrue},
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS news (
      id ${idType},
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Institutional News',
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      author TEXT NOT NULL DEFAULT 'UPS Public Relations & Production Desk',
      published ${boolType} NOT NULL DEFAULT ${boolTrue},
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id ${idType},
      tx_date TEXT NOT NULL,
      tx_type TEXT NOT NULL,
      category TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      amount_ugx ${moneyType} NOT NULL,
      reference_code TEXT DEFAULT '',
      customer_or_party TEXT DEFAULT '',
      description TEXT NOT NULL,
      order_id INTEGER DEFAULT NULL,
      recorded_by TEXT NOT NULL DEFAULT 'System',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sms_logs (
      id ${idType},
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      event_type TEXT NOT NULL,
      reference_code TEXT DEFAULT '',
      provider_status TEXT NOT NULL,
      provider_response TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )`,
  ];

  for (const stmt of statements) {
    await run(stmt);
  }
}

async function upsertSetting(key, value) {
  const now = new Date().toISOString();
  const existing = await get('SELECT key FROM settings WHERE key = ?', [key]);
  if (existing) {
    await run('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?', [String(value), now, key]);
  } else {
    await run('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [key, String(value), now]);
  }
}

async function getSettingsMap() {
  const rows = await query('SELECT key, value FROM settings');
  const map = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

async function seedInitialData() {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // 1. Seed default Admin
  const adminCount = await get('SELECT COUNT(*) as cnt FROM admins');
  if (Number(adminCount.cnt) === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@prisons.go.ug';
    const pass = process.env.ADMIN_PASSWORD || 'UPSAdmin@2026';
    const name = process.env.ADMIN_NAME || 'UPS Sales Administrator';
    const hash = await bcrypt.hash(pass, 10);
    await run(
      'INSERT INTO admins (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, 'super_admin', now]
    );
    console.log(`[DB] Seeded default admin account: ${email}`);
  }

  // 2. Seed default Settings
  const defaultSettings = {
    store_name: 'Uganda Prisons Service Products Store',
    store_tagline: 'Quality Handcrafted Furniture, Genuine Leather Footwear & Certified Agricultural Seeds',
    mtn_momo_number: '0772 000 111 / Merchant Code: 441290',
    mtn_momo_name: 'Uganda Prisons Service Industries',
    airtel_money_number: '0701 000 222 / Merchant Code: 662104',
    airtel_money_name: 'Uganda Prisons Service Industries',
    bank_name: 'Stanbic Bank Uganda / Bank of Uganda Collection',
    bank_account_name: 'Uganda Prisons Service Production & Industries Account',
    bank_account_number: '9030011224508',
    bank_branch: 'Kampala Corporate Branch',
    bulk_min_qty: '5',
    bulk_min_ugx: '1000000',
    support_phone: '+256 394 915 409',
    support_email: 'sales@prisons.go.ug',
    yoola_sms_api_key: process.env.YOOLA_SMS_API_KEY || '',
    yoola_sms_sender_id: process.env.YOOLA_SMS_SENDER_ID || 'UPS-STORE',
    yoola_sms_sandbox: process.env.YOOLA_SMS_SANDBOX || 'true',
    yoola_sms_enabled: 'true',
    aws_region: process.env.AWS_REGION || 'eu-west-1',
    aws_s3_bucket: process.env.AWS_S3_BUCKET || '',
    aws_s3_public_url: process.env.AWS_S3_PUBLIC_URL || '',
  };

  for (const [k, v] of Object.entries(defaultSettings)) {
    const existing = await get('SELECT key FROM settings WHERE key = ?', [k]);
    if (!existing) {
      await run('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [k, v, now]);
    }
  }

  // 3. Seed Products
  const productCount = await get('SELECT COUNT(*) as cnt FROM products');
  if (Number(productCount.cnt) === 0) {
    const seedProducts = [
      {
        sku: 'UPS-FUR-001',
        name: 'Solid Ugandan Mahogany Bed (5x6 ft)',
        category: 'Furniture',
        description: 'Master-crafted solid Ugandan Mahogany 5x6 wooden bed frame built at Luzira Prison Industries Carpentry Workshop. Seasoned kiln-dried timber, hand-carved headboard, reinforced hardwood slats, and high-gloss protective lacquer.',
        specifications: 'Dimensions: 5ft x 6ft | Timber: Grade-A Mahogany | Finish: Natural Satin Varnish | Warranty: 5 Years Structural',
        price_ugx: 1250000,
        unit_label: 'Bed Frame',
        stock_qty: 18,
        bulk_min_qty: 3,
        image_url: '/images/products/wooden-bed.jpg',
        featured: true,
      },
      {
        sku: 'UPS-FUR-002',
        name: 'Mvule Hardwood 6-Seater Dining Table & Chairs Set',
        category: 'Furniture',
        description: 'Executive solid Mvule hardwood dining table paired with matching ergonomically contoured wooden chairs. Built for homes, hotels, and institutional boardrooms with mortise-and-tenon joinery.',
        specifications: 'Table: 180cm x 95cm | Material: Solid Mvule Timber | Includes: 1 Table + 4 to 6 Chairs | Origin: Luzira Woodworks',
        price_ugx: 1850000,
        unit_label: 'Full Set',
        stock_qty: 10,
        bulk_min_qty: 2,
        image_url: '/images/products/wooden-dining-set.jpg',
        featured: true,
      },
      {
        sku: 'UPS-FUR-003',
        name: 'Classic Hardwood Dining & Conference Chairs (Pair)',
        category: 'Furniture',
        description: 'Heavy-duty solid hardwood wooden chairs crafted for dining rooms, offices, schools, and conference halls. Comfortable slatted backrest and scratch-resistant wood polish.',
        specifications: 'Pack: 2 Matching Chairs | Material: Solid Mvule/Mahogany | Weight Rating: 150kg per chair',
        price_ugx: 320000,
        unit_label: 'Pair (2 Chairs)',
        stock_qty: 45,
        bulk_min_qty: 5,
        image_url: '/images/products/wooden-dining-set.jpg',
        featured: false,
      },
      {
        sku: 'UPS-FUR-004',
        name: 'King Size Carved Mahogany Bed (6x6 ft)',
        category: 'Furniture',
        description: 'Flagship luxury 6x6 king-size bed hand-finished by master prison artisans. Engineered for multi-decade durability with deep wood grain richness and optional under-bed storage drawers.',
        specifications: 'Dimensions: 6ft x 6ft | Timber: Solid Mature Mahogany | Free Bulk Delivery Eligible',
        price_ugx: 1550000,
        unit_label: 'Bed Frame',
        stock_qty: 12,
        bulk_min_qty: 2,
        image_url: '/images/products/wooden-bed.jpg',
        featured: false,
      },
      {
        sku: 'UPS-LTH-001',
        name: 'Genuine Full-Grain Leather Formal Oxford Shoes',
        category: 'Leather Footwear',
        description: 'Hand-stitched 100% genuine Ugandan cowhide leather formal dress shoes from the UPS Leathercraft Workshop. Cushioned leather insole, stitched anti-slip rubber outsole, and mirror-shine finish ideal for office and uniform wear.',
        specifications: 'Material: 100% Full-Grain Cowhide Leather | Sizes: EU 39 - 46 | Color: Classic Jet Black | Sole: Stitched Durable Rubber',
        price_ugx: 145000,
        unit_label: 'Pair',
        stock_qty: 85,
        bulk_min_qty: 10,
        image_url: '/images/products/leather-shoes.jpg',
        featured: true,
      },
      {
        sku: 'UPS-LTH-002',
        name: 'Handcrafted Genuine Leather Steppers & Sandals',
        category: 'Leather Footwear',
        description: 'Comfortable everyday leather steppers and sandals made from thick saddle-stitched dark brown full-grain leather with breathable footbed and rugged grip outsole built for Ugandan terrain.',
        specifications: 'Material: Full-Grain Dark Brown Leather | Sizes: EU 37 - 46 | Hand-stitched Straps | Long-Wear Lug Sole',
        price_ugx: 65000,
        unit_label: 'Pair',
        stock_qty: 120,
        bulk_min_qty: 10,
        image_url: '/images/products/leather-sandals.jpg',
        featured: true,
      },
      {
        sku: 'UPS-SED-001',
        name: 'Improved Hybrid Maize Seeds (Longe 10H / Bazooka - 10kg)',
        category: 'Agricultural Seeds',
        description: 'Certified, high-yielding drought-tolerant Improved Hybrid Maize Seeds multiplied and processed on Uganda Prisons Service Farms (Ruhengyere, Ibuga, Kitalya & Namalu Farms). Tested for 95%+ germination rate.',
        specifications: 'Pack Weight: 10kg Certified Bag | Yield Potential: 3.5 - 4.5 MT/Acre | Maturity: 110-120 Days | Drought & Disease Tolerant',
        price_ugx: 85000,
        unit_label: '10kg Bag',
        stock_qty: 340,
        bulk_min_qty: 10,
        image_url: '/images/products/hybrid-maize-seeds.jpg',
        featured: true,
      },
      {
        sku: 'UPS-SED-002',
        name: 'Certified Soya Bean Seeds (Maksoy 3N - 10kg)',
        category: 'Agricultural Seeds',
        description: 'Premium rust-resistant Maksoy 3N certified Soya Bean seeds grown on UPS commercial farms. High protein and oil content, uniform pod maturity, and excellent germination across all Ugandan agro-ecological zones.',
        specifications: 'Pack Weight: 10kg Certified Bag | Variety: Maksoy 3N | Maturity: 95-100 Days | Germination: >92%',
        price_ugx: 72000,
        unit_label: '10kg Bag',
        stock_qty: 260,
        bulk_min_qty: 10,
        image_url: '/images/products/soya-bean-seeds.jpg',
        featured: true,
      },
    ];

    for (const p of seedProducts) {
      await run(
        `INSERT INTO products (sku, name, category, description, specifications, price_ugx, unit_label, stock_qty, bulk_min_qty, image_url, featured, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.sku, p.name, p.category, p.description, p.specifications,
          p.price_ugx, p.unit_label, p.stock_qty, p.bulk_min_qty, p.image_url,
          isPostgres ? p.featured : (p.featured ? 1 : 0),
          isPostgres ? true : 1,
          now, now,
        ]
      );
    }
    console.log('[DB] Seeded 8 Uganda Prisons Service products');
  }

  // 4. Seed Animated Adverts
  const advCount = await get('SELECT COUNT(*) as cnt FROM adverts');
  if (Number(advCount.cnt) === 0) {
    const seedAdverts = [
      {
        title: 'Solid Ugandan Mahogany Furniture',
        subtitle: 'Handcrafted Beds, Dining Tables & Chairs directly from Luzira Prison Industries. FREE nationwide delivery on bulk orders!',
        badge_text: 'PRISON INDUSTRIES FLAGSHIP',
        price_callout: 'From UGX 320,000',
        cta_text: 'Explore Furniture',
        media_type: 'image',
        media_url: '/images/products/wooden-bed.jpg',
        animation_style: 'ken-burns',
        duration_sec: 6,
        sort_order: 1,
      },
      {
        title: 'Planting Season Certified Seeds',
        subtitle: 'Improved Hybrid Maize (Longe 10H) & Maksoy 3N Soya Bean Seeds from UPS Farms. Tested 95% germination!',
        badge_text: 'SEASONAL HARVEST OFFER',
        price_callout: 'From UGX 72,000 / 10kg',
        cta_text: 'Order Farm Seeds',
        media_type: 'image',
        media_url: '/images/products/hybrid-maize-seeds.jpg',
        animation_style: 'kinetic-slide',
        duration_sec: 6,
        sort_order: 2,
      },
      {
        title: '100% Genuine Leather Shoes & Steppers',
        subtitle: 'Durable hand-stitched Oxford formal shoes and everyday leather sandals. Pick up at any nearby Uganda Prisons Unit nationwide.',
        badge_text: 'GENUINE LEATHERCRAFT',
        price_callout: 'Steppers UGX 65,000',
        cta_text: 'Shop Leather Goods',
        media_type: 'image',
        media_url: '/images/products/leather-shoes.jpg',
        animation_style: 'gold-spotlight',
        duration_sec: 6,
        sort_order: 3,
      },
    ];
    for (const a of seedAdverts) {
      await run(
        `INSERT INTO adverts (title, subtitle, badge_text, price_callout, cta_text, media_type, media_url, animation_style, duration_sec, active, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          a.title, a.subtitle, a.badge_text, a.price_callout, a.cta_text,
          a.media_type, a.media_url, a.animation_style, a.duration_sec,
          isPostgres ? true : 1, a.sort_order, now,
        ]
      );
    }
  }

  // 5. Seed News
  const newsCount = await get('SELECT COUNT(*) as cnt FROM news');
  if (Number(newsCount.cnt) === 0) {
    const seedNews = [
      {
        title: 'Uganda Prisons Service Launches Nationwide Digital Storefront for Industries & Farm Produce',
        category: 'Official Announcement',
        summary: 'Citizens and institutions across all regions of Uganda can now browse official price chartlists, order furniture, leather footwear, and certified seeds online, and track verified deliveries.',
        content: 'The Uganda Prisons Service Directorate of Production and Industries has officially launched its nationwide digital ordering platform. Customers placing bulk orders enjoy complimentary nationwide delivery by our dedicated Prison Sales Agents, while retail and small-volume buyers can conveniently pick up verified orders from over 25 Uganda Prisons Service units across Central, Eastern, Northern, and Western Uganda. Payments are seamlessly supported via MTN Mobile Money (MoMo), Airtel Money, Official UPS Bank Account, and Cash/Pay on Delivery with automated SMS confirmation.',
        image_url: '/images/products/wooden-dining-set.jpg',
        author: 'UPS Directorate of Production',
      },
      {
        title: 'Bumper Harvest of Improved Hybrid Maize & Maksoy Soya Bean Seeds Ready for Planting Season',
        category: 'Agriculture & Seeds',
        summary: 'Over 450 metric tonnes of certified Longe 10H Hybrid Maize and Maksoy 3N Soya Bean seeds are now stocked and ready for dispatch to Ugandan farmers and cooperatives.',
        content: 'Following successful multiplication harvests at Ruhengyere, Kitalya, Namalu, and Mubuku Prison Farms, Uganda Prisons Service has released fresh stocks of high-germination Improved Hybrid Maize and Soya Bean seeds. Every 10kg and 50kg bag undergoes rigorous moisture and germination quality checks before sealing. Farmers groups ordering in bulk qualify for free farm-gate delivery.',
        image_url: '/images/products/soya-bean-seeds.jpg',
        author: 'UPS Agricultural Farms Division',
      },
      {
        title: 'New Collection of Hand-Stitched Leather Steppers & Executive Office Furniture Unveiled',
        category: 'Prison Industries',
        summary: 'Rehabilitation vocational workshops at Luzira have rolled out upgraded designs for genuine full-grain leather sandals and seasoned mahogany furniture.',
        content: 'Through structured vocational rehabilitation programs, inmates acquire nationally certified skills in carpentry, joinery, and leathercraft. Every purchase from the Uganda Prisons Service Products Store directly supports inmate skills training, community reintegration, and national self-reliance while guaranteeing citizens durable, fairly priced Ugandan-made products.',
        image_url: '/images/products/leather-sandals.jpg',
        author: 'Luzira Prison Industries Desk',
      },
    ];
    for (const n of seedNews) {
      await run(
        `INSERT INTO news (title, category, summary, content, image_url, author, published, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.title, n.category, n.summary, n.content, n.image_url, n.author, isPostgres ? true : 1, now, now]
      );
    }
  }

  // 6. Seed initial sample financial transactions if empty
  const txCount = await get('SELECT COUNT(*) as cnt FROM transactions');
  if (Number(txCount.cnt) === 0) {
    const sampleTxs = [
      {
        tx_date: today,
        tx_type: 'income',
        category: 'Furniture Sales',
        payment_method: 'Bank Transfer (UPS Account)',
        amount_ugx: 3100000,
        reference_code: 'UPS-INIT-1001',
        customer_or_party: 'St. Marys Vocational School Wakiso',
        description: 'Bulk order: 2x Solid Mahogany Beds & 2x Dining Chair Pairs (Verified Bank Deposit)',
        recorded_by: 'UPS Sales Administrator',
      },
      {
        tx_date: today,
        tx_type: 'income',
        category: 'Seed Sales',
        payment_method: 'MTN Mobile Money (MoMo)',
        amount_ugx: 850000,
        reference_code: 'UPS-INIT-1002',
        customer_or_party: 'Lango Farmers Cooperative',
        description: '10 Bags Improved Hybrid Maize Seeds (10kg) - Free Bulk Dispatch',
        recorded_by: 'UPS Sales Administrator',
      },
      {
        tx_date: today,
        tx_type: 'income',
        category: 'Leather Footwear',
        payment_method: 'Airtel Money',
        amount_ugx: 210000,
        reference_code: 'UPS-INIT-1003',
        customer_or_party: 'Okello Patrick',
        description: '1x Formal Oxford Leather Shoes + 1x Leather Steppers (Luzira Unit Pickup)',
        recorded_by: 'UPS Sales Administrator',
      },
      {
        tx_date: today,
        tx_type: 'expense',
        category: 'Logistics & Dispatch',
        payment_method: 'Cash',
        amount_ugx: 185000,
        reference_code: 'EXP-LOG-204',
        customer_or_party: 'UPS Fleet Fuel Desk',
        description: 'Fuel allowance for bulk furniture delivery van (Wakiso & Mukono route)',
        recorded_by: 'UPS Sales Administrator',
      },
    ];
    for (const t of sampleTxs) {
      await run(
        `INSERT INTO transactions (tx_date, tx_type, category, payment_method, amount_ugx, reference_code, customer_or_party, description, order_id, recorded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [t.tx_date, t.tx_type, t.category, t.payment_method, t.amount_ugx, t.reference_code, t.customer_or_party, t.description, t.recorded_by, now]
      );
    }
  }
}

async function syncUpsRealMedia() {
  const now = new Date().toISOString();

  // Add authentic Uganda Prisons Service real-photo products idempotently
  const extraProducts = [
    {
      sku: 'UPS-FUR-005',
      name: 'Executive Mahogany Office Desk & Maroon Chairs Set',
      category: 'Furniture',
      description: 'Official Uganda Prisons Service executive mahogany office desk paired with carved maroon-upholstered visitor chairs. Hand-built by master joiners at Luzira Prison Industries.',
      specifications: 'Includes: 1 Executive Desk + 3 Carved Chairs | Solid Seasoned Mahogany | Official Maroon Velvet Finish',
      price_ugx: 2450000,
      unit_label: 'Office Set',
      stock_qty: 8,
      bulk_min_qty: 2,
      image_url: '/images/ups/ups-11.jpg',
      featured: true,
    },
    {
      sku: 'UPS-LTH-003',
      name: 'Genuine Leather Executive Briefcase & Dress Shoes',
      category: 'Leather Footwear',
      description: 'Hand-stitched genuine Ugandan cowhide leather briefcase and polished formal shoes showcased at Uganda Prisons Service national exhibitions.',
      specifications: '100% Full-Grain Cowhide | Hand-Stitched Brass Hardware | Matching Formal Shoes Available',
      price_ugx: 260000,
      unit_label: 'Bundle / Set',
      stock_qty: 30,
      bulk_min_qty: 5,
      image_url: '/images/ups/ups-06.jpg',
      featured: true,
    },
    {
      sku: 'UPS-LTH-004',
      name: 'Handcrafted Leather Belts & Steppers Combo',
      category: 'Leather Footwear',
      description: 'Heavy-duty full-grain leather belts paired with comfortable hand-stitched UPS leather steppers/sandals crafted for long-lasting everyday use.',
      specifications: 'Genuine Leather Belt + Leather Steppers | Sizes EU 38-46 | Brown & Black Options',
      price_ugx: 95000,
      unit_label: 'Combo Pack',
      stock_qty: 65,
      bulk_min_qty: 8,
      image_url: '/images/ups/ups-07.jpg',
      featured: false,
    },
    {
      sku: 'UPS-CRF-001',
      name: 'Handwoven Artisanal Baskets & Wooden Crafts Set',
      category: 'Other',
      description: 'Vibrant handwoven market baskets and carved hardwood household crafts produced by Uganda Prisons Service rehabilitation vocational units.',
      specifications: 'Set of 3 Handwoven Baskets | Durable Traditional Weave | Assorted National Colors',
      price_ugx: 55000,
      unit_label: 'Set of 3',
      stock_qty: 90,
      bulk_min_qty: 10,
      image_url: '/images/ups/ups-13.jpg',
      featured: false,
    },
  ];

  for (const p of extraProducts) {
    const exists = await get('SELECT id FROM products WHERE sku = ?', [p.sku]);
    if (!exists) {
      await run(
        `INSERT INTO products (sku, name, category, description, specifications, price_ugx, unit_label, stock_qty, bulk_min_qty, image_url, featured, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.sku, p.name, p.category, p.description, p.specifications,
          p.price_ugx, p.unit_label, p.stock_qty, p.bulk_min_qty, p.image_url,
          isPostgres ? p.featured : (p.featured ? 1 : 0),
          isPostgres ? true : 1,
          now, now,
        ]
      );
    }
  }

  // Add authentic real-photo UPS adverts idempotently
  const extraAdverts = [
    {
      title: 'Luzira Prison Industries Carpentry Workshop',
      subtitle: 'Watch craftsmanship in action — solid Mahogany executive desks, beds & dining sets built to last generations.',
      badge_text: 'LIVE WORKSHOP SHOWCASE',
      price_callout: 'Executive Sets From UGX 1.25M',
      cta_text: 'Shop Furniture',
      media_type: 'image',
      media_url: '/images/ups/ups-17.jpg',
      animation_style: 'ken-burns',
      duration_sec: 6,
      sort_order: 0,
    },
    {
      title: 'Official UPS Certified Seed Warehouses',
      subtitle: 'High-germination Improved Hybrid Maize & Maksoy Soya Bean seeds ready for bulk farm-gate delivery across Uganda.',
      badge_text: 'UPS AGRICULTURAL FARMS',
      price_callout: 'Bulk Free Delivery Nationwide',
      cta_text: 'Order Certified Seeds',
      media_type: 'image',
      media_url: '/images/ups/ups-21.jpg',
      animation_style: 'gold-spotlight',
      duration_sec: 6,
      sort_order: 1,
    },
    {
      title: 'Authentic Handcrafted UPS Leather Shoes',
      subtitle: 'Proudly made in Uganda Prisons Leather Workshops — genuine cowhide shoes, steppers, sandals & executive briefcases.',
      badge_text: 'PROUDLY MADE IN UGANDA',
      price_callout: 'Shoes From UGX 65,000',
      cta_text: 'Shop Leather Goods',
      media_type: 'image',
      media_url: '/images/ups/ups-24.jpg',
      animation_style: 'kinetic-slide',
      duration_sec: 6,
      sort_order: 2,
    },
  ];

  for (const a of extraAdverts) {
    const exists = await get('SELECT id FROM adverts WHERE media_url = ?', [a.media_url]);
    if (!exists) {
      await run(
        `INSERT INTO adverts (title, subtitle, badge_text, price_callout, cta_text, media_type, media_url, animation_style, duration_sec, active, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          a.title, a.subtitle, a.badge_text, a.price_callout, a.cta_text,
          a.media_type, a.media_url, a.animation_style, a.duration_sec,
          isPostgres ? true : 1, a.sort_order, now,
        ]
      );
    }
  }

  // Upgrade initial seeded news thumbnails to authentic UPS exhibition photos if still on placeholder photos
  await run(
    `UPDATE news SET image_url = '/images/ups/ups-01.jpg' WHERE image_url = '/images/products/wooden-dining-set.jpg'`
  );
  await run(
    `UPDATE news SET image_url = '/images/ups/ups-21.jpg' WHERE image_url = '/images/products/soya-bean-seeds.jpg'`
  );
  await run(
    `UPDATE news SET image_url = '/images/ups/ups-06.jpg' WHERE image_url = '/images/products/leather-sandals.jpg'`
  );
}

async function initDb() {
  await initConnection();
  await createTables();
  await seedInitialData();
  await syncUpsRealMedia();
}

module.exports = {
  isPostgres,
  initDb,
  query,
  get,
  run,
  insertAndGetId,
  upsertSetting,
  getSettingsMap,
};
