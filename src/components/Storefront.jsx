import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Footprints,
  Heart,
  HelpCircle,
  Home,
  LayoutGrid,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Newspaper,
  Package,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Sprout,
  Table2,
  Trash2,
  Truck,
  Upload,
  User,
  X,
  Zap,
} from 'lucide-react';
import AdvertStage from './AdvertStage.jsx';
import CheckoutModal from './CheckoutModal.jsx';
import CustomerAuthModal from './CustomerAuthModal.jsx';
import CustomerAccountModal from './CustomerAccountModal.jsx';
import {
  apiFetch,
  customerFetch,
  formatDate,
  formatDateTime,
  formatUgx,
  getCustomerToken,
  orderStatusMeta,
  paymentStatusMeta,
  setCustomerToken,
} from '../utils/api';

const CATEGORIES = ['All', 'Furniture', 'Leather Footwear', 'Agricultural Seeds', 'Other'];

const JUMIA_SIDEBAR_MENU = [
  { label: 'All UPS Products', category: 'All', search: '', icon: LayoutGrid },
  { label: 'Wooden Beds & Bedroom', category: 'Furniture', search: 'Bed', icon: Sofa },
  { label: 'Dining Tables & Chairs', category: 'Furniture', search: 'Dining', icon: Sofa },
  { label: 'Executive Office Furniture', category: 'Furniture', search: 'Desk', icon: Sofa },
  { label: 'Leather Formal Shoes', category: 'Leather Footwear', search: 'Shoe', icon: Footprints },
  { label: 'Leather Steppers & Sandals', category: 'Leather Footwear', search: 'Stepper', icon: Footprints },
  { label: 'Leather Briefcases & Belts', category: 'Leather Footwear', search: 'Leather', icon: ShoppingBag },
  { label: 'Improved Hybrid Maize Seeds', category: 'Agricultural Seeds', search: 'Maize', icon: Sprout },
  { label: 'Certified Soya Bean Seeds', category: 'Agricultural Seeds', search: 'Soya', icon: Sprout },
  { label: 'Handwoven Baskets & Crafts', category: 'Other', search: '', icon: Package },
];

const QUICK_TILES = [
  { label: 'Wooden Beds', img: '/images/products/wooden-bed.jpg', category: 'Furniture', search: 'Bed' },
  { label: 'Tables & Chairs', img: '/images/products/wooden-dining-set.jpg', category: 'Furniture', search: 'Dining' },
  { label: 'Office Desks', img: '/images/ups/ups-11.jpg', category: 'Furniture', search: 'Desk' },
  { label: 'Leather Shoes', img: '/images/products/leather-shoes.jpg', category: 'Leather Footwear', search: 'Shoe' },
  { label: 'Leather Steppers', img: '/images/products/leather-sandals.jpg', category: 'Leather Footwear', search: 'Stepper' },
  { label: 'Hybrid Maize', img: '/images/products/hybrid-maize-seeds.jpg', category: 'Agricultural Seeds', search: 'Maize' },
  { label: 'Soya Seeds', img: '/images/products/soya-bean-seeds.jpg', category: 'Agricultural Seeds', search: 'Soya' },
  { label: 'Price Chartlist', img: '/images/ups/ups-14.jpg', action: 'chartlist' },
];

const UPS_SHOWCASE_GALLERY = [
  { src: '/images/ups/ups-17.jpg', tag: 'Carpentry Workshop', title: 'Luzira Prison Industries Woodworks & Chair Production' },
  { src: '/images/ups/ups-11.jpg', tag: 'Executive Furniture', title: 'Handcrafted Solid Mahogany Office Desk & Maroon Chairs' },
  { src: '/images/ups/ups-24.jpg', tag: 'Genuine Leather', title: 'Master-Crafted UPS Formal Leather Shoes' },
  { src: '/images/ups/ups-06.jpg', tag: 'Leathercraft Stall', title: 'Genuine Leather Briefcases, Bags & Footwear Display' },
  { src: '/images/ups/ups-07.jpg', tag: 'Leather Accessories', title: 'Hand-Stitched Leather Belts, Sandals & Steppers' },
  { src: '/images/ups/ups-21.jpg', tag: 'Certified Seeds', title: 'Bulk Uganda Prisons Certified Maize & Soya Seed Stocks' },
  { src: '/images/ups/ups-14.jpg', tag: 'Quality Seeds Desk', title: 'UPS Official Quality Seeds & Craftsmanship Exhibition' },
  { src: '/images/ups/ups-03.jpg', tag: 'Furniture Showroom', title: 'UPS Exhibition Pavilion — Sofas, Timber & Farm Seeds' },
  { src: '/images/ups/ups-01.jpg', tag: 'National Exhibition', title: 'Official Inspection of UPS Production & Industries Pavilion' },
  { src: '/images/ups/ups-23.jpg', tag: 'Farmer Advisory', title: 'UPS Agricultural Farms — Quality Seeds & Pasture Desk' },
  { src: '/images/ups/ups-13.jpg', tag: 'Artisanal Crafts', title: 'Handwoven Rehabilitation Vocational Baskets & Crafts' },
  { src: '/images/ups/ups-18.jpg', tag: 'Regional Sales', title: 'UPS Regional Booth — Stools, Crafts & Certified Produce' },
];

function useDailyCountdown() {
  const [left, setLeft] = useState({ h: '08', m: '45', s: '00' });
  useEffect(() => {
    function tick() {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setLeft({ h, m, s });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}

export default function Storefront({ onToast }) {
  const [storeInfo, setStoreInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [adverts, setAdverts] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & view mode
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [sort, setSort] = useState('featured');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'chartlist'

  // Persistent Cart, Wishlist & Recently Viewed (Jumia Signature!)
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ups_cart') || '[]'); } catch { return []; }
  });
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ups_wishlist') || '[]'); } catch { return []; }
  });
  const [recentIds, setRecentIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ups_recent') || '[]'); } catch { return []; }
  });

  // Modals, Drawers & Dropdowns
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailQty, setDetailQty] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [authModalMode, setAuthModalMode] = useState(null); // 'login' | 'register' | null
  const [accountModalTab, setAccountModalTab] = useState(null); // 'orders' | 'address' | null
  const [unitsModalOpen, setUnitsModalOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (!getCustomerToken()) return;
    customerFetch('/api/customer/me')
      .then((res) => setCustomer(res.customer || null))
      .catch(() => setCustomerToken(''));
  }, []);

  function handleCustomerLogout() {
    setCustomerToken('');
    setCustomer(null);
    onToast('Signed out of your UPS Market account.');
  }

  // Order Tracker & Proof of Payment Upload
  const [trackCode, setTrackCode] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [proofTxRef, setProofTxRef] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofNotes, setProofNotes] = useState('');
  const [uploadingTrackProof, setUploadingTrackProof] = useState(false);

  const countdown = useDailyCountdown();

  useEffect(() => { localStorage.setItem('ups_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('ups_wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem('ups_recent', JSON.stringify(recentIds)); }, [recentIds]);

  const hasAnyOverlay = Boolean(
    selectedProduct ||
    selectedArticle ||
    selectedPhoto ||
    checkoutItems ||
    cartOpen ||
    wishlistOpen ||
    mobileMenuOpen ||
    unitsModalOpen ||
    authModalMode ||
    accountModalTab
  );

  // Sync Android / browser Back button cleanly with open overlays
  useEffect(() => {
    if (!hasAnyOverlay) return;
    if (!window.history.state?.upsOverlay) {
      window.history.pushState({ upsOverlay: true }, '');
    }
    function onPopState() {
      setSelectedProduct(null);
      setSelectedArticle(null);
      setSelectedPhoto(null);
      setCheckoutItems(null);
      setCartOpen(false);
      setWishlistOpen(false);
      setMobileMenuOpen(false);
      setUnitsModalOpen(false);
      setAuthModalMode(null);
      setAccountModalTab(null);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [hasAnyOverlay]);

  function closeAllOverlays() {
    setSelectedProduct(null);
    setSelectedArticle(null);
    setSelectedPhoto(null);
    setCheckoutItems(null);
    setCartOpen(false);
    setWishlistOpen(false);
    setMobileMenuOpen(false);
    setUnitsModalOpen(false);
    setAuthModalMode(null);
    setAccountModalTab(null);
    if (window.history.state?.upsOverlay) {
      window.history.back();
    }
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && hasAnyOverlay) closeAllOverlays();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasAnyOverlay]);

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

  const searchSuggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [products, search]);

  const featuredDeals = useMemo(() => {
    const feat = products.filter((p) => p.featured === true || p.featured === 1);
    return (feat.length ? feat : products).slice(0, 8);
  }, [products]);

  const furnitureItems = useMemo(
    () => products.filter((p) => p.category === 'Furniture'),
    [products]
  );
  const leatherItems = useMemo(
    () => products.filter((p) => p.category === 'Leather Footwear'),
    [products]
  );
  const seedItems = useMemo(
    () => products.filter((p) => p.category === 'Agricultural Seeds'),
    [products]
  );

  const recentlyViewed = useMemo(
    () => recentIds.map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 6),
    [recentIds, products]
  );

  const wishlistProducts = useMemo(
    () => products.filter((p) => wishlist.includes(p.id)),
    [products, wishlist]
  );

  const cartCount = useMemo(() => cart.reduce((s, i) => s + Number(i.quantity), 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((s, i) => s + Number(i.price_ugx) * Number(i.quantity), 0),
    [cart]
  );

  function jumpToCatalog(nextCategory = 'All', nextSearch = '', nextView = null) {
    setCategory(nextCategory);
    setSearch(nextSearch);
    if (nextView) setViewMode(nextView);
    setMobileMenuOpen(false);
    setSearchFocused(false);
    setTimeout(() => {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setCategory('All');
    setSearchFocused(false);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  }

  function toggleWishlist(product) {
    setWishlist((prev) => {
      const exists = prev.includes(product.id);
      if (exists) {
        onToast(`Removed "${product.name}" from Saved Items`);
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
    onToast(`Added ${qty} × ${product.name} to Cart`);
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
    setSearchFocused(false);
    setRecentIds((prev) => [product.id, ...prev.filter((id) => id !== product.id)].slice(0, 8));
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

  function renderShelfCard(p, showStockBar = false) {
    const isWished = wishlist.includes(p.id);
    const stockPct = Math.min(100, Math.max(12, Math.round((Number(p.stock_qty || 10) / 100) * 100)));
    return (
      <article className="jm-shelf-card" key={p.id}>
        <div className="jm-card-media" onClick={() => openProductDetail(p)}>
          <img src={p.image_url} alt={p.name} loading="lazy" />
          <span className="jm-official-tag">UPS Official</span>
          <button
            className={`jm-wish-btn ${isWished ? 'active' : ''}`}
            aria-label="Save to wishlist"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(p);
            }}
          >
            <Heart size={14} fill={isWished ? '#9e1b4d' : 'none'} />
          </button>
        </div>
        <div className="jm-card-body">
          <div className="jm-card-title" onClick={() => openProductDetail(p)}>
            {p.name}
          </div>
          <div className="jm-card-price">{formatUgx(p.price_ugx)}</div>
          <div className="jm-card-unit">Per {p.unit_label} • Bulk {p.bulk_min_qty}+ Free</div>
          {showStockBar && (
            <div className="jm-stock-wrap">
              <div className="jm-stock-text">{p.stock_qty} items left</div>
              <div className="jm-stock-track">
                <div className="jm-stock-fill" style={{ width: `${stockPct}%` }} />
              </div>
            </div>
          )}
          <button
            className="jm-add-btn"
            onClick={() => addToCart(p, 1)}
          >
            ADD TO CART
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="jm-page">
      {/* Official Uganda Prisons Service Color Ribbon */}
      <div className="uganda-ribbon" />

      {/* Jumia-Style Top Promo Banner */}
      <div className="jm-top-banner">
        <div className="jm-container jm-top-banner-inner">
          <div className="jm-top-banner-left">
            <img src="/images/prisonslogo-1.png" alt="UPS Crest" className="jm-mini-crest" />
            <span>
              <strong>UGANDA PRISONS SERVICE OFFICIAL MARKET</strong> — Free Bulk Delivery Nationwide • 26 Prison Pickup Units
            </span>
          </div>
          <div className="jm-top-banner-right">
            <a href="tel:+256394915409" className="jm-call-pill">
              <Phone size={12} /> Call to Order: +256 394 915 409
            </a>
          </div>
        </div>
      </div>

      {/* Jumia-Style Sub-strip (Desktop) */}
      <div className="jm-substrip">
        <div className="jm-container jm-substrip-inner">
          <span className="jm-substrip-brand">
            <ShieldCheck size={13} /> For God and My Country • Official Directorate of Production &amp; Industries
          </span>
          <div className="jm-substrip-links">
            <button onClick={() => jumpToCatalog('All', '', 'chartlist')}>Official Price Chartlist</button>
            <button onClick={() => setUnitsModalOpen(true)}>26 Prison Pickup Units</button>
            <a href="#track-order">Track Order &amp; Upload Proof</a>
            <a href="#showcase">UPS Workshops</a>
            <a href="#news">News</a>
          </div>
        </div>
      </div>

      {/* ICONIC JUMIA STICKY HEADER (Desktop + Android Mobile) */}
      <header className="jm-header">
        <div className="jm-container jm-header-row">
          <div className="jm-header-left">
            <button
              className="jm-menu-btn"
              aria-label="Open categories menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div
              className="jm-logo"
              onClick={() => {
                setCategory('All');
                setSearch('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="jm-logo-badge">
                <img src="/images/prisonslogo-1.png" alt="Uganda Prisons Service Logo" />
              </div>
              <div className="jm-logo-text">
                <strong>UPS MARKET</strong>
                <span>Uganda Prisons Service</span>
              </div>
            </div>
          </div>

          {/* JUMIA BIG SEARCH BAR (Desktop inline, Mobile drops seamlessly to Row 2) */}
          <form className="jm-search-form" onSubmit={handleSearchSubmit}>
            <div className="jm-search-input-wrap">
              <Search size={17} className="jm-search-icon" />
              <input
                type="text"
                className="jm-search-input"
                placeholder="Search products, wooden beds, leather shoes, maize seeds..."
                value={search}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="jm-search-clear"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                >
                  <X size={15} />
                </button>
              )}

              {/* Live Jumia-Style Autocomplete Dropdown */}
              {searchFocused && searchSuggestions.length > 0 && (
                <div className="jm-search-dropdown">
                  {searchSuggestions.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className="jm-search-suggest-item"
                      onMouseDown={() => openProductDetail(p)}
                    >
                      <img src={p.image_url} alt={p.name} />
                      <div className="jm-suggest-meta">
                        <strong>{p.name}</strong>
                        <span>{p.category} • {formatUgx(p.price_ugx)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="jm-search-btn">
              SEARCH
            </button>
          </form>

          {/* JUMIA HEADER UTILITY ICONS */}
          <div className="jm-header-right">
            {/* Jumia Account Dropdown (Sign In / Create Account / My Orders) */}
            <div className="jm-help-wrap desktop-only">
              <button
                className="jm-nav-util"
                onClick={() => setAccountMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setAccountMenuOpen(false), 200)}
              >
                <User size={19} />
                <span>{customer ? `Hi, ${customer.full_name.split(' ')[0]}` : 'Account'}</span>
                <ChevronDown size={14} />
              </button>
              {accountMenuOpen && (
                <div className="jm-help-menu">
                  {!customer ? (
                    <>
                      <button
                        type="button"
                        className="jm-help-cta"
                        onMouseDown={() => { setAccountMenuOpen(false); setAuthModalMode('login'); }}
                      >
                        SIGN IN
                      </button>
                      <button
                        type="button"
                        onMouseDown={() => { setAccountMenuOpen(false); setAuthModalMode('register'); }}
                      >
                        Create UPS Account
                      </button>
                      <a href="#track-order" onMouseDown={() => setAccountMenuOpen(false)}>Track Order by Reference</a>
                      <button type="button" onMouseDown={() => { setAccountMenuOpen(false); setWishlistOpen(true); }}>
                        Saved Items ({wishlist.length})
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onMouseDown={() => { setAccountMenuOpen(false); setAccountModalTab('orders'); }}
                      >
                        My Orders &amp; Payment Proof
                      </button>
                      <button
                        type="button"
                        onMouseDown={() => { setAccountMenuOpen(false); setAccountModalTab('address'); }}
                      >
                        Address Book &amp; Pickup Unit
                      </button>
                      <button
                        type="button"
                        onMouseDown={() => { setAccountMenuOpen(false); setWishlistOpen(true); }}
                      >
                        Saved Items ({wishlist.length})
                      </button>
                      <button
                        type="button"
                        style={{ color: '#991b1b', fontWeight: 800, borderTop: '1px solid #eceef0', marginTop: 4 }}
                        onMouseDown={() => { setAccountMenuOpen(false); handleCustomerLogout(); }}
                      >
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="jm-help-wrap desktop-only">
              <button
                className="jm-nav-util"
                onClick={() => setHelpOpen((v) => !v)}
                onBlur={() => setTimeout(() => setHelpOpen(false), 200)}
              >
                <HelpCircle size={19} />
                <span>Help</span>
                <ChevronDown size={14} />
              </button>
              {helpOpen && (
                <div className="jm-help-menu">
                  <a href="#track-order" onMouseDown={() => setHelpOpen(false)}>Track Order &amp; Upload Proof</a>
                  <button type="button" onMouseDown={() => { setHelpOpen(false); setUnitsModalOpen(true); }}>
                    26 Uganda Prisons Pickup Units
                  </button>
                  <a href="#about" onMouseDown={() => setHelpOpen(false)}>Payment Guide (MoMo, Airtel, Bank)</a>
                  <a href="https://wa.me/256394915409" target="_blank" rel="noreferrer" className="jm-help-cta">
                    <MessageCircle size={15} /> WhatsApp Sales Desk
                  </a>
                </div>
              )}
            </div>

            <button
              className="jm-nav-util"
              onClick={() => setWishlistOpen(true)}
              aria-label="Wishlist"
            >
              <span className="jm-icon-badge-wrap">
                <Heart size={20} />
                {wishlist.length > 0 && <span className="jm-dot-badge">{wishlist.length}</span>}
              </span>
              <span className="desktop-label">Saved</span>
            </button>

            <button
              className="jm-nav-util jm-cart-util"
              onClick={() => setCartOpen(true)}
              aria-label="Cart"
            >
              <span className="jm-icon-badge-wrap">
                <ShoppingCart size={20} />
                <span className="jm-dot-badge">{cartCount}</span>
              </span>
              <span className="desktop-label">Cart</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN MARKETPLACE CANVAS (Jumia Gray #F1F1F2 Background) */}
      <main className="jm-main">
        {/* 1. ICONIC JUMIA 3-COLUMN HERO ROW */}
        <section className="jm-container jm-hero-row">
          {/* Left Column: Jumia Categories Sidebar (Desktop) */}
          <aside className="jm-cat-sidebar">
            <div className="jm-cat-sidebar-head">
              <LayoutGrid size={14} /> CATEGORIES
            </div>
            <ul>
              {JUMIA_SIDEBAR_MENU.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li key={i}>
                    <button onClick={() => jumpToCatalog(item.category, item.search, 'grid')}>
                      <Icon size={15} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
              <li className="jm-sidebar-divider">
                <button onClick={() => jumpToCatalog('All', '', 'chartlist')}>
                  <Table2 size={15} />
                  <span><strong>Official Price Chartlist</strong></span>
                </button>
              </li>
            </ul>
          </aside>

          {/* Center Column: Full Auto-Animated Video & Photo Advert Carousel */}
          <div className="jm-hero-carousel">
            <AdvertStage
              adverts={adverts}
              onCtaClick={() => jumpToCatalog('All', '', 'grid')}
            />
          </div>

          {/* Right Column: Jumia 2 Stacked Utility & Quick-Track Cards (Desktop) */}
          <aside className="jm-hero-right">
            <div className="jm-service-card">
              <a href="tel:+256394915409" className="jm-service-item">
                <div className="jm-service-ico maroon"><Phone size={16} /></div>
                <div>
                  <strong>CALL TO ORDER</strong>
                  <span>+256 394 915 409</span>
                </div>
              </a>
              <button className="jm-service-item" onClick={() => setUnitsModalOpen(true)}>
                <div className="jm-service-ico blue"><Building2 size={16} /></div>
                <div>
                  <strong>PRISON UNIT PICKUP</strong>
                  <span>26 Units Nationwide</span>
                </div>
              </button>
              <button className="jm-service-item" onClick={() => jumpToCatalog('All', '', 'chartlist')}>
                <div className="jm-service-ico gold"><Truck size={16} /></div>
                <div>
                  <strong>FREE BULK DELIVERY</strong>
                  <span>By UPS Sales Agents</span>
                </div>
              </button>
            </div>

            <div className="jm-promo-side-card">
              <div className="jm-promo-side-badge">
                <ShieldCheck size={14} /> VERIFIED PAYMENTS
              </div>
              <h4>Track Order &amp; Proof</h4>
              <p>MTN MoMo • Airtel Money • UPS Bank • Cash on Delivery</p>
              <a href="#track-order" className="btn btn-gold btn-sm" style={{ width: '100%' }}>
                <Upload size={14} /> Submit Payment Proof
              </a>
            </div>
          </aside>
        </section>

        {/* 2. JUMIA QUICK CATEGORY VISUAL TILES STRIP (8 Tiles Desktop / 4x2 Mobile) */}
        <section className="jm-container jm-section-gap">
          <div className="jm-white-card jm-tiles-card">
            <div className="jm-quick-tiles-grid">
              {QUICK_TILES.map((tile, idx) => (
                <button
                  key={idx}
                  className="jm-quick-tile"
                  onClick={() =>
                    tile.action === 'chartlist'
                      ? jumpToCatalog('All', '', 'chartlist')
                      : jumpToCatalog(tile.category, tile.search, 'grid')
                  }
                >
                  <div className="jm-tile-img-wrap">
                    <img src={tile.img} alt={tile.label} loading="lazy" />
                  </div>
                  <span>{tile.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 3. JUMIA FLASH SALES / OFFICIAL FEATURED DEALS SHELF (Light Maroon Bar + Live Countdown!) */}
        <section className="jm-container jm-section-gap">
          <div className="jm-shelf-box">
            <div className="jm-shelf-header maroon-bar">
              <div className="jm-shelf-title">
                <Zap size={18} color="#f5cd47" fill="#f5cd47" />
                <h2>Official UPS Featured Deals</h2>
              </div>
              <div className="jm-countdown">
                <Clock size={14} />
                <span>
                  Time Left: <strong>{countdown.h}h : {countdown.m}m : {countdown.s}s</strong>
                </span>
              </div>
              <button className="jm-see-all" onClick={() => jumpToCatalog('All', '', 'grid')}>
                SEE ALL <ChevronRight size={15} />
              </button>
            </div>
            <div className="jm-shelf-scroller">
              {loading
                ? <div className="jm-loading-pad">Loading official Uganda Prisons Service deals...</div>
                : featuredDeals.map((p) => renderShelfCard(p, true))}
            </div>
          </div>
        </section>

        {/* 4. JUMIA CATEGORY SHELF 1: FURNITURE (Institutional Blue Header Bar) */}
        {furnitureItems.length > 0 && (
          <section className="jm-container jm-section-gap">
            <div className="jm-shelf-box">
              <div className="jm-shelf-header blue-bar">
                <div className="jm-shelf-title">
                  <Sofa size={18} />
                  <h2>Prison Industries Furniture | Beds, Tables &amp; Chairs</h2>
                </div>
                <button className="jm-see-all" onClick={() => jumpToCatalog('Furniture', '', 'grid')}>
                  SEE ALL <ChevronRight size={15} />
                </button>
              </div>
              <div className="jm-shelf-scroller">
                {furnitureItems.map((p) => renderShelfCard(p, false))}
              </div>
            </div>
          </section>
        )}

        {/* 5. JUMIA CATEGORY SHELF 2: LEATHER FOOTWEAR (Light Maroon Header Bar) */}
        {leatherItems.length > 0 && (
          <section className="jm-container jm-section-gap">
            <div className="jm-shelf-box">
              <div className="jm-shelf-header maroon-bar">
                <div className="jm-shelf-title">
                  <Footprints size={18} />
                  <h2>Genuine Leather Footwear | Shoes, Steppers &amp; Briefcases</h2>
                </div>
                <button className="jm-see-all" onClick={() => jumpToCatalog('Leather Footwear', '', 'grid')}>
                  SEE ALL <ChevronRight size={15} />
                </button>
              </div>
              <div className="jm-shelf-scroller">
                {leatherItems.map((p) => renderShelfCard(p, false))}
              </div>
            </div>
          </section>
        )}

        {/* 6. JUMIA CATEGORY SHELF 3: CERTIFIED AGRICULTURAL SEEDS (Black & Gold Header Bar) */}
        {seedItems.length > 0 && (
          <section className="jm-container jm-section-gap">
            <div className="jm-shelf-box">
              <div className="jm-shelf-header black-bar">
                <div className="jm-shelf-title">
                  <Sprout size={18} color="#f5cd47" />
                  <h2>UPS Certified Farm Seeds | Hybrid Maize &amp; Soya Beans</h2>
                </div>
                <button className="jm-see-all" onClick={() => jumpToCatalog('Agricultural Seeds', '', 'grid')}>
                  SEE ALL <ChevronRight size={15} />
                </button>
              </div>
              <div className="jm-shelf-scroller">
                {seedItems.map((p) => renderShelfCard(p, false))}
              </div>
            </div>
          </section>
        )}

        {/* 7. FULL MARKETPLACE CATALOG & OFFICIAL PRICE CHARTLIST */}
        <section id="catalog" className="jm-container jm-section-gap">
          <div className="jm-shelf-box">
            <div className="jm-shelf-header blue-bar">
              <div className="jm-shelf-title">
                <ShoppingBag size={18} />
                <h2>
                  {category === 'All' ? 'All Official Uganda Prisons Products' : category}
                  {' '}({filteredProducts.length} items)
                </h2>
              </div>
              <div className="jm-view-pills">
                <button
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid size={14} /> Grid
                </button>
                <button
                  className={viewMode === 'chartlist' ? 'active' : ''}
                  onClick={() => setViewMode('chartlist')}
                >
                  <Table2 size={14} /> Price Chartlist
                </button>
              </div>
            </div>

            {/* Category & Sort Filter Bar */}
            <div className="jm-catalog-controls">
              <div className="jm-filter-pills">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`jm-pill ${category === cat ? 'active' : ''}`}
                    onClick={() => {
                      setCategory(cat);
                      setSearch('');
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="jm-sort-wrap">
                <label htmlFor="jm-sort-select">Sort by:</label>
                <select
                  id="jm-sort-select"
                  className="select jm-sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="featured">Popularity (Featured)</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A to Z</option>
                </select>
              </div>
            </div>

            {/* Market Products Body */}
            <div className="jm-catalog-body">
              {loading ? (
                <div className="jm-loading-pad">Loading Uganda Prisons Service catalog...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="jm-loading-pad">
                  No products matched your filter.{' '}
                  <button className="btn btn-primary btn-sm" onClick={() => { setCategory('All'); setSearch(''); }}>
                    Reset Filters
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                /* 4-Col Desktop / 2-Col Android Jumia Product Grid */
                <div className="jm-product-grid">
                  {filteredProducts.map((p) => {
                    const isWished = wishlist.includes(p.id);
                    return (
                      <article className="jm-grid-card" key={p.id}>
                        <div className="jm-card-media" onClick={() => openProductDetail(p)}>
                          <img src={p.image_url} alt={p.name} loading="lazy" />
                          <span className="jm-cat-chip">{p.category}</span>
                          <button
                            className={`jm-wish-btn ${isWished ? 'active' : ''}`}
                            aria-label="Toggle wishlist"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWishlist(p);
                            }}
                          >
                            <Heart size={14} fill={isWished ? '#9e1b4d' : 'none'} />
                          </button>
                        </div>
                        <div className="jm-card-body">
                          <div className="jm-sku-line">{p.sku} • Stock: {p.stock_qty}</div>
                          <h3 className="jm-card-title" onClick={() => openProductDetail(p)}>
                            {p.name}
                          </h3>
                          <div className="jm-card-price">{formatUgx(p.price_ugx)}</div>
                          <div className="jm-card-unit">
                            /{p.unit_label} • Bulk {p.bulk_min_qty}+ Free Delivery
                          </div>
                          <div className="jm-card-actions">
                            <button className="jm-btn-outline-sm" onClick={() => addToCart(p, 1)}>
                              + Cart
                            </button>
                            <button className="jm-btn-buy-sm" onClick={() => startDirectPurchase(p, 1)}>
                              Buy Now
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                /* OFFICIAL PRICE CHARTLIST: Desktop Table + Android 2-Column Grid */
                <>
                  <div className="table-wrap desktop-chartlist-table">
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
                                <div style={{ fontSize: '0.73rem', color: 'var(--ink-muted)', fontWeight: 700 }}>{p.sku}</div>
                                <strong style={{ color: 'var(--ups-black)', cursor: 'pointer' }} onClick={() => openProductDetail(p)}>
                                  {p.name}
                                </strong>
                              </td>
                              <td><span className="status-badge badge-green">{p.category}</span></td>
                              <td>{p.unit_label}</td>
                              <td><strong style={{ color: 'var(--ups-maroon)' }}>{formatUgx(p.price_ugx)}</strong></td>
                              <td>{p.bulk_min_qty}+ units</td>
                              <td><span className="status-badge badge-blue">{p.stock_qty} left</span></td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="btn btn-outline btn-sm" onClick={() => openProductDetail(p)}>View</button>
                                  <button className="btn btn-outline btn-sm" onClick={() => toggleWishlist(p)}>
                                    <Heart size={13} fill={isWished ? '#9e1b4d' : 'none'} color={isWished ? '#9e1b4d' : 'currentColor'} />
                                  </button>
                                  <button className="btn btn-primary btn-sm" onClick={() => startDirectPurchase(p, 1)}>Buy</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Android 2-Column Price Chartlist Grid View */}
                  <div className="mobile-chartlist-grid">
                    {filteredProducts.map((p) => {
                      const isWished = wishlist.includes(p.id);
                      return (
                        <article className="chartlist-tile" key={p.id}>
                          <div className="chartlist-tile-media" onClick={() => openProductDetail(p)}>
                            <img src={p.image_url} alt={p.name} loading="lazy" />
                            <span className="chartlist-sku-pill">{p.sku}</span>
                            <button
                              className={`jm-wish-btn ${isWished ? 'active' : ''}`}
                              aria-label="Toggle wishlist"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWishlist(p);
                              }}
                            >
                              <Heart size={13} fill={isWished ? '#9e1b4d' : 'none'} />
                            </button>
                          </div>
                          <div className="chartlist-price-strip">
                            <strong>{formatUgx(p.price_ugx)}</strong>
                            <span>/{p.unit_label}</span>
                          </div>
                          <div className="chartlist-tile-body">
                            <div className="chartlist-cat">{p.category}</div>
                            <h3 className="chartlist-tile-name" onClick={() => openProductDetail(p)}>
                              {p.name}
                            </h3>
                            <div className="chartlist-tile-meta">
                              <span>Stock: {p.stock_qty}</span>
                              <span>Bulk: {p.bulk_min_qty}+</span>
                            </div>
                            <div className="chartlist-tile-actions">
                              <button className="btn btn-outline btn-sm" onClick={() => openProductDetail(p)}>View</button>
                              <button className="btn btn-primary btn-sm" onClick={() => startDirectPurchase(p, 1)}>Buy</button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 8. JUMIA RECENTLY VIEWED SHELF (Appears automatically once user views any item!) */}
        {recentlyViewed.length > 0 && (
          <section className="jm-container jm-section-gap">
            <div className="jm-shelf-box">
              <div className="jm-shelf-header gray-bar">
                <div className="jm-shelf-title">
                  <Sparkles size={17} color="#9e1b4d" />
                  <h2>Recently Viewed Products</h2>
                </div>
              </div>
              <div className="jm-shelf-scroller">
                {recentlyViewed.map((p) => renderShelfCard(p, false))}
              </div>
            </div>
          </section>
        )}

        {/* 9. TRACK ORDER & SUBMIT PROOF OF PAYMENT CARD */}
        <section id="track-order" className="jm-container jm-section-gap">
          <div className="tracker-card">
            <div className="tracker-grid">
              <div>
                <span className="advert-badge" style={{ marginBottom: 10 }}>
                  <ShieldCheck size={14} /> Automated Purchase Reference
                </span>
                <h2 className="tracker-title">
                  Track Your Order or Upload Proof of Payment
                </h2>
                <p style={{ color: '#e2e8f0', fontSize: '0.88rem' }}>
                  Enter your automated Purchase Reference (e.g. <strong>UPS-20261122-4821</strong>) to check verification status, delivery/pickup updates, or upload your MTN MoMo / Airtel Money / UPS Bank receipt.
                </p>
              </div>
              <form onSubmit={handleTrackOrder} className="tracker-form">
                <input
                  className="input"
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
              <div className="alert alert-error" style={{ marginTop: 14, marginBottom: 0 }}>
                {trackError}
              </div>
            )}

            {trackedOrder && (
              <div className="panel-card" style={{ marginTop: 18, marginBottom: 0, color: 'var(--ink)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--ink-muted)', fontWeight: 700 }}>PURCHASE REFERENCE</div>
                    <strong style={{ fontSize: '1.15rem', color: 'var(--ups-black)' }}>{trackedOrder.reference_code}</strong>
                    <span style={{ marginLeft: 8, fontSize: '0.86rem', color: 'var(--ink-muted)' }}>
                      • {trackedOrder.customer_name} ({trackedOrder.customer_phone})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className={`status-badge ${paymentStatusMeta(trackedOrder.payment_status).cls}`}>
                      {paymentStatusMeta(trackedOrder.payment_status).label}
                    </span>
                    <span className={`status-badge ${orderStatusMeta(trackedOrder.order_status).cls}`}>
                      {orderStatusMeta(trackedOrder.order_status).label}
                    </span>
                  </div>
                </div>

                <div className="form-grid" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
                  <div><strong>Total:</strong> {formatUgx(trackedOrder.total_ugx)} ({trackedOrder.payment_method})</div>
                  <div>
                    <strong>Fulfillment:</strong>{' '}
                    {trackedOrder.delivery_type === 'bulk_free_delivery'
                      ? `FREE Bulk Delivery to ${trackedOrder.delivery_address} (${trackedOrder.district})`
                      : `Pickup at ${trackedOrder.prison_unit}`}
                  </div>
                  <div><strong>Ordered On:</strong> {formatDateTime(trackedOrder.created_at)}</div>
                  {trackedOrder.payment_tx_ref && (
                    <div><strong>Transaction ID:</strong> {trackedOrder.payment_tx_ref}</div>
                  )}
                </div>

                {trackedOrder.admin_notes && (
                  <div className="alert alert-info" style={{ fontSize: '0.83rem' }}>
                    <strong>Sales Admin Note:</strong> {trackedOrder.admin_notes}
                  </div>
                )}

                {trackedOrder.payment_status !== 'verified' &&
                  trackedOrder.payment_method !== 'Cash / Pay on Delivery' && (
                    <form onSubmit={handleTrackedProofUpload} style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 10 }}>
                      <h4 style={{ color: 'var(--ups-black)', marginBottom: 8 }}>Upload / Update Proof of Payment</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Transaction ID / Bank Slip Ref *</label>
                          <input
                            className="input"
                            required
                            value={proofTxRef}
                            onChange={(e) => setProofTxRef(e.target.value)}
                            placeholder="MTN MoMo / Airtel / Bank Ref"
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
                      <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} disabled={uploadingTrackProof}>
                        <Upload size={14} /> {uploadingTrackProof ? 'Uploading...' : 'Submit Proof of Payment'}
                      </button>
                    </form>
                  )}
              </div>
            )}
          </div>
        </section>

        {/* 10. INSIDE UGANDA PRISONS SERVICE INDUSTRIES & EXHIBITIONS GALLERY */}
        <section id="showcase" className="jm-container jm-section-gap">
          <div className="jm-shelf-box">
            <div className="jm-shelf-header black-bar">
              <div className="jm-shelf-title">
                <ShieldCheck size={18} color="#f5cd47" />
                <h2>Inside Uganda Prisons Service Workshops &amp; Exhibitions</h2>
              </div>
              <span className="jm-header-hint">Tap any photo to zoom</span>
            </div>
            <div className="jm-catalog-body">
              <div className="showcase-grid">
                {UPS_SHOWCASE_GALLERY.map((photo, idx) => (
                  <figure className="showcase-card" key={idx} onClick={() => setSelectedPhoto(photo)}>
                    <div className="showcase-img-wrap">
                      <img src={photo.src} alt={photo.title} loading="lazy" />
                      <span className="showcase-tag">{photo.tag}</span>
                    </div>
                    <figcaption className="showcase-caption">{photo.title}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 11. OFFICIAL NEWS & BULLETINS */}
        <section id="news" className="jm-container jm-section-gap">
          <div className="jm-shelf-box">
            <div className="jm-shelf-header blue-bar">
              <div className="jm-shelf-title">
                <Newspaper size={18} />
                <h2>Uganda Prisons Industries &amp; Farms News</h2>
              </div>
            </div>
            <div className="jm-catalog-body">
              <div className="news-grid">
                {news.map((article) => (
                  <article className="news-card" key={article.id}>
                    {article.image_url && <img src={article.image_url} alt={article.title} loading="lazy" />}
                    <div className="news-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--ink-muted)' }}>
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
          </div>
        </section>

        {/* 12. JUMIA-STYLE INSTITUTIONAL ABOUT US WHITE CARD */}
        <section id="about" className="jm-container jm-section-gap">
          <div className="jm-white-card jm-about-box">
            <div className="about-grid">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div className="brand-emblem" style={{ width: 58, height: 58, padding: 4 }}>
                    <img src="/images/prisonslogo-1.png" alt="Uganda Prisons Service Official Crest" className="brand-logo-img" />
                  </div>
                  <div>
                    <div className="section-kicker" style={{ marginBottom: 2 }}>Official Uganda Prisons Service Marketplace</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ups-blue)' }}>
                      For God and My Country • Directorate of Production &amp; Industries
                    </div>
                  </div>
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--ups-black)', marginBottom: 10 }}>
                  Shop Authentic Uganda Prisons Service Furniture, Genuine Leather Footwear &amp; Certified Farm Seeds Online
                </h2>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', marginBottom: 10 }}>
                  Welcome to the official <strong>Uganda Prisons Service (UPS) Online Shopping Portal</strong>. Every solid Ugandan Mahogany bed, Mvule dining set, executive office desk, pair of genuine cowhide leather shoes or steppers, and bag of certified Improved Hybrid Maize or Maksoy Soya Bean seeds is crafted and multiplied under rigorous institutional quality standards.
                </p>
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem', marginBottom: 14 }}>
                  Order from anywhere in Uganda: <strong>Bulk orders qualify for FREE nationwide delivery</strong> by UPS Sales Agents, while smaller orders can be collected conveniently from <strong>26 Uganda Prisons Service units</strong> across Central, Eastern, Northern, and Western Uganda. Pay securely via <strong>MTN Mobile Money (MoMo), Airtel Money, Official UPS Bank Account, or Cash / Pay on Delivery</strong> with automatic Yoola SMS confirmation.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setUnitsModalOpen(true)}>
                    <Building2 size={14} /> View All 26 Prison Pickup Units
                  </button>
                  <a href="#catalog" className="btn btn-outline btn-sm">
                    Browse Full Price Chartlist
                  </a>
                </div>
              </div>
              <div>
                <div className="about-collage">
                  <img src="/images/ups/ups-17.jpg" alt="UPS Carpentry Workshop" loading="lazy" />
                  <img src="/images/ups/ups-21.jpg" alt="UPS Certified Seed Stock" loading="lazy" />
                  <img src="/images/ups/ups-24.jpg" alt="UPS Handcrafted Leather Shoes" loading="lazy" />
                  <img src="/images/ups/ups-01.jpg" alt="UPS National Exhibition Pavilion" loading="lazy" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* JUMIA-STYLE DARK MULTI-COLUMN FOOTER */}
      <footer className="site-footer jm-footer">
        <div className="jm-footer-top-strip">
          <div className="jm-container jm-footer-top-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="brand-emblem" style={{ width: 48, height: 48 }}>
                <img src="/images/prisonslogo-1.png" alt="Uganda Prisons Service Logo" className="brand-logo-img" />
              </div>
              <div>
                <strong style={{ color: '#fff', fontSize: '1.05rem', display: 'block' }}>UPS MARKET</strong>
                <span style={{ color: 'var(--ups-gold-bright)', fontSize: '0.75rem', fontWeight: 700 }}>
                  UGANDA PRISONS SERVICE OFFICIAL STORE
                </span>
              </div>
            </div>
            <div style={{ fontSize: '0.84rem', color: '#e5e7eb' }}>
              <strong>NEED HELP ORDERING IN BULK?</strong> Contact UPS Sales Desk on WhatsApp or Phone for instant quotations and nationwide delivery scheduling.
            </div>
            <a href="https://wa.me/256394915409" target="_blank" rel="noreferrer" className="btn btn-gold btn-sm">
              <MessageCircle size={15} /> WhatsApp Sales Desk
            </a>
          </div>
        </div>

        <div className="jm-container footer-grid" style={{ paddingTop: 32 }}>
          <div>
            <div className="footer-heading">NEED HELP?</div>
            <ul className="footer-links">
              <li><a href="#track-order">Track Your Order &amp; Proof</a></li>
              <li><button onClick={() => setUnitsModalOpen(true)}>26 Uganda Prisons Pickup Units</button></li>
              <li><a href="tel:+256394915409">Call to Order: +256 394 915 409</a></li>
              <li><a href="https://wa.me/256394915409" target="_blank" rel="noreferrer">WhatsApp Support Desk</a></li>
            </ul>
          </div>
          <div>
            <div className="footer-heading">SHOP CATEGORIES</div>
            <ul className="footer-links">
              <li><button onClick={() => jumpToCatalog('Furniture', '', 'grid')}>Furniture (Beds, Tables, Chairs)</button></li>
              <li><button onClick={() => jumpToCatalog('Leather Footwear', '', 'grid')}>Leather Shoes &amp; Steppers</button></li>
              <li><button onClick={() => jumpToCatalog('Agricultural Seeds', '', 'grid')}>Hybrid Maize &amp; Soya Seeds</button></li>
              <li><button onClick={() => jumpToCatalog('All', '', 'chartlist')}>Official Price Chartlist</button></li>
            </ul>
          </div>
          <div>
            <div className="footer-heading">OFFICIAL PAYMENT METHODS</div>
            <ul className="footer-links" style={{ fontSize: '0.84rem' }}>
              <li><Smartphone size={13} style={{ display: 'inline', marginRight: 5 }} /> MTN Mobile Money (MoMo)</li>
              <li><Smartphone size={13} style={{ display: 'inline', marginRight: 5 }} /> Airtel Money</li>
              <li>Uganda Prisons Service Bank Account</li>
              <li>Cash / Pay on Delivery</li>
              <li>Live Yoola SMS Confirmation</li>
            </ul>
          </div>
          <div>
            <div className="footer-heading">HEADQUARTERS &amp; SHOWROOM</div>
            <ul className="footer-links" style={{ fontSize: '0.84rem' }}>
              <li style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <MapPin size={14} color="#f5cd47" /> Plot 13/15 Parliament Ave &amp; Luzira Industries, Kampala
              </li>
              <li style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <Phone size={14} color="#f5cd47" /> {storeInfo?.support?.phone || '+256 394 915 409'}
              </li>
              <li style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <Mail size={14} color="#f5cd47" /> {storeInfo?.support?.email || 'sales@prisons.go.ug'}
              </li>
            </ul>
          </div>
        </div>

        {/* Exact Required Developer Attribution Bar */}
        <div className="developer-bar">
          <div className="jm-container">
            <div>© {new Date().getFullYear()} Uganda Prisons Service Products Store. All Rights Reserved.</div>
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

      {/* JUMIA-STYLE FIXED MOBILE BOTTOM NAVIGATION BAR (Android Phones Only) */}
      <nav className="jm-mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
        <button
          onClick={() => {
            setCategory('All');
            setSearch('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <Home size={19} />
          <span>Home</span>
        </button>
        <button onClick={() => setMobileMenuOpen(true)}>
          <LayoutGrid size={19} />
          <span>Categories</span>
        </button>
        <button onClick={() => setCartOpen(true)}>
          <span className="jm-bnav-ico">
            <ShoppingCart size={19} />
            {cartCount > 0 && <span className="jm-dot-badge">{cartCount}</span>}
          </span>
          <span>Cart</span>
        </button>
        <button onClick={() => setWishlistOpen(true)}>
          <span className="jm-bnav-ico">
            <Heart size={19} />
            {wishlist.length > 0 && <span className="jm-dot-badge">{wishlist.length}</span>}
          </span>
          <span>Saved</span>
        </button>
        <button
          onClick={() => (customer ? setAccountModalTab('orders') : setAuthModalMode('login'))}
        >
          <User size={19} />
          <span>{customer ? customer.full_name.split(' ')[0] : 'Account'}</span>
        </button>
      </nav>

      {/* ==================== MOBILE CATEGORIES DRAWER (Jumia Hamburger Menu) ==================== */}
      {mobileMenuOpen && (
        <div className="drawer-backdrop jm-left-drawer" onClick={closeAllOverlays}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head" style={{ background: 'var(--ups-black)', color: '#fff', borderBottom: '2px solid var(--ups-gold)' }}>
              <div className="modal-head-left">
                <button className="btn-back" onClick={closeAllOverlays}>
                  <ArrowLeft size={15} /> Back
                </button>
                <h3 style={{ color: '#fff', fontSize: '1rem' }}>UPS Menu</h3>
              </div>
              <button className="icon-btn" aria-label="Close menu" onClick={closeAllOverlays}>
                <X size={17} />
              </button>
            </div>
            <div className="drawer-body" style={{ padding: 12 }}>
              {/* Jumia Mobile Drawer Account Card */}
              <div className="jm-drawer-account-box">
                {customer ? (
                  <>
                    <div style={{ fontWeight: 800, color: 'var(--ups-black)', fontSize: '0.9rem' }}>
                      Hi, {customer.full_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ups-gray)', marginBottom: 8 }}>
                      +{customer.phone} • {customer.default_district}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => { setMobileMenuOpen(false); setAccountModalTab('orders'); }}
                      >
                        My Orders
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => { setMobileMenuOpen(false); setAccountModalTab('address'); }}
                      >
                        Address Book
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { setMobileMenuOpen(false); setAuthModalMode('login'); }}
                    >
                      Sign In
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => { setMobileMenuOpen(false); setAuthModalMode('register'); }}
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>

              <div className="jm-drawer-section-label">OUR CATEGORIES</div>
              {JUMIA_SIDEBAR_MENU.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    className="jm-drawer-cat-btn"
                    onClick={() => jumpToCatalog(item.category, item.search, 'grid')}
                  >
                    <Icon size={17} color="#9e1b4d" />
                    <span>{item.label}</span>
                    <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                  </button>
                );
              })}

              <div className="jm-drawer-section-label" style={{ marginTop: 16 }}>MARKET TOOLS &amp; HELP</div>
              <button className="jm-drawer-cat-btn" onClick={() => jumpToCatalog('All', '', 'chartlist')}>
                <Table2 size={17} color="#164785" />
                <span>Official Price Chartlist</span>
                <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </button>
              <button
                className="jm-drawer-cat-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setUnitsModalOpen(true);
                }}
              >
                <Building2 size={17} color="#164785" />
                <span>26 Uganda Prisons Pickup Units</span>
                <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </button>
              <a className="jm-drawer-cat-btn" href="#track-order" onClick={closeAllOverlays}>
                <Upload size={17} color="#9e1b4d" />
                <span>Track Order &amp; Upload Payment Proof</span>
              </a>
              <a className="jm-drawer-cat-btn" href="#showcase" onClick={closeAllOverlays}>
                <ShieldCheck size={17} color="#164785" />
                <span>UPS Workshops &amp; Exhibitions Photos</span>
              </a>
              <a className="jm-drawer-cat-btn" href="#news" onClick={closeAllOverlays}>
                <Newspaper size={17} color="#9e1b4d" />
                <span>News &amp; Announcements</span>
              </a>
              <a className="jm-drawer-cat-btn" href="#about" onClick={closeAllOverlays}>
                <HelpCircle size={17} color="#164785" />
                <span>About Uganda Prisons Service Store</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 26 PRISON PICKUP UNITS DIRECTORY MODAL ==================== */}
      {unitsModalOpen && (
        <div className="modal-backdrop" onClick={closeAllOverlays}>
          <div className="modal-box wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-head-left">
                <button className="btn-back" onClick={closeAllOverlays}>
                  <ArrowLeft size={16} /> Back
                </button>
                <h3>Nationwide Uganda Prisons Service Pickup Units</h3>
              </div>
              <button className="icon-btn" aria-label="Close units modal" onClick={closeAllOverlays}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                <strong>Delivery Policy:</strong> Bulk orders qualify for <strong>FREE Nationwide Delivery</strong> by UPS Sales Agents. Small purchases can be collected from any of these <strong>{(storeInfo?.prisonUnits || []).length} Uganda Prisons Service units</strong> across Uganda!
              </div>
              <div className="form-grid">
                {(storeInfo?.prisonUnits || []).map((u) => (
                  <div className="about-mini-card" key={u.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span className="status-badge badge-blue">{u.region} Region</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ups-maroon)' }}>{u.district}</span>
                    </div>
                    <h4>{u.name}</h4>
                    <p>Desk Contact: {u.contact}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== JUMIA-STYLE PRODUCT DETAIL MODAL ==================== */}
      {selectedProduct && (
        <div className="modal-backdrop" onClick={closeAllOverlays}>
          <div className="modal-box wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-head-left">
                <button className="btn-back" onClick={closeAllOverlays} aria-label="Back to products">
                  <ArrowLeft size={16} /> Back
                </button>
                <h3>{selectedProduct.name}</h3>
              </div>
              <button className="icon-btn" aria-label="Close product modal" onClick={closeAllOverlays}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="jm-pdp-grid">
                <div>
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }}
                  />
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="status-badge badge-green">UPS Official Store</span>
                    <span className="status-badge badge-blue">{selectedProduct.category}</span>
                    <span className="status-badge badge-gray">SKU: {selectedProduct.sku}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ups-black)', marginBottom: 2 }}>
                    {formatUgx(selectedProduct.price_ugx)}
                    <span style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                      {' '}/ {selectedProduct.unit_label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--ups-maroon)', fontWeight: 700, marginBottom: 12 }}>
                    In Stock ({selectedProduct.stock_qty} available) • Official Institutional Price
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: 12 }}>
                    {selectedProduct.description}
                  </p>
                  {selectedProduct.specifications && (
                    <div className="panel-card" style={{ padding: 12, background: '#f8fafc', fontSize: '0.82rem', marginBottom: 12 }}>
                      <strong>Specifications:</strong>
                      <div style={{ marginTop: 4 }}>{selectedProduct.specifications}</div>
                    </div>
                  )}

                  {/* Jumia-style Delivery & Payment Info Box */}
                  <div className="jm-pdp-delivery-box">
                    <div className="jm-pdp-del-row">
                      <Truck size={17} color="#9e1b4d" />
                      <div>
                        <strong>Free Bulk Delivery ({selectedProduct.bulk_min_qty}+ units)</strong>
                        <span>Delivered nationwide free by Uganda Prisons Sales Agents.</span>
                      </div>
                    </div>
                    <div className="jm-pdp-del-row">
                      <Building2 size={17} color="#164785" />
                      <div>
                        <strong>Nearby Prison Unit Pickup</strong>
                        <span>Small purchases collected from 26 Uganda Prisons units nationwide.</span>
                      </div>
                    </div>
                    <div className="jm-pdp-del-row">
                      <Smartphone size={17} color="#9e7808" />
                      <div>
                        <strong>Verified Payment Channels</strong>
                        <span>MTN MoMo • Airtel Money • UPS Bank Account • Cash / Pay on Delivery.</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
                    <label className="form-label">Quantity:</label>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                      >-</button>
                      <strong style={{ minWidth: 28, textAlign: 'center' }}>{detailQty}</strong>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setDetailQty((q) => Math.min(Math.max(1, selectedProduct.stock_qty), q + 1))}
                      >+</button>
                    </div>
                    <strong style={{ color: 'var(--ups-maroon)' }}>
                      {formatUgx(selectedProduct.price_ugx * detailQty)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => startDirectPurchase(selectedProduct, detailQty)}
                    >
                      <ShoppingBag size={16} /> BUY NOW — {formatUgx(selectedProduct.price_ugx * detailQty)}
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        className="btn btn-gold"
                        onClick={() => {
                          addToCart(selectedProduct, detailQty);
                          closeAllOverlays();
                        }}
                      >
                        <ShoppingCart size={15} /> ADD TO CART
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => toggleWishlist(selectedProduct)}
                      >
                        <Heart
                          size={15}
                          fill={wishlist.includes(selectedProduct.id) ? '#9e1b4d' : 'none'}
                          color={wishlist.includes(selectedProduct.id) ? '#9e1b4d' : 'currentColor'}
                        />
                        {wishlist.includes(selectedProduct.id) ? 'Saved' : 'Save Item'}
                      </button>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={closeAllOverlays}>
                      <ArrowLeft size={14} /> Back to Previous Page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CART DRAWER ==================== */}
      {cartOpen && (
        <div className="drawer-backdrop" onClick={closeAllOverlays}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-head-left">
                <button className="btn-back" onClick={closeAllOverlays}>
                  <ArrowLeft size={16} /> Back
                </button>
                <h3>Cart ({cartCount})</h3>
              </div>
              <button className="icon-btn" aria-label="Close cart" onClick={closeAllOverlays}>
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body">
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-muted)' }}>
                  <ShoppingCart size={38} style={{ margin: '0 auto 10px', opacity: 0.45 }} />
                  <p style={{ marginBottom: 14 }}>Your cart is empty!</p>
                  <button className="btn btn-primary btn-sm" onClick={closeAllOverlays}>
                    START SHOPPING
                  </button>
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
                      <strong style={{ fontSize: '0.88rem', color: 'var(--ups-black)' }}>{item.name}</strong>
                      <div style={{ fontSize: '0.84rem', color: 'var(--ups-maroon)', fontWeight: 800 }}>
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
                  <strong style={{ color: 'var(--ups-maroon)' }}>{formatUgx(cartTotal)}</strong>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutItems(cart);
                  }}
                >
                  CHECKOUT ({formatUgx(cartTotal)})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== WISHLIST DRAWER ==================== */}
      {wishlistOpen && (
        <div className="drawer-backdrop" onClick={closeAllOverlays}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-head-left">
                <button className="btn-back" onClick={closeAllOverlays}>
                  <ArrowLeft size={16} /> Back
                </button>
                <h3>Saved Items ({wishlistProducts.length})</h3>
              </div>
              <button className="icon-btn" aria-label="Close wishlist" onClick={closeAllOverlays}>
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body">
              {wishlistProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-muted)' }}>
                  <Heart size={38} style={{ margin: '0 auto 10px', opacity: 0.45 }} />
                  <p>No saved items yet. Tap the heart icon on any product to save it here.</p>
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
                      <strong style={{ fontSize: '0.88rem', color: 'var(--ups-black)' }}>{p.name}</strong>
                      <div style={{ fontSize: '0.84rem', color: 'var(--ups-maroon)', fontWeight: 800, marginBottom: 6 }}>
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
                          Buy Now
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => addToCart(p, 1)}>
                          + Cart
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => toggleWishlist(p)}>
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

      {/* ==================== CUSTOMER AUTH MODAL (Jumia Sign In / Register) ==================== */}
      {authModalMode && (
        <CustomerAuthModal
          initialMode={authModalMode}
          storeInfo={storeInfo}
          onClose={closeAllOverlays}
          onAuthSuccess={(c) => setCustomer(c)}
          onToast={onToast}
        />
      )}

      {/* ==================== CUSTOMER MY ACCOUNT HUB (Orders & Address Book) ==================== */}
      {accountModalTab && customer && (
        <CustomerAccountModal
          customer={customer}
          initialTab={accountModalTab}
          storeInfo={storeInfo}
          onClose={closeAllOverlays}
          onCustomerUpdated={(c) => setCustomer(c)}
          onLogout={handleCustomerLogout}
          onToast={onToast}
        />
      )}

      {/* ==================== CHECKOUT MODAL (Jumia 3-Step Ordering) ==================== */}
      {checkoutItems && (
        <CheckoutModal
          items={checkoutItems}
          storeInfo={storeInfo}
          customer={customer}
          onOpenAuth={() => {
            setCheckoutItems(null);
            setAuthModalMode('login');
          }}
          onCustomerCreated={(c) => setCustomer(c)}
          onClose={closeAllOverlays}
          onOrderSuccess={() => {
            if (checkoutItems === cart) setCart([]);
          }}
          onToast={onToast}
        />
      )}

      {/* ==================== PHOTO SHOWCASE LIGHTBOX ==================== */}
      {selectedPhoto && (
        <div className="modal-backdrop" onClick={closeAllOverlays}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-head-left">
                <button className="btn-back" onClick={closeAllOverlays}>
                  <ArrowLeft size={16} /> Back
                </button>
                <h3>{selectedPhoto.tag}</h3>
              </div>
              <button className="icon-btn" aria-label="Close photo preview" onClick={closeAllOverlays}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <img
                src={selectedPhoto.src}
                alt={selectedPhoto.title}
                style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 12, background: '#141619', marginBottom: 12 }}
              />
              <p style={{ fontWeight: 700, color: 'var(--ups-black)' }}>{selectedPhoto.title}</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--ups-maroon)', fontWeight: 700, marginTop: 4 }}>
                Uganda Prisons Service — Official Production &amp; Industries
              </p>
              <button className="btn btn-outline btn-sm" style={{ marginTop: 14 }} onClick={closeAllOverlays}>
                <ArrowLeft size={14} /> Back to Previous Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== NEWS ARTICLE MODAL ==================== */}
      {selectedArticle && (
        <div className="modal-backdrop" onClick={closeAllOverlays}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-head-left">
                <button className="btn-back" onClick={closeAllOverlays}>
                  <ArrowLeft size={16} /> Back
                </button>
                <h3>{selectedArticle.title}</h3>
              </div>
              <button className="icon-btn" aria-label="Close article" onClick={closeAllOverlays}>
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
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, fontSize: '0.82rem', color: 'var(--ink-muted)', flexWrap: 'wrap' }}>
                <span className="status-badge badge-green">{selectedArticle.category}</span>
                <span>By {selectedArticle.author}</span>
                <span>• {formatDate(selectedArticle.created_at)}</span>
              </div>
              <p style={{ fontWeight: 700, marginBottom: 12, color: 'var(--ups-black)' }}>
                {selectedArticle.summary}
              </p>
              <div style={{ whiteSpace: 'pre-line', color: 'var(--ink)', lineHeight: 1.7 }}>
                {selectedArticle.content}
              </div>
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-outline" onClick={closeAllOverlays}>
                  <ArrowLeft size={15} /> Back to Previous Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
