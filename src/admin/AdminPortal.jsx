import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Film,
  Landmark,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Newspaper,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import AdvertStage from '../components/AdvertStage.jsx';
import {
  adminFetch,
  formatDate,
  formatDateTime,
  formatUgx,
  getAdminToken,
  orderStatusMeta,
  paymentStatusMeta,
  setAdminToken,
} from '../utils/api';

const TAB_GROUPS = [
  {
    title: 'MARKETPLACE OPERATIONS',
    items: [
      { id: 'overview', label: 'Seller Center Overview', icon: LayoutDashboard },
      { id: 'orders', label: 'Orders & Verification', icon: ShoppingBag },
      { id: 'customers', label: 'Registered Customers', icon: Users },
    ],
  },
  {
    title: 'CATALOG & MARKETING',
    items: [
      { id: 'products', label: 'Products & Price Tags', icon: Package },
      { id: 'adverts', label: 'Adverts & Auto-Animation', icon: Film },
      { id: 'news', label: 'News & Announcements', icon: Newspaper },
    ],
  },
  {
    title: 'FINANCE & CLOUD SYSTEM',
    items: [
      { id: 'finance', label: 'Financial Management', icon: Wallet },
      { id: 'settings', label: 'Settings, AWS & Yoola SMS', icon: Settings },
    ],
  },
];

const TABS = TAB_GROUPS.flatMap((g) => g.items);

export default function AdminPortal({ onNavigateStore, onToast }) {
  const [admin, setAdmin] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('admin@prisons.go.ug');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [quickSearch, setQuickSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [adverts, setAdverts] = useState([]);
  const [newsList, setNewsList] = useState([]);
  const [financeData, setFinanceData] = useState({ transactions: [], summary: {} });
  const [settingsData, setSettingsData] = useState(null);

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPayFilter, setOrderPayFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [inspectOrder, setInspectOrder] = useState(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Product Form State
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodForm, setProdForm] = useState({
    sku: '',
    name: '',
    category: 'Furniture',
    description: '',
    specifications: '',
    price_ugx: '',
    unit_label: 'Unit',
    stock_qty: 10,
    bulk_min_qty: 5,
    featured: true,
    active: true,
    image_url: '',
  });
  const [prodFile, setProdFile] = useState(null);

  // Advert Studio State
  const [advForm, setAdvForm] = useState({
    title: '',
    subtitle: '',
    badge_text: 'OFFICIAL UPS PROMO',
    price_callout: '',
    cta_text: 'Order Now',
    animation_style: 'ken-burns',
    duration_sec: 6,
    media_type: 'image',
    media_url: '/images/products/wooden-bed.jpg',
    active: true,
  });
  const [advFile, setAdvFile] = useState(null);
  const [advPreviewUrl, setAdvPreviewUrl] = useState('');

  // News Form State
  const [editingNews, setEditingNews] = useState(null);
  const [newsForm, setNewsForm] = useState({
    title: '',
    category: 'Institutional News',
    summary: '',
    content: '',
    author: 'UPS Directorate of Production',
    published: true,
    image_url: '',
  });
  const [newsFile, setNewsFile] = useState(null);

  // Finance Form & Filters
  const [txFilterFrom, setTxFilterFrom] = useState('');
  const [txFilterTo, setTxFilterTo] = useState('');
  const [txFilterType, setTxFilterType] = useState('all');
  const [txForm, setTxForm] = useState({
    tx_date: new Date().toISOString().slice(0, 10),
    tx_type: 'income',
    category: 'Walk-in Cash Sales',
    payment_method: 'Cash',
    amount_ugx: '',
    reference_code: '',
    customer_or_party: '',
    description: '',
  });

  // Settings Form State
  const [cfgForm, setCfgForm] = useState({});
  const [testSmsPhone, setTestSmsPhone] = useState('0772000000');
  const [testSmsMsg, setTestSmsMsg] = useState('');
  const [testSmsResp, setTestSmsResp] = useState(null);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    async function verifySession() {
      if (!getAdminToken()) {
        setAuthChecking(false);
        return;
      }
      try {
        const res = await adminFetch('/api/admin/me');
        setAdmin(res.admin);
      } catch {
        setAdminToken('');
      } finally {
        setAuthChecking(false);
      }
    }
    verifySession();
  }, []);

  useEffect(() => {
    if (!admin) return;
    loadActiveTab(tab);
  }, [admin, tab]);

  async function loadActiveTab(currentTab) {
    try {
      if (currentTab === 'overview') {
        const d = await adminFetch('/api/admin/dashboard');
        setDashboard(d);
      } else if (currentTab === 'orders') {
        const qs = new URLSearchParams();
        if (orderStatusFilter !== 'all') qs.set('status', orderStatusFilter);
        if (orderPayFilter !== 'all') qs.set('payment_method', orderPayFilter);
        if (orderSearch.trim()) qs.set('search', orderSearch.trim());
        const res = await adminFetch(`/api/admin/orders?${qs.toString()}`);
        setOrders(res.orders || []);
      } else if (currentTab === 'customers') {
        const res = await adminFetch('/api/admin/customers');
        setCustomers(res.customers || []);
      } else if (currentTab === 'products') {
        const res = await adminFetch('/api/admin/products');
        setProducts(res.products || []);
      } else if (currentTab === 'adverts') {
        const [aRes, pRes] = await Promise.all([
          adminFetch('/api/admin/adverts'),
          adminFetch('/api/admin/products'),
        ]);
        setAdverts(aRes.adverts || []);
        setProducts(pRes.products || []);
      } else if (currentTab === 'news') {
        const res = await adminFetch('/api/admin/news');
        setNewsList(res.news || []);
      } else if (currentTab === 'finance') {
        const qs = new URLSearchParams();
        if (txFilterFrom) qs.set('from', txFilterFrom);
        if (txFilterTo) qs.set('to', txFilterTo);
        if (txFilterType !== 'all') qs.set('type', txFilterType);
        const res = await adminFetch(`/api/admin/transactions?${qs.toString()}`);
        setFinanceData(res);
      } else if (currentTab === 'settings') {
        const res = await adminFetch('/api/admin/settings');
        setSettingsData(res);
        setCfgForm({
          ...res.settings,
          yoola_sms_api_key: res.settings.yoola_sms_api_key ? '__UNCHANGED__' : '',
        });
      }
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setAdminToken(data.token);
      setAdmin(data.admin);
      onToast(`Welcome, ${data.admin.name}`);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    setAdminToken('');
    setAdmin(null);
    onToast('Logged out of Admin Portal');
  }

  // ==================== ORDER ACTIONS ====================
  async function handleVerifyOrder(orderId) {
    try {
      const res = await adminFetch(`/api/admin/orders/${orderId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ admin_notes: verifyNotes }),
      });
      onToast(res.message);
      setInspectOrder(res.order);
      setVerifyNotes('');
      loadActiveTab(tab);
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handleRejectOrder(orderId) {
    try {
      const res = await adminFetch(`/api/admin/orders/${orderId}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          reason: rejectReason || 'Proof of payment could not be confirmed. Please re-submit.',
        }),
      });
      onToast(res.message);
      setInspectOrder(res.order);
      setRejectReason('');
      loadActiveTab(tab);
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handleUpdateOrderStatus(orderId, newStatus) {
    try {
      const res = await adminFetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ order_status: newStatus }),
      });
      onToast(res.message);
      setInspectOrder(res.order);
      loadActiveTab(tab);
    } catch (err) {
      onToast(err.message);
    }
  }

  // ==================== PRODUCT ACTIONS ====================
  async function handleSaveProduct(e) {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(prodForm).forEach(([k, v]) => fd.append(k, String(v)));
      if (prodFile) fd.append('image', prodFile);

      if (editingProduct) {
        await adminFetch(`/api/admin/products/${editingProduct.id}`, { method: 'PUT', body: fd });
        onToast('Product updated on storefront & price chartlist!');
      } else {
        await adminFetch('/api/admin/products', { method: 'POST', body: fd });
        onToast('New product uploaded with price tag!');
      }
      resetProductForm();
      loadActiveTab('products');
    } catch (err) {
      onToast(err.message);
    }
  }

  function resetProductForm() {
    setEditingProduct(null);
    setProdFile(null);
    setProdForm({
      sku: '',
      name: '',
      category: 'Furniture',
      description: '',
      specifications: '',
      price_ugx: '',
      unit_label: 'Unit',
      stock_qty: 10,
      bulk_min_qty: 5,
      featured: true,
      active: true,
      image_url: '',
    });
  }

  async function handleDeleteProduct(id) {
    if (!window.confirm('Delete this product from the store?')) return;
    try {
      await adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      onToast('Product deleted.');
      loadActiveTab('products');
    } catch (err) {
      onToast(err.message);
    }
  }

  // ==================== ADVERT ACTIONS ====================
  function handleAdvertFileChange(file) {
    setAdvFile(file || null);
    if (!file) {
      setAdvPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setAdvPreviewUrl(url);
    setAdvForm((prev) => ({
      ...prev,
      media_type: file.type.startsWith('video/') ? 'video' : 'image',
    }));
  }

  function autoGenerateAdvertFromProduct(productId) {
    const p = products.find((x) => String(x.id) === String(productId));
    if (!p) return;
    const styles = ['ken-burns', 'kinetic-slide', 'gold-spotlight', 'pulse-zoom'];
    const pickedStyle = styles[p.id % styles.length];
    setAdvFile(null);
    setAdvPreviewUrl('');
    setAdvForm({
      title: p.name,
      subtitle: `${p.description.slice(0, 125)}... Free bulk delivery nationwide!`,
      badge_text: `FEATURED ${p.category.toUpperCase()}`,
      price_callout: `${formatUgx(p.price_ugx)} / ${p.unit_label}`,
      cta_text: 'Order Online Now',
      animation_style: pickedStyle,
      duration_sec: 6,
      media_type: 'image',
      media_url: p.image_url,
      active: true,
    });
    onToast(`Auto-generated "${pickedStyle}" animation advert from ${p.name}!`);
  }

  async function handleSaveAdvert(e) {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(advForm).forEach(([k, v]) => fd.append(k, String(v)));
      if (advFile) fd.append('media', advFile);

      await adminFetch('/api/admin/adverts', { method: 'POST', body: fd });
      onToast('Animated advert published to storefront screen!');
      setAdvFile(null);
      setAdvPreviewUrl('');
      setAdvForm({
        title: '',
        subtitle: '',
        badge_text: 'OFFICIAL UPS PROMO',
        price_callout: '',
        cta_text: 'Order Now',
        animation_style: 'ken-burns',
        duration_sec: 6,
        media_type: 'image',
        media_url: '/images/products/wooden-bed.jpg',
        active: true,
      });
      loadActiveTab('adverts');
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handleToggleAdvert(adv) {
    try {
      const isAct = adv.active === true || adv.active === 1;
      await adminFetch(`/api/admin/adverts/${adv.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !isAct }),
      });
      loadActiveTab('adverts');
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handleDeleteAdvert(id) {
    if (!window.confirm('Remove this advert?')) return;
    try {
      await adminFetch(`/api/admin/adverts/${id}`, { method: 'DELETE' });
      onToast('Advert removed.');
      loadActiveTab('adverts');
    } catch (err) {
      onToast(err.message);
    }
  }

  // ==================== NEWS ACTIONS ====================
  async function handleSaveNews(e) {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(newsForm).forEach(([k, v]) => fd.append(k, String(v)));
      if (newsFile) fd.append('image', newsFile);

      if (editingNews) {
        await adminFetch(`/api/admin/news/${editingNews.id}`, { method: 'PUT', body: fd });
        onToast('News article updated.');
      } else {
        await adminFetch('/api/admin/news', { method: 'POST', body: fd });
        onToast('News article published to website!');
      }
      setEditingNews(null);
      setNewsFile(null);
      setNewsForm({
        title: '',
        category: 'Institutional News',
        summary: '',
        content: '',
        author: 'UPS Directorate of Production',
        published: true,
        image_url: '',
      });
      loadActiveTab('news');
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handleDeleteNews(id) {
    if (!window.confirm('Delete this news article?')) return;
    try {
      await adminFetch(`/api/admin/news/${id}`, { method: 'DELETE' });
      onToast('News deleted.');
      loadActiveTab('news');
    } catch (err) {
      onToast(err.message);
    }
  }

  // ==================== FINANCE ACTIONS ====================
  async function handleRecordTransaction(e) {
    e.preventDefault();
    try {
      await adminFetch('/api/admin/transactions', {
        method: 'POST',
        body: JSON.stringify(txForm),
      });
      onToast('Daily financial transaction recorded!');
      setTxForm({
        tx_date: new Date().toISOString().slice(0, 10),
        tx_type: 'income',
        category: 'Walk-in Cash Sales',
        payment_method: 'Cash',
        amount_ugx: '',
        reference_code: '',
        customer_or_party: '',
        description: '',
      });
      loadActiveTab('finance');
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handleDeleteTransaction(id) {
    if (!window.confirm('Delete this financial record?')) return;
    try {
      await adminFetch(`/api/admin/transactions/${id}`, { method: 'DELETE' });
      loadActiveTab('finance');
    } catch (err) {
      onToast(err.message);
    }
  }

  function exportFinanceCsv() {
    const rows = financeData.transactions || [];
    const header = ['Date', 'Type', 'Category', 'Payment Method', 'Amount (UGX)', 'Reference', 'Customer/Party', 'Description', 'Recorded By'];
    const csvLines = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.tx_date,
          r.tx_type,
          r.category,
          r.payment_method,
          r.amount_ugx,
          r.reference_code,
          r.customer_or_party,
          r.description,
          r.recorded_by,
        ]
          .map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UPS-Store-Finance-Report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ==================== SETTINGS ACTIONS ====================
  async function handleSaveSettings(e) {
    e.preventDefault();
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(cfgForm),
      });
      onToast(res.message);
      loadActiveTab('settings');
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handleSendTestSms(e) {
    e.preventDefault();
    setTestSmsResp(null);
    try {
      const res = await adminFetch('/api/admin/sms/test', {
        method: 'POST',
        body: JSON.stringify({ phone: testSmsPhone, message: testSmsMsg }),
      });
      setTestSmsResp(res.result);
      onToast('Yoola SMS test executed — check response & logs below.');
      loadActiveTab('settings');
    } catch (err) {
      onToast(err.message);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    try {
      const res = await adminFetch('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify(pwdForm),
      });
      onToast(res.message);
      setPwdForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      onToast(err.message);
    }
  }

  // ==================== AUTH SCREEN ====================
  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Verifying Admin Portal session...
      </div>
    );
  }

  if (!admin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #141619 0%, #164785 52%, #861742 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          className="panel-card"
          style={{ width: '100%', maxWidth: 450, padding: 30, border: '2.5px solid var(--ups-gold)' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div className="brand-emblem" style={{ margin: '0 auto 12px', width: 84, height: 84, padding: 6 }}>
              <img
                src="/images/prisonslogo-1.png"
                alt="Uganda Prisons Service Official Logo"
                className="brand-logo-img"
              />
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--ups-black)' }}>
              Uganda Prisons Service
            </h2>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--ups-maroon)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sales &amp; Store Administration Portal
            </div>
          </div>

          {loginError && <div className="alert alert-error">{loginError}</div>}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Admin Email</label>
              <input
                className="input"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="input"
                type="password"
                required
                placeholder="Enter admin password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loggingIn} style={{ width: '100%' }}>
              {loggingIn ? 'Signing in...' : 'Sign In to Admin Portal'}
            </button>
          </form>

          <div className="alert alert-gold" style={{ marginTop: 16, marginBottom: 14, fontSize: '0.78rem' }}>
            <strong>Initial Default Credentials:</strong>
            <br />
            Email: <code>admin@prisons.go.ug</code> | Password: <code>UPSAdmin@2026</code>
            <br />
            (Change password immediately inside Settings after logging in.)
          </div>

          <button className="btn btn-outline" style={{ width: '100%' }} onClick={onNavigateStore}>
            <ArrowLeft size={15} /> Back to Public Storefront
          </button>
        </div>
      </div>
    );
  }

  // ==================== MAIN JUMIA-STYLE SELLER CENTER ADMIN LAYOUT ====================
  return (
    <div className="sc-wrapper">
      <div className="uganda-ribbon no-print" />

      {/* Jumia Seller Center Executive Top Header Bar */}
      <header className="sc-header no-print">
        <div className="sc-header-left">
          <div className="brand-emblem" style={{ width: 42, height: 42, padding: 2 }}>
            <img
              src="/images/prisonslogo-1.png"
              alt="Uganda Prisons Service Official Logo"
              className="brand-logo-img"
            />
          </div>
          <div>
            <div className="sc-brand-title">UPS SELLER &amp; ADMIN CENTER</div>
            <div className="sc-brand-sub">Uganda Prisons Service Official E-Commerce Control Hub</div>
          </div>
        </div>

        <form
          className="sc-global-search"
          onSubmit={(e) => {
            e.preventDefault();
            setOrderSearch(quickSearch);
            setTab('orders');
          }}
        >
          <Search size={15} className="sc-search-ico" />
          <input
            placeholder="Quick search order ref, customer name, or phone..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
          />
          <button type="submit">FIND</button>
        </form>

        <div className="sc-header-right">
          <button className="btn btn-primary btn-sm" onClick={() => setTab('products')}>
            <Plus size={14} /> Add Product
          </button>
          <button className="btn btn-gold btn-sm" onClick={onNavigateStore}>
            <ExternalLink size={14} /> Storefront
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => loadActiveTab(tab)} title="Refresh data">
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      <div className="admin-shell sc-shell">
        {/* Grouped Jumia Seller Center Sidebar */}
        <aside className="admin-sidebar sc-sidebar no-print">
          <div className="sc-admin-profile-card">
            <div className="sc-avatar">
              <ShieldCheck size={18} color="#f5cd47" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {admin.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--ups-gold-bright)' }}>{admin.email}</div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {TAB_GROUPS.map((group) => (
              <div key={group.title} className="sc-nav-group">
                <div className="sc-nav-group-label">{group.title}</div>
                {group.items.map((t) => {
                  const Icon = t.icon;
                  const showBadge =
                    t.id === 'orders' && Number(dashboard?.stats?.pendingVerification || 0) > 0;
                  return (
                    <button
                      key={t.id}
                      className={`admin-nav-btn ${tab === t.id ? 'active' : ''}`}
                      onClick={() => setTab(t.id)}
                    >
                      <Icon size={16} />
                      <span style={{ flex: 1 }}>{t.label}</span>
                      {showBadge && (
                        <span className="sc-pending-pill">{dashboard.stats.pendingVerification}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(229,184,42,0.28)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="admin-nav-btn" onClick={handleLogout} style={{ color: '#fca5a5' }}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="admin-main sc-main">
          <div className="sc-page-bar no-print">
            <div>
              <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, color: 'var(--ups-black)', fontSize: '1.35rem' }}>
                {TABS.find((x) => x.id === tab)?.label}
              </h1>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                Manage UPS Market catalog, customer accounts, payment verifications, animated adverts, daily finance &amp; Yoola SMS
              </div>
            </div>
            {dashboard && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="status-badge badge-blue">{dashboard.integrations.database}</span>
                <span className={`status-badge ${dashboard.integrations.storage.awsConfigured ? 'badge-verified' : 'badge-gold'}`}>
                  {dashboard.integrations.storage.awsConfigured ? 'AWS S3 Active' : 'Local Storage'}
                </span>
                <span className={`status-badge ${dashboard.integrations.yoolaSms.configured ? 'badge-verified' : 'badge-gold'}`}>
                  {dashboard.integrations.yoolaSms.configured
                    ? `Yoola SMS (${dashboard.integrations.yoolaSms.sandbox ? 'Sandbox' : 'LIVE'})`
                    : 'Yoola SMS Unconfigured'}
                </span>
              </div>
            )}
          </div>

          {/* ==================== TAB 1: OVERVIEW ==================== */}
          {tab === 'overview' && dashboard && (
            <div>
              {/* Jumia Seller Center "Action Needed" Quick Strip */}
              <div className="sc-action-strip">
                <button className="sc-action-card" onClick={() => { setOrderStatusFilter('needs_verification'); setTab('orders'); }}>
                  <strong>{dashboard.stats.pendingVerification}</strong>
                  <span>Pending Verifications</span>
                  <em>Review Now →</em>
                </button>
                <button className="sc-action-card" onClick={() => setTab('customers')}>
                  <strong>{dashboard.stats.totalCustomers || 0}</strong>
                  <span>Registered Customers</span>
                  <em>View Accounts →</em>
                </button>
                <button className="sc-action-card" onClick={() => setTab('products')}>
                  <strong>{dashboard.stats.lowStockProducts || 0}</strong>
                  <span>Low Stock Items (≤10)</span>
                  <em>Restock Catalog →</em>
                </button>
                <button className="sc-action-card" onClick={() => setTab('finance')}>
                  <strong>{formatUgx(dashboard.stats.todayNet)}</strong>
                  <span>Today&apos;s Net Cashflow</span>
                  <em>Open Ledger →</em>
                </button>
              </div>

              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">Today&apos;s Income</div>
                  <div className="kpi-value">{formatUgx(dashboard.stats.todayIncome)}</div>
                  <div className="kpi-sub">Expenses: {formatUgx(dashboard.stats.todayExpense)}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Total Ledger Balance</div>
                  <div className="kpi-value" style={{ color: '#15803d' }}>
                    {formatUgx(dashboard.stats.netBalance)}
                  </div>
                  <div className="kpi-sub">Cumulative Income: {formatUgx(dashboard.stats.totalIncome)}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Total Orders</div>
                  <div className="kpi-value">{dashboard.stats.totalOrders}</div>
                  <div className="kpi-sub">
                    Bulk Free: {dashboard.stats.bulkOrders} • Unit Pickup: {dashboard.stats.pickupOrders}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Active Catalog &amp; Media</div>
                  <div className="kpi-value">{dashboard.stats.activeProducts} Products</div>
                  <div className="kpi-sub">
                    {dashboard.stats.totalAdverts} Adverts • {dashboard.stats.totalNews} News
                  </div>
                </div>
              </div>

            {/* Cloud & Integrations Status */}
            <div className="panel-card">
              <h3 style={{ color: 'var(--ups-green-deep)', marginBottom: 12 }}>
                System Integrations Status (Render, AWS S3 &amp; Yoola SMS)
              </h3>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div className="about-mini-card">
                  <h4><Landmark size={15} style={{ display: 'inline' }} /> Database Engine</h4>
                  <span className="status-badge badge-green">{dashboard.integrations.database}</span>
                </div>
                <div className="about-mini-card">
                  <h4><Cloud size={15} style={{ display: 'inline' }} /> AWS S3 Media Storage</h4>
                  <span className={`status-badge ${dashboard.integrations.storage.awsConfigured ? 'badge-green' : 'badge-gold'}`}>
                    {dashboard.integrations.storage.provider}
                  </span>
                </div>
                <div className="about-mini-card">
                  <h4><MessageSquare size={15} style={{ display: 'inline' }} /> Yoola SMS Gateway</h4>
                  <span className={`status-badge ${dashboard.integrations.yoolaSms.configured ? 'badge-green' : 'badge-gold'}`}>
                    {dashboard.integrations.yoolaSms.configured
                      ? `Connected (${dashboard.integrations.yoolaSms.sandbox ? 'Sandbox' : 'Live'})`
                      : 'API Key Needed (Simulated Mode)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="panel-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ color: 'var(--ups-green-deep)' }}>Recent Purchase Orders</h3>
                <button className="btn btn-outline btn-sm" onClick={() => setTab('orders')}>
                  View All &amp; Verify Orders →
                </button>
              </div>
              {dashboard.recentOrders.length === 0 ? (
                <p style={{ color: 'var(--ink-muted)' }}>No online orders placed yet. Orders placed on the website will appear here immediately.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Customer</th>
                        <th>Fulfillment</th>
                        <th>Payment Method</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recentOrders.map((o) => (
                        <tr key={o.id}>
                          <td><strong>{o.reference_code}</strong></td>
                          <td>
                            {o.customer_name}
                            <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{o.customer_phone}</div>
                          </td>
                          <td>
                            {o.delivery_type === 'bulk_free_delivery'
                              ? `Free Bulk Delivery (${o.district})`
                              : `Pickup: ${o.prison_unit}`}
                          </td>
                          <td>{o.payment_method}</td>
                          <td><strong>{formatUgx(o.total_ugx)}</strong></td>
                          <td>
                            <span className={`status-badge ${paymentStatusMeta(o.payment_status).cls}`}>
                              {paymentStatusMeta(o.payment_status).label}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setInspectOrder(o);
                                setTab('orders');
                              }}
                            >
                              Inspect / Verify
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: ORDERS & PAYMENT VERIFICATION ==================== */}
        {tab === 'orders' && (
          <div>
            <div className="panel-card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="input"
                style={{ maxWidth: 260 }}
                placeholder="Search Ref, Name, Phone..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
              <select
                className="select"
                style={{ width: 'auto' }}
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="needs_verification">Needs Verification</option>
                <option value="verified">Verified</option>
                <option value="dispatched">Dispatched</option>
                <option value="ready_for_pickup">Ready for Pickup</option>
                <option value="delivered">Delivered</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                className="select"
                style={{ width: 'auto' }}
                value={orderPayFilter}
                onChange={(e) => setOrderPayFilter(e.target.value)}
              >
                <option value="all">All Payment Channels</option>
                <option value="MTN Mobile Money (MoMo)">MTN MoMo</option>
                <option value="Airtel Money">Airtel Money</option>
                <option value="Bank Transfer (UPS Account)">UPS Bank Account</option>
                <option value="Cash / Pay on Delivery">Cash / Pay on Delivery</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={() => loadActiveTab('orders')}>
                Apply Filters
              </button>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference &amp; Date</th>
                    <th>Customer</th>
                    <th>Delivery / Pickup</th>
                    <th>Payment &amp; Proof</th>
                    <th>Total</th>
                    <th>Order Status</th>
                    <th>Verify / Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-muted)' }}>
                        No orders match the current filter.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.reference_code}</strong>
                          <div style={{ fontSize: '0.74rem', color: 'var(--ink-muted)' }}>{formatDateTime(o.created_at)}</div>
                        </td>
                        <td>
                          <strong>{o.customer_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{o.customer_phone}</div>
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>
                          {o.delivery_type === 'bulk_free_delivery' ? (
                            <>
                              <span className="status-badge badge-green">FREE BULK DELIVERY</span>
                              <div>{o.delivery_address} ({o.district})</div>
                            </>
                          ) : (
                            <>
                              <span className="status-badge badge-gold">PRISON UNIT PICKUP</span>
                              <div>{o.prison_unit}</div>
                            </>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{o.payment_method}</div>
                          <span className={`status-badge ${paymentStatusMeta(o.payment_status).cls}`}>
                            {paymentStatusMeta(o.payment_status).label}
                          </span>
                          {o.payment_tx_ref && (
                            <div style={{ fontSize: '0.74rem', marginTop: 2 }}>Tx: {o.payment_tx_ref}</div>
                          )}
                        </td>
                        <td><strong>{formatUgx(o.total_ugx)}</strong></td>
                        <td>
                          <span className={`status-badge ${orderStatusMeta(o.order_status).cls}`}>
                            {orderStatusMeta(o.order_status).label}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={() => setInspectOrder(o)}>
                            Inspect &amp; Verify
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Order Inspection & Proof Verification Modal */}
            {inspectOrder && (
              <div className="modal-backdrop" onClick={() => setInspectOrder(null)}>
                <div className="modal-box wide" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-head">
                    <div className="modal-head-left">
                      <button className="btn-back no-print" onClick={() => setInspectOrder(null)} aria-label="Back to orders">
                        <ArrowLeft size={16} /> Back
                      </button>
                      <h3>Verify Order — {inspectOrder.reference_code}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm no-print" onClick={() => window.print()}>
                        <Printer size={14} /> Print Receipt
                      </button>
                      <button className="icon-btn no-print" onClick={() => setInspectOrder(null)}>
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="modal-body">
                    <div className="form-grid" style={{ marginBottom: 16 }}>
                      <div className="about-mini-card">
                        <h4>Customer Details</h4>
                        <p><strong>{inspectOrder.customer_name}</strong></p>
                        <p>Phone: {inspectOrder.customer_phone}</p>
                        <p>District: {inspectOrder.district}</p>
                      </div>
                      <div className="about-mini-card">
                        <h4>Fulfillment &amp; Payment</h4>
                        <p>
                          {inspectOrder.delivery_type === 'bulk_free_delivery'
                            ? `FREE Bulk Delivery to: ${inspectOrder.delivery_address}`
                            : `Prison Unit Pickup: ${inspectOrder.prison_unit}`}
                        </p>
                        <p>Channel: <strong>{inspectOrder.payment_method}</strong></p>
                        <p>Total: <strong style={{ color: 'var(--ups-green)' }}>{formatUgx(inspectOrder.total_ugx)}</strong></p>
                      </div>
                    </div>

                    {/* Items Ordered */}
                    <div className="table-wrap" style={{ marginBottom: 16 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(inspectOrder.items || []).map((it, i) => (
                            <tr key={i}>
                              <td><strong>{it.name}</strong> ({it.sku})</td>
                              <td>{it.quantity}</td>
                              <td>{formatUgx(it.price_ugx)}</td>
                              <td><strong>{formatUgx(it.line_total_ugx)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Proof of Payment Viewer */}
                    <div className="panel-card" style={{ background: '#faf8f4' }}>
                      <h4 style={{ color: 'var(--ups-green-deep)', marginBottom: 8 }}>
                        Proof of Payment Evidence
                      </h4>
                      <p style={{ fontSize: '0.86rem', marginBottom: 8 }}>
                        <strong>Transaction ID / Slip Ref:</strong> {inspectOrder.payment_tx_ref || 'Not submitted yet'}
                        <br />
                        <strong>Customer Notes:</strong> {inspectOrder.proof_notes || 'None'}
                      </p>
                      {inspectOrder.payment_proof_url ? (
                        <div>
                          {inspectOrder.payment_proof_url.toLowerCase().endsWith('.pdf') ? (
                            <a
                              href={inspectOrder.payment_proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline btn-sm"
                            >
                              <FileText size={15} /> Open Uploaded PDF Receipt
                            </a>
                          ) : (
                            <a href={inspectOrder.payment_proof_url} target="_blank" rel="noreferrer">
                              <img
                                src={inspectOrder.payment_proof_url}
                                alt="Proof of payment"
                                style={{ maxHeight: 280, borderRadius: 10, border: '1px solid var(--border)' }}
                              />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="alert alert-gold" style={{ marginBottom: 0 }}>
                          {inspectOrder.payment_method === 'Cash / Pay on Delivery'
                            ? 'This is a Cash / Pay on Delivery order. You can verify and approve it below to dispatch/prepare for pickup.'
                            : 'Customer has not uploaded a receipt image yet.'}
                        </div>
                      )}
                    </div>

                    {/* Verification Actions */}
                    <div className="panel-card no-print">
                      <h4 style={{ color: 'var(--ups-green-deep)', marginBottom: 10 }}>
                        Sales Admin Verification &amp; Fulfillment Controls
                      </h4>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label">Admin Verification Notes (Optional)</label>
                        <input
                          className="input"
                          placeholder="e.g. Verified against Stanbic/MoMo statement — approved for dispatch"
                          value={verifyNotes}
                          onChange={(e) => setVerifyNotes(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleVerifyOrder(inspectOrder.id)}
                        >
                          <CheckCircle2 size={16} />
                          {inspectOrder.payment_method === 'Cash / Pay on Delivery'
                            ? 'Approve Cash / Pay on Delivery Order & Send SMS'
                            : 'Verify Payment, Record Income & Send Yoola SMS'}
                        </button>

                        <button
                          className="btn btn-outline"
                          onClick={() => handleUpdateOrderStatus(inspectOrder.id, 'dispatched')}
                        >
                          Mark Dispatched (Bulk Agent)
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={() => handleUpdateOrderStatus(inspectOrder.id, 'ready_for_pickup')}
                        >
                          Mark Ready at Prison Unit
                        </button>
                        <button
                          className="btn btn-gold"
                          onClick={() => handleUpdateOrderStatus(inspectOrder.id, 'delivered')}
                        >
                          Mark Delivered / Completed
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                        <input
                          className="input"
                          placeholder="Reason for rejecting payment proof..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <button
                          className="btn btn-danger"
                          onClick={() => handleRejectOrder(inspectOrder.id)}
                        >
                          <XCircle size={15} /> Reject Proof
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: REGISTERED CUSTOMERS ==================== */}
        {tab === 'customers' && (
          <div>
            <div className="panel-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h3 style={{ color: 'var(--ups-black)' }}>Registered UPS Market Customers ({customers.length})</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                    Customers who registered on UPS Market for 1-click ordering, saved pickup units, and order history.
                  </p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => loadActiveTab('customers')}>
                  <RefreshCw size={14} /> Refresh Directory
                </button>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Phone &amp; Email</th>
                      <th>District &amp; Pickup Unit</th>
                      <th>Orders</th>
                      <th>Verified Spend</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: 30, color: 'var(--ink-muted)' }}>
                          No registered customer accounts yet. New registrations on the storefront will appear here automatically.
                        </td>
                      </tr>
                    ) : (
                      customers.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.full_name}</strong></td>
                          <td>
                            <code>+{c.phone}</code>
                            {c.email && <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{c.email}</div>}
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>
                            <strong>{c.default_district}</strong>
                            <div>{c.default_prison_unit || c.default_address || '—'}</div>
                          </td>
                          <td><span className="status-badge badge-blue">{c.order_count} orders</span></td>
                          <td><strong style={{ color: 'var(--ups-maroon)' }}>{formatUgx(c.verified_spend_ugx)}</strong></td>
                          <td style={{ fontSize: '0.8rem' }}>{formatDate(c.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: PRODUCTS & PRICE CHARTLIST ==================== */}
        {tab === 'products' && (
          <div>
            <form onSubmit={handleSaveProduct} className="panel-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ color: 'var(--ups-green-deep)' }}>
                  {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Upload New Available Product & Price Tag'}
                </h3>
                {editingProduct && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={resetProductForm}>
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Solid Mahogany 5x6 Bed"
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="select"
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                  >
                    <option value="Furniture">Furniture</option>
                    <option value="Leather Footwear">Leather Footwear</option>
                    <option value="Agricultural Seeds">Agricultural Seeds</option>
                    <option value="Other">Other UPS Products</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Price Tag (UGX) *</label>
                  <input
                    className="input"
                    type="number"
                    required
                    min="500"
                    placeholder="e.g. 1250000"
                    value={prodForm.price_ugx}
                    onChange={(e) => setProdForm({ ...prodForm, price_ugx: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Label (e.g. Pair, 10kg Bag, Bed Frame)</label>
                  <input
                    className="input"
                    value={prodForm.unit_label}
                    onChange={(e) => setProdForm({ ...prodForm, unit_label: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Quantity</label>
                  <input
                    className="input"
                    type="number"
                    value={prodForm.stock_qty}
                    onChange={(e) => setProdForm({ ...prodForm, stock_qty: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bulk Free Delivery Min Qty</label>
                  <input
                    className="input"
                    type="number"
                    value={prodForm.bulk_min_qty}
                    onChange={(e) => setProdForm({ ...prodForm, bulk_min_qty: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU (Optional — Auto-generated if blank)</label>
                  <input
                    className="input"
                    value={prodForm.sku}
                    onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Upload Product Photo (AWS S3 / Local)</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProdFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Description *</label>
                  <textarea
                    className="textarea"
                    rows="2"
                    required
                    value={prodForm.description}
                    onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Specifications (Dimensions, Timber/Leather Grade, Germination %)</label>
                  <input
                    className="input"
                    value={prodForm.specifications}
                    onChange={(e) => setProdForm({ ...prodForm, specifications: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <button className="btn btn-primary" type="submit">
                  <Plus size={16} /> {editingProduct ? 'Save Product Updates' : 'Publish Product to Storefront'}
                </button>
              </div>
            </form>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>SKU &amp; Name</th>
                    <th>Category</th>
                    <th>Price Tag</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td><img src={p.image_url} alt={p.name} className="table-thumb" /></td>
                      <td>
                        <div style={{ fontSize: '0.73rem', color: 'var(--ink-muted)' }}>{p.sku}</div>
                        <strong>{p.name}</strong>
                      </td>
                      <td>{p.category}</td>
                      <td><strong>{formatUgx(p.price_ugx)}</strong> / {p.unit_label}</td>
                      <td>{p.stock_qty}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setEditingProduct(p);
                              setProdForm({ ...p });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProduct(p.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: ADVERTS & AUTO-ANIMATION STUDIO ==================== */}
        {tab === 'adverts' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 22 }}>
              <form onSubmit={handleSaveAdvert} className="panel-card" style={{ marginBottom: 0 }}>
                <h3 style={{ color: 'var(--ups-green-deep)', marginBottom: 6 }}>
                  Upload Video / Photo Advert &amp; Auto-Generate Animation
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginBottom: 14 }}>
                  Upload a promotional video (MP4/WebM) or photo, OR pick any catalog product below to automatically generate an animated screen advert!
                </p>

                <div className="alert alert-gold" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                    <Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} />
                    1-Click Auto-Generate Animated Advert from Catalog Product:
                  </label>
                  <select
                    className="select"
                    defaultValue=""
                    onChange={(e) => autoGenerateAdvertFromProduct(e.target.value)}
                  >
                    <option value="">— Select a product to auto-generate animated promo —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatUgx(p.price_ugx)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">Advert Headline *</label>
                    <input
                      className="input"
                      required
                      placeholder="e.g. Special Mahogany Bed Harvest Offer!"
                      value={advForm.title}
                      onChange={(e) => setAdvForm({ ...advForm, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Promotional Tagline / Subtitle</label>
                    <input
                      className="input"
                      placeholder="Short engaging promo text shown on animated banner"
                      value={advForm.subtitle}
                      onChange={(e) => setAdvForm({ ...advForm, subtitle: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Badge Label</label>
                    <input
                      className="input"
                      value={advForm.badge_text}
                      onChange={(e) => setAdvForm({ ...advForm, badge_text: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price Callout</label>
                    <input
                      className="input"
                      placeholder="e.g. UGX 145,000 Only!"
                      value={advForm.price_callout}
                      onChange={(e) => setAdvForm({ ...advForm, price_callout: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Auto-Animation Engine</label>
                    <select
                      className="select"
                      value={advForm.animation_style}
                      onChange={(e) => setAdvForm({ ...advForm, animation_style: e.target.value })}
                    >
                      <option value="ken-burns">Ken Burns Cinema Pan &amp; Zoom</option>
                      <option value="kinetic-slide">Kinetic Pop &amp; Glow Motion</option>
                      <option value="gold-spotlight">Gold Shimmer Spotlight</option>
                      <option value="pulse-zoom">Dynamic Pulse Zoom</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Screen Duration (Seconds)</label>
                    <input
                      className="input"
                      type="number"
                      min="3"
                      max="30"
                      value={advForm.duration_sec}
                      onChange={(e) => setAdvForm({ ...advForm, duration_sec: e.target.value })}
                    />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Upload Advert Video (MP4/WebM) or Photo (JPG/PNG)</label>
                    <input
                      className="input"
                      type="file"
                      accept="image/*,video/mp4,video/webm"
                      onChange={(e) => handleAdvertFileChange(e.target.files?.[0])}
                    />
                  </div>
                </div>

                <button className="btn btn-primary" style={{ marginTop: 14 }} type="submit">
                  <Sparkles size={16} /> Publish Animated Advert to Screen
                </button>
              </form>

              {/* LIVE ANIMATION PREVIEW */}
              <div className="panel-card" style={{ marginBottom: 0 }}>
                <h4 style={{ color: 'var(--ups-green-deep)', marginBottom: 10 }}>
                  Live Screen Animation Preview
                </h4>
                <AdvertStage
                  previewAdvert={{
                    ...advForm,
                    title: advForm.title || 'Live Animated Advert Preview',
                    subtitle: advForm.subtitle || 'Choose an animation preset or upload a photo/video to preview how it runs on the storefront screen.',
                    media_url: advPreviewUrl || advForm.media_url,
                  }}
                />
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Media</th>
                    <th>Title &amp; Price Callout</th>
                    <th>Type &amp; Animation</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adverts.map((a) => {
                    const active = a.active === true || a.active === 1;
                    return (
                      <tr key={a.id}>
                        <td>
                          {a.media_type === 'video' ? (
                            <span className="status-badge badge-blue">VIDEO AD</span>
                          ) : (
                            <img src={a.media_url} alt={a.title} className="table-thumb" />
                          )}
                        </td>
                        <td>
                          <strong>{a.title}</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--ups-gold-dark)' }}>{a.price_callout}</div>
                        </td>
                        <td>
                          {a.media_type.toUpperCase()} • <code>{a.animation_style}</code> ({a.duration_sec}s)
                        </td>
                        <td>
                          <span className={`status-badge ${active ? 'badge-green' : 'badge-gray'}`}>
                            {active ? 'Running Live' : 'Paused'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => handleToggleAdvert(a)}>
                              {active ? 'Pause' : 'Activate'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAdvert(a.id)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: NEWS MANAGER ==================== */}
        {tab === 'news' && (
          <div>
            <form onSubmit={handleSaveNews} className="panel-card">
              <h3 style={{ color: 'var(--ups-green-deep)', marginBottom: 14 }}>
                {editingNews ? `Edit News: ${editingNews.title}` : 'Create & Publish Institutional News'}
              </h3>
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Headline *</label>
                  <input
                    className="input"
                    required
                    value={newsForm.title}
                    onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    className="input"
                    value={newsForm.category}
                    onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Author / Desk</label>
                  <input
                    className="input"
                    value={newsForm.author}
                    onChange={(e) => setNewsForm({ ...newsForm, author: e.target.value })}
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Short Summary *</label>
                  <input
                    className="input"
                    required
                    value={newsForm.summary}
                    onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })}
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Full Article Content *</label>
                  <textarea
                    className="textarea"
                    rows="4"
                    required
                    value={newsForm.content}
                    onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Upload Cover Photo (Optional)</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewsFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" type="submit">
                  <Plus size={15} /> {editingNews ? 'Save Changes' : 'Publish News Article'}
                </button>
                {editingNews && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setEditingNews(null);
                      setNewsForm({
                        title: '',
                        category: 'Institutional News',
                        summary: '',
                        content: '',
                        author: 'UPS Directorate of Production',
                        published: true,
                        image_url: '',
                      });
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Headline</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {newsList.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <strong>{n.title}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{n.summary}</div>
                      </td>
                      <td><span className="status-badge badge-green">{n.category}</span></td>
                      <td>{formatDate(n.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setEditingNews(n);
                              setNewsForm({ ...n });
                            }}
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteNews(n.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 6: FINANCIAL MANAGEMENT ==================== */}
        {tab === 'finance' && (
          <div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">Today&apos;s Income</div>
                <div className="kpi-value" style={{ color: '#15803d' }}>
                  {formatUgx(financeData.summary?.todayIncome)}
                </div>
                <div className="kpi-sub">Date: {financeData.summary?.todayDate}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Today&apos;s Expenses</div>
                <div className="kpi-value" style={{ color: '#b91c1c' }}>
                  {formatUgx(financeData.summary?.todayExpense)}
                </div>
                <div className="kpi-sub">Daily Net: {formatUgx(financeData.summary?.todayNet)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Filtered Total Income</div>
                <div className="kpi-value">{formatUgx(financeData.summary?.totalIncome)}</div>
                <div className="kpi-sub">All verified + manual sales</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Net Cashflow Balance</div>
                <div className="kpi-value" style={{ color: 'var(--ups-green)' }}>
                  {formatUgx(financeData.summary?.netBalance)}
                </div>
                <div className="kpi-sub">Expenses: {formatUgx(financeData.summary?.totalExpense)}</div>
              </div>
            </div>

            {/* Record Manual Daily Transaction */}
            <form onSubmit={handleRecordTransaction} className="panel-card no-print">
              <h3 style={{ color: 'var(--ups-green-deep)', marginBottom: 12 }}>
                Record Daily Financial Transaction (Income / Expense)
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Transaction Date *</label>
                  <input
                    className="input"
                    type="date"
                    required
                    value={txForm.tx_date}
                    onChange={(e) => setTxForm({ ...txForm, tx_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    className="select"
                    value={txForm.tx_type}
                    onChange={(e) => setTxForm({ ...txForm, tx_type: e.target.value })}
                  >
                    <option value="income">Income / Sale Receipt</option>
                    <option value="expense">Expense / Operational Cost</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Furniture Sales, Seed Sales, Logistics Fuel"
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Channel *</label>
                  <select
                    className="select"
                    value={txForm.payment_method}
                    onChange={(e) => setTxForm({ ...txForm, payment_method: e.target.value })}
                  >
                    <option value="Cash">Cash</option>
                    <option value="MTN Mobile Money (MoMo)">MTN Mobile Money (MoMo)</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="Bank Transfer (UPS Account)">Bank Transfer (UPS Account)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (UGX) *</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    required
                    value={txForm.amount_ugx}
                    onChange={(e) => setTxForm({ ...txForm, amount_ugx: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer / Party Name</label>
                  <input
                    className="input"
                    value={txForm.customer_or_party}
                    onChange={(e) => setTxForm({ ...txForm, customer_or_party: e.target.value })}
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Description *</label>
                  <input
                    className="input"
                    required
                    placeholder="Details of the daily transaction..."
                    value={txForm.description}
                    onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  />
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} type="submit">
                <Plus size={15} /> Record Transaction
              </button>
            </form>

            {/* Filter & Export Bar */}
            <div className="panel-card no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="date" className="input" style={{ width: 'auto' }} value={txFilterFrom} onChange={(e) => setTxFilterFrom(e.target.value)} />
                <span>to</span>
                <input type="date" className="input" style={{ width: 'auto' }} value={txFilterTo} onChange={(e) => setTxFilterTo(e.target.value)} />
                <select className="select" style={{ width: 'auto' }} value={txFilterType} onChange={(e) => setTxFilterType(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="income">Income Only</option>
                  <option value="expense">Expenses Only</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={() => loadActiveTab('finance')}>
                  Filter
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={exportFinanceCsv}>
                  <Download size={14} /> Export CSV
                </button>
                <button className="btn btn-gold btn-sm" onClick={() => window.print()}>
                  <Printer size={14} /> Print Daily Statement
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category &amp; Description</th>
                    <th>Payment Method</th>
                    <th>Party / Ref</th>
                    <th>Amount</th>
                    <th className="no-print">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(financeData.transactions || []).map((t) => (
                    <tr key={t.id}>
                      <td>{t.tx_date}</td>
                      <td>
                        <span className={`status-badge ${t.tx_type === 'income' ? 'badge-green' : 'badge-red'}`}>
                          {t.tx_type}
                        </span>
                      </td>
                      <td>
                        <strong>{t.category}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{t.description}</div>
                      </td>
                      <td>{t.payment_method}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        <div>{t.customer_or_party || '—'}</div>
                        <code>{t.reference_code}</code>
                      </td>
                      <td>
                        <strong style={{ color: t.tx_type === 'income' ? '#15803d' : '#b91c1c' }}>
                          {t.tx_type === 'income' ? '+' : '-'}{formatUgx(t.amount_ugx)}
                        </strong>
                      </td>
                      <td className="no-print">
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTransaction(t.id)}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 7: SETTINGS, AWS S3 & YOOLA SMS ==================== */}
        {tab === 'settings' && settingsData && (
          <div>
            <form onSubmit={handleSaveSettings} className="panel-card">
              <h3 style={{ color: 'var(--ups-green-deep)', marginBottom: 14 }}>
                Official Payment Accounts, Bulk Delivery &amp; Integrations Configuration
              </h3>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">MTN Mobile Money / MoMo Number &amp; Merchant Code</label>
                  <input
                    className="input"
                    value={cfgForm.mtn_momo_number || ''}
                    onChange={(e) => setCfgForm({ ...cfgForm, mtn_momo_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">MTN MoMo Registered Name</label>
                  <input
                    className="input"
                    value={cfgForm.mtn_momo_name || ''}
                    onChange={(e) => setCfgForm({ ...cfgForm, mtn_momo_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Airtel Money Number &amp; Merchant Code</label>
                  <input
                    className="input"
                    value={cfgForm.airtel_money_number || ''}
                    onChange={(e) => setCfgForm({ ...cfgForm, airtel_money_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Airtel Money Registered Name</label>
                  <input
                    className="input"
                    value={cfgForm.airtel_money_name || ''}
                    onChange={(e) => setCfgForm({ ...cfgForm, airtel_money_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Uganda Prisons Service Bank Name</label>
                  <input
                    className="input"
                    value={cfgForm.bank_name || ''}
                    onChange={(e) => setCfgForm({ ...cfgForm, bank_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank Account Name</label>
                  <input
                    className="input"
                    value={cfgForm.bank_account_name || ''}
                    onChange={(e) => setCfgForm({ ...cfgForm, bank_account_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank Account Number</label>
                  <input
                    className="input"
                    value={cfgForm.bank_account_number || ''}
                    onChange={(e) => setCfgForm({ ...cfgForm, bank_account_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank Branch</label>
                  <input
                    className="input"
                    value={cfgForm.bank_branch || ''}
                    onChange={(e) => setCfgForm({ ...cfgForm, bank_branch: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bulk Free Delivery Min Quantity (Units)</label>
                  <input
                    className="input"
                    type="number"
                    value={cfgForm.bulk_min_qty || '5'}
                    onChange={(e) => setCfgForm({ ...cfgForm, bulk_min_qty: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bulk Free Delivery Min Order Value (UGX)</label>
                  <input
                    className="input"
                    type="number"
                    value={cfgForm.bulk_min_ugx || '1000000'}
                    onChange={(e) => setCfgForm({ ...cfgForm, bulk_min_ugx: e.target.value })}
                  />
                </div>

                {/* Yoola SMS */}
                <div className="form-group full" style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 6 }}>
                  <h4 style={{ color: 'var(--ups-green-deep)' }}>
                    <MessageSquare size={16} style={{ display: 'inline', marginRight: 6 }} />
                    Yoola SMS Configuration (https://yoolasms.com/api/v1/send)
                  </h4>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Yoola SMS API Key {settingsData.settings.yoola_sms_api_key_masked ? `(Saved: ${settingsData.settings.yoola_sms_api_key_masked})` : ''}
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Paste your Yoola SMS API Key"
                    value={cfgForm.yoola_sms_api_key === '__UNCHANGED__' ? '' : cfgForm.yoola_sms_api_key || ''}
                    onChange={(e) => setCfgForm({ ...cfgForm, yoola_sms_api_key: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Yoola SMS Sender ID</label>
                  <input
                    className="input"
                    value={cfgForm.yoola_sms_sender_id || 'UPS-STORE'}
                    onChange={(e) => setCfgForm({ ...cfgForm, yoola_sms_sender_id: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Yoola SMS Sandbox Mode</label>
                  <select
                    className="select"
                    value={String(cfgForm.yoola_sms_sandbox || 'true')}
                    onChange={(e) => setCfgForm({ ...cfgForm, yoola_sms_sandbox: e.target.value })}
                  >
                    <option value="true">Sandbox Mode (Testing without SMS credit charge)</option>
                    <option value="false">LIVE Mode (Send real customer SMS in Uganda)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Auto-SMS Notifications</label>
                  <select
                    className="select"
                    value={String(cfgForm.yoola_sms_enabled || 'true')}
                    onChange={(e) => setCfgForm({ ...cfgForm, yoola_sms_enabled: e.target.value })}
                  >
                    <option value="true">Enabled (Send on Order, Proof &amp; Verification)</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>

                {/* AWS S3 */}
                <div className="form-group full" style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 6 }}>
                  <h4 style={{ color: 'var(--ups-green-deep)' }}>
                    <Cloud size={16} style={{ display: 'inline', marginRight: 6 }} />
                    AWS S3 Media Storage — Current Provider: {settingsData.storageStatus.provider}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                    For security, set <code>AWS_ACCESS_KEY_ID</code> and <code>AWS_SECRET_ACCESS_KEY</code> in your <code>.env</code> or Render Environment Variables. Bucket &amp; Region can be configured below or via env vars.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">AWS S3 Bucket Name</label>
                  <input
                    className="input"
                    placeholder="e.g. uganda-prisons-store-media"
                    value={cfgForm.aws_s3_bucket || ''}
                    onChange={(e) => setCfgForm({ ...cfgForm, aws_s3_bucket: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">AWS Region</label>
                  <input
                    className="input"
                    placeholder="e.g. eu-west-1 or af-south-1"
                    value={cfgForm.aws_region || 'eu-west-1'}
                    onChange={(e) => setCfgForm({ ...cfgForm, aws_region: e.target.value })}
                  />
                </div>
              </div>

              <button className="btn btn-primary" style={{ marginTop: 16 }} type="submit">
                Save All Settings
              </button>
            </form>

            {/* Test Yoola SMS + Change Password */}
            <div className="form-grid" style={{ marginBottom: 20 }}>
              <form onSubmit={handleSendTestSms} className="panel-card" style={{ marginBottom: 0 }}>
                <h4 style={{ color: 'var(--ups-green-deep)', marginBottom: 10 }}>
                  Send Test Yoola SMS
                </h4>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Test Phone Number (Uganda)</label>
                  <input
                    className="input"
                    required
                    value={testSmsPhone}
                    onChange={(e) => setTestSmsPhone(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Message (Optional)</label>
                  <input
                    className="input"
                    placeholder="Default UPS Store test SMS..."
                    value={testSmsMsg}
                    onChange={(e) => setTestSmsMsg(e.target.value)}
                  />
                </div>
                <button className="btn btn-gold btn-sm" type="submit">
                  <Send size={14} /> Send Test SMS
                </button>
                {testSmsResp && (
                  <pre style={{ marginTop: 10, background: 'var(--ups-black)', color: 'var(--ups-gold-bright)', border: '1px solid var(--ups-gold)', padding: 10, borderRadius: 8, fontSize: '0.75rem', overflowX: 'auto' }}>
                    {JSON.stringify(testSmsResp, null, 2)}
                  </pre>
                )}
              </form>

              <form onSubmit={handleChangePassword} className="panel-card" style={{ marginBottom: 0 }}>
                <h4 style={{ color: 'var(--ups-green-deep)', marginBottom: 10 }}>
                  Change Admin Password
                </h4>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Current Password</label>
                  <input
                    className="input"
                    type="password"
                    required
                    value={pwdForm.currentPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">New Password (min 6 chars)</label>
                  <input
                    className="input"
                    type="password"
                    required
                    minLength={6}
                    value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  />
                </div>
                <button className="btn btn-primary btn-sm" type="submit">
                  Update Admin Password
                </button>
              </form>
            </div>

            {/* SMS Logs */}
            <div className="panel-card">
              <h4 style={{ color: 'var(--ups-green-deep)', marginBottom: 10 }}>
                Yoola SMS Notification Audit Log
              </h4>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Phone</th>
                      <th>Event / Ref</th>
                      <th>Status</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settingsData.smsLogs || []).length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                          No SMS notifications logged yet. Place an order or click Send Test SMS.
                        </td>
                      </tr>
                    ) : (
                      settingsData.smsLogs.map((l) => (
                        <tr key={l.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{formatDateTime(l.created_at)}</td>
                          <td><code>{l.phone}</code></td>
                          <td>
                            <strong>{l.event_type}</strong>
                            <div style={{ fontSize: '0.75rem' }}>{l.reference_code}</div>
                          </td>
                          <td>
                            <span className={`status-badge ${l.provider_status.includes('sent') ? 'badge-green' : l.provider_status.includes('sim') ? 'badge-gold' : 'badge-red'}`}>
                              {l.provider_status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', maxWidth: 360 }}>{l.message}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
