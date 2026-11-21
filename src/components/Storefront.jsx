import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Building2,
  CheckCircle2,
  ClipboardList,
  Heart,
  LayoutGrid,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Newspaper,
  Package,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Table2,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import AdvertStage from './AdvertStage.jsx';
import CheckoutModal from './CheckoutModal.jsx';
import {
  apiFetch,
  formatDate,
  formatDateTime,
  formatUgx,
  orderStatusMeta,
  paymentStatusMeta,
} from '../utils/api';

const CATEGORIES = ['All', 'Furniture', 'Leather Footwear', 'Agricultural Seeds'];

export default function Storefront({ onNavigateAdmin, onToast }) {
  const [storeInfo, setStoreInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [adverts, setAdverts] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & view mode
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'chartlist'

  // Persistent Cart & Wishlist
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ups_cart') || '[]');
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ups_wishlist') || '[]');
    } catch {
      return [];
    }
  });

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailQty, setDetailQty] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Order Tracker & Proof of Payment Upload
  const [trackCode, setTrackCode] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [proofTxRef, setProofTxRef] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofNotes, setProofNotes] = useState('');
  const [uploadingTrackProof, setUploadingTrackProof] = useState(false);

  useEffect(() => {
    localStorage.setItem('ups_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('ups_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setSelectedProduct(null);
        setSelectedArticle(null);
        setCartOpen(false);
        setWishlistOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [infoRes, prodRes, advRes, newsRes] = await Promise.all([
          apiFetch('/api/store-info'),
          apiFetch('/api/products'),
          apiFetch('/api/adverts'),
          apiFetch('/api/news'),
        ]);
        setStoreInfo(infoRes);
        setProducts(prodRes.products || []);
        setAdverts(advRes.adverts || []);
        setNews(newsRes.news || []);
      } catch (err) {
        onToast(`Could not load store catalog: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (category !== 'All') {
      list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }
    if (sort === 'price_asc') list.sort((a, b) => a.price_ugx - b.price_ugx);
    if (sort === 'price_desc') list.sort((a, b) => b.price_ugx - a.price_ugx);
    if (sort === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, category, search, sort]);

  const wishlistProducts = useMemo(
    () => products.filter((p) => wishlist.includes(p.id)),
    [products, wishlist]
  );

  const cartCount = useMemo(() => cart.reduce((s, i) => s + Number(i.quantity), 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((s, i) => s + Number(i.price_ugx) * Number(i.quantity), 0),
    [cart]
  );

  function toggleWishlist(product) {
    setWishlist((prev) => {
      const exists = prev.includes(product.id);
      if (exists) {
        onToast(`Removed "${product.name}" from Wishlist`);
        return prev.filter((id) => id !== product.id);
      }
      onToast(`Saved "${product.name}" to Wishlist`);
      return [...prev, product.id];
    });
  }

  function addToCart(product, qty = 1) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + qty };
        return copy;
      }
      return [...prev, { ...product, quantity: qty }];
    });
    onToast(`Added ${qty} × ${product.name} to cart`);
  }

  function updateCartQty(id, delta) {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function openProductDetail(product) {
    setSelectedProduct(product);
    setDetailQty(1);
  }

  function startDirectPurchase(product, qty = 1) {
    setSelectedProduct(null);
    setCheckoutItems([{ ...product, quantity: qty }]);
  }

  async function handleTrackOrder(e) {
    e.preventDefault();
    if (!trackCode.trim()) return;
    setTrackError('');
    setTrackLoading(true);
    try {
      const data = await apiFetch(`/api/orders/track/${encodeURIComponent(trackCode.trim())}`);
      setTrackedOrder(data.order);
      setProofTxRef(data.order.payment_tx_ref || '');
    } catch (err) {
      setTrackedOrder(null);
      setTrackError(err.message);
    } finally {
      setTrackLoading(false);
    }
  }

  async function handleTrackedProofUpload(e) {
    e.preventDefault();
    if (!trackedOrder) return;
    setUploadingTrackProof(true);
    try {
      const fd = new FormData();
      fd.append('payment_tx_ref', proofTxRef);
      fd.append('customer_name', trackedOrder.customer_name);
      fd.append('proof_notes', proofNotes);
      if (proofFile) fd.append('proof', proofFile);

      const res = await fetch(
        `/api/orders/${encodeURIComponent(trackedOrder.reference_code)}/proof`,
        { method: 'POST', body: fd }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setTrackedOrder(data.order);
      setProofFile(null);
      setProofNotes('');
      onToast('Proof of payment submitted! Sales Admin has been notified.');
    } catch (err) {
      onToast(err.message);
    } finally {
      setUploadingTrackProof(false);
    }
  }

  const tickerItems = useMemo(() => {
    const base = [
      '🇺🇬 OFFICIAL UGANDA PRISONS SERVICE PRODUCTS STORE — NATIONWIDE ONLINE ORDERING',
      '🚚 BULK ORDERS: FREE NATIONWIDE DELIVERY BY UGANDA PRISONS SALES AGENTS',
      '🏛️ SMALL PURCHASES: CONVENIENT PICKUP AT 25+ UGANDA PRISONS UNITS ACROSS UGANDA',
      '💳 PAY VIA MTN MoMo • AIRTEL MONEY • OFFICIAL UPS BANK ACCOUNT • CASH / PAY ON DELIVERY',
      '📲 INSTANT YOOLA SMS ORDER & VERIFICATION ALERTS',
    ];
    const fromAdverts = adverts.map((a) => `⭐ ${a.title.toUpperCase()} — ${a.price_callout || a.badge_text}`);
    return [...base, ...fromAdverts, ...base, ...fromAdverts];
  }, [adverts]);

  return (
    <div>
      {/* Uganda Flag Ribbon */}
      <div className="uganda-ribbon" />

      {/* Top Institutional Strip */}
      <div className="top-strip">
        <div className="container top-strip-inner">
          <div>
            <strong>Uganda Prisons Service</strong> • Directorate of Production, Industries &amp; Farms — Official Nationwide Online Store
          </div>
          <div className="top-strip-links">
            <a href="#track-order">
              <Search size={13} /> Track Order &amp; Upload Payment Proof
            </a>
            <button onClick={onNavigateAdmin}>
              <Lock size={13} /> Admin Panel Login
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="site-header">
        <div className="container header-inner">
          <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="brand-emblem">
              <img
                src="/images/prisonslogo-1.png"
                alt="Uganda Prisons Service Official Logo"
                className="brand-logo-img"
              />
            </div>
            <div>
              <div className="brand-title">Uganda Prisons Service</div>
              <div className="brand-sub">Official Products &amp; Industries Store</div>
            </div>
          </div>

          <nav className="main-nav">
            <a href="#catalog">Products &amp; Chartlist</a>
            <a href="#track-order">Track / Pay Proof</a>
            <a href="#news">News</a>
            <a href="#about">About Us</a>
            <button className="nav-link" onClick={onNavigateAdmin} style={{ color: 'var(--ups-maroon)' }}>
              Admin Portal
            </button>
          </nav>

          <div className="header-actions">
            <button className="icon-btn" onClick={() => setWishlistOpen(true)} title="Wishlist">
              <Heart size={17} />
              <span>Wishlist</span>
              <span className="badge-count">{wishlist.length}</span>
            </button>
            <button className="icon-btn" onClick={() => setCartOpen(true)} title="Shopping Cart">
              <ShoppingCart size={17} />
              <span>Cart</span>
              <span className="badge-count">{cartCount}</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={onNavigateAdmin}>
              <Lock size={14} /> Admin
            </button>
          </div>
        </div>
      </header>

      {/* Hero + Running Animated Advert Stage */}
      <section className="hero-section">
        <div className="container hero-grid">
          <div>
            <div className="hero-pill">
              <Award size={14} /> Republic of Uganda • Prison Industries &amp; Certified Farms
            </div>
            <h1 className="hero-title">
              Authentic <span>Uganda Prisons Service</span> Products Delivered Nationwide
            </h1>
            <p className="hero-desc">
              Shop master-crafted solid Mahogany &amp; Mvule furniture, genuine full-grain leather shoes &amp; steppers, and certified Improved Hybrid Maize &amp; Soya Bean seeds directly from Uganda Prisons Service workshops and farms at transparent official price tags.
            </p>
            <div className="hero-cta-row">
              <a
                href="#catalog"
                className="btn btn-gold"
                onClick={() => setViewMode('chartlist')}
              >
                <ClipboardList size={17} /> View Official Price Chartlist
              </a>
              <a href="#catalog" className="btn btn-outline" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
                <ShoppingBag size={17} /> Browse Gallery
              </a>
              <a href="#track-order" className="btn btn-outline" style={{ background: 'transparent', color: '#f3cc73', borderColor: 'rgba(243,204,115,0.45)' }}>
                <Upload size={16} /> Submit Payment Proof
              </a>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>FREE</strong>
                <span>Bulk Order Delivery Nationwide</span>
              </div>
              <div className="hero-stat">
                <strong>25+ Units</strong>
                <span>Prison Pickup Points in Uganda</span>
              </div>
              <div className="hero-stat">
                <strong>4 Channels</strong>
                <span>MoMo, Airtel, UPS Bank &amp; Cash</span>
              </div>
            </div>
          </div>

          {/* LIVE AUTO-ANIMATED ADVERT STAGE */}
          <div>
            <AdvertStage
              adverts={adverts}
              onCtaClick={() => {
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        </div>
      </section>

      {/* Running Auto-Animated Promo Ticker */}
      <div className="promo-ticker">
        <div className="ticker-track">
          {tickerItems.map((txt, i) => (
            <span key={i}>{txt}</span>
          ))}
        </div>
      </div>

      {/* Trust & Logistics Bar */}
      <section className="trust-strip">
        <div className="container trust-grid">
          <div className="trust-card">
            <div className="trust-icon"><Truck size={20} /></div>
            <div>
              <h4>Free Bulk Delivery</h4>
              <p>Orders of {storeInfo?.bulkRules?.minQty || 5}+ items or {formatUgx(storeInfo?.bulkRules?.minUgx || 1000000)}+ delivered FREE nationwide by UPS agents.</p>
            </div>
          </div>
          <div className="trust-card">
            <div className="trust-icon"><Building2 size={20} /></div>
            <div>
              <h4>Nearby Prison Unit Pickup</h4>
              <p>Small orders are conveniently collected from any nearby Uganda Prisons unit across all regions.</p>
            </div>
          </div>
          <div className="trust-card">
            <div className="trust-icon"><Smartphone size={20} /></div>
            <div>
              <h4>MoMo, Airtel, Bank &amp; Cash</h4>
              <p>Pay via MTN Mobile Money, Airtel Money, UPS Bank Account, or Cash/Pay on Delivery.</p>
            </div>
          </div>
          <div className="trust-card">
            <div className="trust-icon"><ShieldCheck size={20} /></div>
            <div>
              <h4>Verified Proof &amp; Yoola SMS</h4>
              <p>Instant automated Purchase Reference, Sales Admin verification &amp; SMS alerts to your phone.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS & OFFICIAL PRICE CHARTLIST SECTION */}
      <section id="catalog" className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="section-kicker">Official Uganda Prisons Service Catalog</div>
              <h2 className="section-title">Available Products &amp; Price Chartlist</h2>
              <p className="section-sub">
                Tap any product to inspect full specifications, save to your Wishlist, or place an online order anywhere in Uganda.
              </p>
            </div>
            <div className="view-toggle">
              <button
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={15} /> Gallery View
              </button>
              <button
                className={viewMode === 'chartlist' ? 'active' : ''}
                onClick={() => setViewMode('chartlist')}
              >
                <Table2 size={15} /> Price Chartlist
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="catalog-toolbar">
            <div className="category-tabs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`cat-tab ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="catalog-filters">
              <div style={{ position: 'relative', minWidth: 230 }}>
                <input
                  className="input"
                  placeholder="Search beds, shoes, maize seeds..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="select"
                style={{ width: 'auto' }}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="featured">Sort: Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="panel-card" style={{ textAlign: 'center', padding: 48 }}>
              Loading official Uganda Prisons Service products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="panel-card" style={{ textAlign: 'center', padding: 48 }}>
              No products matched your search. Try another category or keyword.
            </div>
          ) : viewMode === 'grid' ? (
            <div className="product-grid">
              {filteredProducts.map((p) => {
                const isWished = wishlist.includes(p.id);
                return (
                  <article className="product-card" key={p.id}>
                    <div className="product-img-box" onClick={() => openProductDetail(p)}>
                      <img src={p.image_url} alt={p.name} loading="lazy" />
                      <span className="cat-badge">{p.category}</span>
                      <button
                        className={`wish-float-btn ${isWished ? 'active' : ''}`}
                        title={isWished ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(p);
                        }}
                      >
                        <Heart size={17} fill={isWished ? '#dc2626' : 'none'} />
                      </button>
                      <div className="price-tag-badge">
                        {formatUgx(p.price_ugx)}
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, opacity: 0.85 }}>
                          {' '}/ {p.unit_label}
                        </span>
                      </div>
                    </div>

                    <div className="product-body">
                      <div className="product-sku">{p.sku} • In Stock: {p.stock_qty}</div>
                      <h3 className="product-name" onClick={() => openProductDetail(p)}>
                        {p.name}
                      </h3>
                      <p className="product-desc">{p.description}</p>
                      <div className="product-meta-row">
                        <span>Bulk Free Delivery: {p.bulk_min_qty}+ units</span>
                        <span style={{ color: 'var(--ups-green)', fontWeight: 700 }}>Tap to view</span>
                      </div>
                      <div className="product-actions">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => addToCart(p, 1)}
                        >
                          <ShoppingCart size={14} /> Add to Cart
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => startDirectPurchase(p, 1)}
                        >
                          Order Now
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* OFFICIAL PRICE CHARTLIST TABLE VIEW */
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>SKU &amp; Product Name</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Official Price Tag</th>
                    <th>Bulk Free Delivery</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const isWished = wishlist.includes(p.id);
                    return (
                      <tr key={p.id}>
                        <td>
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="table-thumb"
                            style={{ cursor: 'pointer' }}
                            onClick={() => openProductDetail(p)}
                          />
                        </td>
                        <td>
                          <div style={{ fontSize: '0.74rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
                            {p.sku}
                          </div>
                          <strong
                            style={{ color: 'var(--ups-green-deep)', cursor: 'pointer' }}
                            onClick={() => openProductDetail(p)}
                          >
                            {p.name}
                          </strong>
                        </td>
                        <td>
                          <span className="status-badge badge-green">{p.category}</span>
                        </td>
                        <td>{p.unit_label}</td>
                        <td>
                          <strong style={{ color: 'var(--ups-green)', fontSize: '0.96rem' }}>
                            {formatUgx(p.price_ugx)}
                          </strong>
                        </td>
                        <td>{p.bulk_min_qty}+ units</td>
                        <td>
                          <span className={`status-badge ${p.stock_qty > 5 ? 'badge-green' : 'badge-gold'}`}>
                            {p.stock_qty} available
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => openProductDetail(p)}>
                              View
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => toggleWishlist(p)}
                              title="Wishlist"
                            >
                              <Heart size={13} fill={isWished ? '#dc2626' : 'none'} color={isWished ? '#dc2626' : 'currentColor'} />
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => startDirectPurchase(p, 1)}>
                              Buy
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* TRACK ORDER & SUBMIT PROOF OF PAYMENT SECTION */}
      <section id="track-order" className="section section-alt">
        <div className="container">
          <div className="tracker-card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 26, alignItems: 'center' }}>
              <div>
                <span className="advert-badge" style={{ marginBottom: 12 }}>
                  <ShieldCheck size={14} /> Automated Reference Lookup
                </span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginBottom: 10 }}>
                  Track Your Order or Submit Proof of Payment
                </h2>
                <p style={{ color: '#d6e4dc', fontSize: '0.92rem' }}>
                  Already placed an order? Enter your automated Purchase Reference (e.g. <strong>UPS-20261121-4821</strong>) to check verification status, delivery/pickup updates, or upload your MTN MoMo / Airtel Money / Bank receipt for Sales Admin approval.
                </p>
              </div>
              <form onSubmit={handleTrackOrder} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  className="input"
                  style={{ flex: 1, minWidth: 210 }}
                  placeholder="Enter Purchase Reference (e.g. UPS-...)"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                />
                <button className="btn btn-gold" type="submit" disabled={trackLoading}>
                  <Search size={16} /> {trackLoading ? 'Searching...' : 'Track Order'}
                </button>
              </form>
            </div>

            {trackError && (
              <div className="alert alert-error" style={{ marginTop: 18, marginBottom: 0 }}>
                {trackError}
              </div>
            )}

            {trackedOrder && (
              <div
                className="panel-card"
                style={{ marginTop: 22, marginBottom: 0, color: 'var(--ink)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
                      PURCHASE REFERENCE
                    </div>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--ups-green-deep)' }}>
                      {trackedOrder.reference_code}
                    </strong>
                    <span style={{ marginLeft: 10, fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                      • {trackedOrder.customer_name} ({trackedOrder.customer_phone})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`status-badge ${paymentStatusMeta(trackedOrder.payment_status).cls}`}>
                      {paymentStatusMeta(trackedOrder.payment_status).label}
                    </span>
                    <span className={`status-badge ${orderStatusMeta(trackedOrder.order_status).cls}`}>
                      {orderStatusMeta(trackedOrder.order_status).label}
                    </span>
                  </div>
                </div>

                <div className="form-grid" style={{ fontSize: '0.86rem', marginBottom: 14 }}>
                  <div>
                    <strong>Total Amount:</strong> {formatUgx(trackedOrder.total_ugx)} ({trackedOrder.payment_method})
                  </div>
                  <div>
                    <strong>Fulfillment:</strong>{' '}
                    {trackedOrder.delivery_type === 'bulk_free_delivery'
                      ? `FREE Bulk Delivery to ${trackedOrder.delivery_address} (${trackedOrder.district})`
                      : `Pickup at ${trackedOrder.prison_unit}`}
                  </div>
                  <div>
                    <strong>Ordered On:</strong> {formatDateTime(trackedOrder.created_at)}
                  </div>
                  {trackedOrder.payment_tx_ref && (
                    <div>
                      <strong>Transaction ID:</strong> {trackedOrder.payment_tx_ref}
                    </div>
                  )}
                </div>

                {trackedOrder.admin_notes && (
                  <div className="alert alert-info" style={{ fontSize: '0.84rem' }}>
                    <strong>Sales Admin Note:</strong> {trackedOrder.admin_notes}
                  </div>
                )}

                {trackedOrder.payment_status !== 'verified' &&
                  trackedOrder.payment_method !== 'Cash / Pay on Delivery' && (
                    <form
                      onSubmit={handleTrackedProofUpload}
                      style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 10 }}
                    >
                      <h4 style={{ color: 'var(--ups-green-deep)', marginBottom: 10 }}>
                        Upload / Update Proof of Payment
                      </h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Transaction ID / Bank Slip Reference *</label>
                          <input
                            className="input"
                            required
                            value={proofTxRef}
                            onChange={(e) => setProofTxRef(e.target.value)}
                            placeholder="Enter MTN MoMo / Airtel / Bank Ref"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Receipt Image or PDF</label>
                          <input
                            className="input"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                          />
                        </div>
                        <div className="form-group full">
                          <label className="form-label">Notes (Optional)</label>
                          <input
                            className="input"
                            value={proofNotes}
                            onChange={(e) => setProofNotes(e.target.value)}
                            placeholder="Any note for Sales Admin"
                          />
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: 12 }}
                        disabled={uploadingTrackProof}
                      >
                        <Upload size={14} />{' '}
                        {uploadingTrackProof ? 'Uploading...' : 'Submit Proof of Payment'}
                      </button>
                    </form>
                  )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* NEWS & ANNOUNCEMENTS SECTION */}
      <section id="news" className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="section-kicker">Official Updates &amp; Bulletins</div>
              <h2 className="section-title">Uganda Prisons Industries &amp; Farms News</h2>
              <p className="section-sub">
                Stay informed about seasonal certified seed harvests, new furniture collections, exhibitions, and institutional trade updates.
              </p>
            </div>
          </div>

          <div className="news-grid">
            {news.map((article) => (
              <article className="news-card" key={article.id}>
                {article.image_url && <img src={article.image_url} alt={article.title} loading="lazy" />}
                <div className="news-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                    <span className="status-badge badge-green">{article.category}</span>
                    <span>{formatDate(article.created_at)}</span>
                  </div>
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => setSelectedArticle(article)}
                  >
                    <Newspaper size={14} /> Read Full Story
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section id="about" className="section section-alt">
        <div className="container about-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div className="brand-emblem" style={{ width: 64, height: 64, padding: 4 }}>
                <img
                  src="/images/prisonslogo-1.png"
                  alt="Uganda Prisons Service Official Crest"
                  className="brand-logo-img"
                />
              </div>
              <div>
                <div className="section-kicker" style={{ marginBottom: 2 }}>About Uganda Prisons Service Production</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--ups-blue)' }}>For God and My Country • Official Production &amp; Industries</div>
              </div>
            </div>
            <h2 className="section-title" style={{ marginBottom: 14 }}>
              Rehabilitation Through Craftsmanship, Industry &amp; Modern Agriculture
            </h2>
            <p style={{ color: 'var(--ink-muted)', marginBottom: 14 }}>
              The <strong>Uganda Prisons Service (UPS) Directorate of Production and Industries</strong> transforms rehabilitation into national development. Across our carpentry workshops, leathercraft ateliers, and expansive agricultural farms in Uganda, inmates acquire certified vocational skills under expert master trainers while producing durable, high-value Ugandan goods.
            </p>
            <p style={{ color: 'var(--ink-muted)', marginBottom: 20 }}>
              Every solid Mahogany bed, Mvule dining set, pair of full-grain leather shoes or steppers, and bag of certified Improved Hybrid Maize or Maksoy Soya Bean seeds you purchase directly supports offender rehabilitation, national food security, and self-reliance — backed by transparent official pricing, nationwide bulk delivery, and pickup across 25+ Uganda Prisons units.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#catalog" className="btn btn-primary">
                Shop Official Catalog
              </a>
              <button className="btn btn-outline" onClick={onNavigateAdmin}>
                <Lock size={15} /> Staff &amp; Sales Admin Portal
              </button>
            </div>
          </div>

          <div className="about-cards">
            <div className="about-mini-card">
              <h4>🪵 Carpentry &amp; Woodworks</h4>
              <p>Kiln-dried solid Ugandan Mahogany, Mvule, and Pine beds, chairs, dining sets, office desks, and school furniture built to last generations.</p>
            </div>
            <div className="about-mini-card">
              <h4>👞 Leathercraft &amp; Footwear</h4>
              <p>Hand-stitched genuine cowhide leather formal shoes, institutional boots, and durable everyday leather steppers and sandals.</p>
            </div>
            <div className="about-mini-card">
              <h4>🌽 Certified Farm Seeds</h4>
              <p>High-germination Improved Hybrid Maize (Longe 10H / Bazooka), Maksoy 3N Soya Bean seeds, and commercial farm produce.</p>
            </div>
            <div className="about-mini-card">
              <h4>🇺🇬 Nationwide Access</h4>
              <p>Free bulk delivery nationwide by Prison Sales Agents and convenient local pickup for smaller purchases at any nearby Uganda Prisons unit.</p>
            </div>
          </div>
        </div>
      </section>

      {/* INSTITUTIONAL FOOTER WITH DEVELOPER DETAILS */}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div className="brand-emblem" style={{ width: 52, height: 52 }}>
                <img
                  src="/images/prisonslogo-1.png"
                  alt="Uganda Prisons Service Logo"
                  className="brand-logo-img"
                />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, color: '#fff', fontSize: '1.08rem' }}>
                  Uganda Prisons Service
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ups-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Products &amp; Industries Online Store
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#cbd5e1' }}>
              Official e-commerce platform for Uganda Prisons Service Furniture, Genuine Leather Footwear, and Certified Agricultural Seeds. Nationwide bulk delivery &amp; local Prison Unit pickup.
            </p>
          </div>

          <div>
            <div className="footer-heading">Quick Navigation</div>
            <ul className="footer-links">
              <li><a href="#catalog">Products &amp; Price Chartlist</a></li>
              <li><a href="#track-order">Track Order &amp; Proof of Payment</a></li>
              <li><a href="#news">Institutional News</a></li>
              <li><a href="#about">About Us</a></li>
              <li><button onClick={onNavigateAdmin}>Admin Panel Portal →</button></li>
            </ul>
          </div>

          <div>
            <div className="footer-heading">Official Payments</div>
            <ul className="footer-links" style={{ fontSize: '0.84rem' }}>
              <li>MTN Mobile Money (MoMo)</li>
              <li>Airtel Money</li>
              <li>Uganda Prisons Service Bank Account</li>
              <li>Cash / Pay on Delivery</li>
              <li>Yoola SMS Order Alerts</li>
            </ul>
          </div>

          <div>
            <div className="footer-heading">Contact &amp; Sales Desk</div>
            <ul className="footer-links" style={{ fontSize: '0.84rem' }}>
              <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <MapPin size={14} color="#f3cc73" /> Plot 13/15 Parliament Ave &amp; Luzira Industries, Kampala
              </li>
              <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Phone size={14} color="#f3cc73" /> {storeInfo?.support?.phone || '+256 394 915 409'}
              </li>
              <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Mail size={14} color="#f3cc73" /> {storeInfo?.support?.email || 'sales@prisons.go.ug'}
              </li>
            </ul>
          </div>
        </div>

        {/* Exact Required Developer Details */}
        <div className="developer-bar">
          <div className="container">
            <div>
              © {new Date().getFullYear()} Uganda Prisons Service Products Store. All Rights Reserved.
            </div>
            <div style={{ marginTop: 6 }}>
              Developer: <strong>CPL Warder Oringa Walter Kisembo</strong> |{' '}
              <a href="https://wa.me/256394915409" target="_blank" rel="noreferrer">
                <MessageCircle size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Whatsapp:+256394915409
              </a>{' '}
              |{' '}
              <a href="mailto:oringawalterkisembo@gmail.com">
                Email: oringawalterkisembo@gmail.com
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ==================== PRODUCT DETAIL MODAL ==================== */}
      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{selectedProduct.name}</h3>
              <button className="icon-btn" aria-label="Close product modal" onClick={() => setSelectedProduct(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22 }}>
                <div>
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }}
                  />
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="status-badge badge-green">{selectedProduct.category}</span>
                    <span className="status-badge badge-gray">SKU: {selectedProduct.sku}</span>
                    <span className="status-badge badge-gold">Stock: {selectedProduct.stock_qty}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--ups-green)', marginBottom: 4 }}>
                    {formatUgx(selectedProduct.price_ugx)}
                    <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      {' '}/ {selectedProduct.unit_label}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', marginBottom: 14 }}>
                    {selectedProduct.description}
                  </p>
                  {selectedProduct.specifications && (
                    <div className="panel-card" style={{ padding: 12, background: '#faf8f4', fontSize: '0.82rem', marginBottom: 14 }}>
                      <strong>Specifications:</strong>
                      <div style={{ marginTop: 4 }}>{selectedProduct.specifications}</div>
                    </div>
                  )}
                  <div className="alert alert-success" style={{ fontSize: '0.8rem', padding: 10 }}>
                    <strong>Delivery Policy:</strong> Order {selectedProduct.bulk_min_qty}+ units for{' '}
                    <strong>FREE nationwide delivery</strong> by UPS agents, or pick up smaller orders from any nearby Uganda Prisons unit.
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <label className="form-label">Quantity:</label>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, selectedProduct.stock_qty)}
                      className="input"
                      style={{ width: 90 }}
                      value={detailQty}
                      onChange={(e) => setDetailQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                    <strong>Subtotal: {formatUgx(selectedProduct.price_ugx * detailQty)}</strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => startDirectPurchase(selectedProduct, detailQty)}
                    >
                      <ShoppingBag size={16} /> Purchase Now ({formatUgx(selectedProduct.price_ugx * detailQty)})
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          addToCart(selectedProduct, detailQty);
                          setSelectedProduct(null);
                        }}
                      >
                        <ShoppingCart size={15} /> Add to Cart
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => toggleWishlist(selectedProduct)}
                      >
                        <Heart
                          size={15}
                          fill={wishlist.includes(selectedProduct.id) ? '#dc2626' : 'none'}
                          color={wishlist.includes(selectedProduct.id) ? '#dc2626' : 'currentColor'}
                        />
                        {wishlist.includes(selectedProduct.id) ? 'Saved in Wishlist' : 'Add to Wishlist'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CART DRAWER ==================== */}
      {cartOpen && (
        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Shopping Cart ({cartCount})</h3>
              <button className="icon-btn" onClick={() => setCartOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body">
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-muted)' }}>
                  <ShoppingCart size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <p>Your shopping cart is empty.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      paddingBottom: 14,
                      marginBottom: 14,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <img src={item.image_url} alt={item.name} className="table-thumb" style={{ width: 68, height: 56 }} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--ups-green-deep)' }}>{item.name}</strong>
                      <div style={{ fontSize: '0.82rem', color: 'var(--ups-green)', fontWeight: 700 }}>
                        {formatUgx(item.price_ugx)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => updateCartQty(item.id, -1)}>-</button>
                        <strong>{item.quantity}</strong>
                        <button className="btn btn-outline btn-sm" onClick={() => updateCartQty(item.id, 1)}>+</button>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ marginLeft: 'auto' }}
                          onClick={() => updateCartQty(item.id, -item.quantity)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="drawer-foot">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '1.05rem' }}>
                  <span>Subtotal:</span>
                  <strong style={{ color: 'var(--ups-green)' }}>{formatUgx(cartTotal)}</strong>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutItems(cart);
                  }}
                >
                  Proceed to Checkout &amp; Payment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== WISHLIST DRAWER ==================== */}
      {wishlistOpen && (
        <div className="drawer-backdrop" onClick={() => setWishlistOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Saved Wishlist ({wishlistProducts.length})</h3>
              <button className="icon-btn" onClick={() => setWishlistOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body">
              {wishlistProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-muted)' }}>
                  <Heart size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <p>No items in your wishlist yet. Tap the heart on any product to save it here.</p>
                </div>
              ) : (
                wishlistProducts.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      paddingBottom: 14,
                      marginBottom: 14,
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <img src={p.image_url} alt={p.name} className="table-thumb" style={{ width: 68, height: 56 }} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--ups-green-deep)' }}>{p.name}</strong>
                      <div style={{ fontSize: '0.84rem', color: 'var(--ups-green)', fontWeight: 700, marginBottom: 6 }}>
                        {formatUgx(p.price_ugx)}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setWishlistOpen(false);
                            startDirectPurchase(p, 1);
                          }}
                        >
                          Order Now
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => addToCart(p, 1)}
                        >
                          + Cart
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => toggleWishlist(p)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== CHECKOUT MODAL ==================== */}
      {checkoutItems && (
        <CheckoutModal
          items={checkoutItems}
          storeInfo={storeInfo}
          onClose={() => setCheckoutItems(null)}
          onOrderSuccess={() => {
            // Clear cart if checkout originated from cart
            if (checkoutItems === cart) setCart([]);
          }}
          onToast={onToast}
        />
      )}

      {/* ==================== NEWS ARTICLE MODAL ==================== */}
      {selectedArticle && (
        <div className="modal-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{selectedArticle.title}</h3>
              <button className="icon-btn" onClick={() => setSelectedArticle(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {selectedArticle.image_url && (
                <img
                  src={selectedArticle.image_url}
                  alt={selectedArticle.title}
                  style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }}
                />
              )}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                <span className="status-badge badge-green">{selectedArticle.category}</span>
                <span>By {selectedArticle.author}</span>
                <span>• {formatDate(selectedArticle.created_at)}</span>
              </div>
              <p style={{ fontWeight: 700, marginBottom: 12, color: 'var(--ups-green-deep)' }}>
                {selectedArticle.summary}
              </p>
              <div style={{ whiteSpace: 'pre-line', color: 'var(--ink)', lineHeight: 1.7 }}>
                {selectedArticle.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
