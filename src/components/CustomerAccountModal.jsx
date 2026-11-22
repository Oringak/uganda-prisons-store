import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  LogOut,
  MapPin,
  Package,
  RefreshCw,
  Upload,
  User,
  X,
} from 'lucide-react';
import {
  customerFetch,
  formatDateTime,
  formatUgx,
  orderStatusMeta,
  paymentStatusMeta,
} from '../utils/api';

const UGANDA_DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Gulu', 'Lira', 'Mbarara',
  'Masaka', 'Arua', 'Fort Portal / Kabarole', 'Soroti', 'Tororo', 'Hoima',
  'Masindi', 'Kabale', 'Kasese', 'Iganga', 'Luwero', 'Mubende', 'Moroto',
  'Kitgum', 'Apac', 'Kapchorwa', 'Entebbe', 'Bushenyi', 'Ntungamo', 'Other District',
];

export default function CustomerAccountModal({
  customer,
  initialTab = 'orders',
  storeInfo,
  onClose,
  onCustomerUpdated,
  onLogout,
  onToast,
}) {
  const [tab, setTab] = useState(initialTab); // 'orders' | 'address'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Proof upload inline per order
  const [activeProofRef, setActiveProofRef] = useState('');
  const [txRef, setTxRef] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Address Book form
  const [form, setForm] = useState({
    full_name: customer?.full_name || '',
    email: customer?.email || '',
    default_district: customer?.default_district || 'Kampala',
    default_address: customer?.default_address || '',
    default_prison_unit: customer?.default_prison_unit || '',
  });
  const [saving, setSaving] = useState(false);

  async function loadMyOrders() {
    setLoadingOrders(true);
    try {
      const data = await customerFetch('/api/customer/orders');
      setOrders(data.orders || []);
    } catch (err) {
      onToast(err.message);
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    loadMyOrders();
  }, []);

  async function handleSaveAddress(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await customerFetch('/api/customer/profile', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      onCustomerUpdated(data.customer);
      onToast('Address Book saved!');
    } catch (err) {
      onToast(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleInlineProof(e, order) {
    e.preventDefault();
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('payment_tx_ref', txRef);
      fd.append('customer_name', order.customer_name);
      if (proofFile) fd.append('proof', proofFile);

      const res = await fetch(`/api/orders/${encodeURIComponent(order.reference_code)}/proof`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onToast('Proof of payment sent for Sales Admin verification!');
      setActiveProofRef('');
      setTxRef('');
      setProofFile(null);
      loadMyOrders();
    } catch (err) {
      onToast(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-left">
            <button type="button" className="btn-back" onClick={onClose}>
              <ArrowLeft size={16} /> Back
            </button>
            <h3>My UPS Account — {customer.full_name}</h3>
          </div>
          <button className="icon-btn" aria-label="Close account modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="jm-account-layout">
            {/* Jumia-Style Left Account Menu */}
            <aside className="jm-account-nav">
              <div className="jm-account-user-box">
                <User size={20} color="#9e1b4d" />
                <div>
                  <strong>{customer.full_name}</strong>
                  <span>+{customer.phone}</span>
                </div>
              </div>
              <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
                <Package size={16} /> My Orders ({orders.length})
              </button>
              <button className={tab === 'address' ? 'active' : ''} onClick={() => setTab('address')}>
                <MapPin size={16} /> Address Book &amp; Pickup Unit
              </button>
              <button className="logout-btn" onClick={() => { onLogout(); onClose(); }}>
                <LogOut size={16} /> Sign Out
              </button>
            </aside>

            {/* Right Content Pane */}
            <div style={{ minWidth: 0 }}>
              {tab === 'orders' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ color: 'var(--ups-black)' }}>My Purchase Orders</h4>
                    <button className="btn btn-outline btn-sm" onClick={loadMyOrders}>
                      <RefreshCw size={13} /> Refresh
                    </button>
                  </div>
                  {loadingOrders ? (
                    <div className="jm-loading-pad">Loading your orders...</div>
                  ) : orders.length === 0 ? (
                    <div className="panel-card" style={{ textAlign: 'center', padding: 28 }}>
                      <p style={{ color: 'var(--ups-gray)', marginBottom: 10 }}>
                        You haven&apos;t placed any orders yet with this account.
                      </p>
                      <button className="btn btn-primary btn-sm" onClick={onClose}>
                        Start Shopping
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {orders.map((o) => (
                        <div className="panel-card" key={o.id} style={{ marginBottom: 0, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <div>
                              <strong style={{ color: 'var(--ups-black)' }}>{o.reference_code}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--ups-gray)' }}>
                                {formatDateTime(o.created_at)} • {o.payment_method}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              <span className={`status-badge ${paymentStatusMeta(o.payment_status).cls}`}>
                                {paymentStatusMeta(o.payment_status).label}
                              </span>
                              <span className={`status-badge ${orderStatusMeta(o.order_status).cls}`}>
                                {orderStatusMeta(o.order_status).label}
                              </span>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.82rem', marginBottom: 8 }}>
                            {(o.items || []).map((it, idx) => (
                              <div key={idx}>• {it.quantity} × {it.name} ({formatUgx(it.line_total_ugx)})</div>
                            ))}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--ups-gray)' }}>
                              {o.delivery_type === 'bulk_free_delivery'
                                ? `Free Bulk Delivery: ${o.delivery_address} (${o.district})`
                                : `Pickup: ${o.prison_unit}`}
                            </div>
                            <strong style={{ color: 'var(--ups-maroon)' }}>{formatUgx(o.total_ugx)}</strong>
                          </div>

                          {o.payment_status !== 'verified' && o.payment_method !== 'Cash / Pay on Delivery' && (
                            <div style={{ marginTop: 10 }}>
                              {activeProofRef === o.reference_code ? (
                                <form onSubmit={(e) => handleInlineProof(e, o)} className="form-grid" style={{ background: '#f8f9fa', padding: 10, borderRadius: 8 }}>
                                  <div className="form-group">
                                    <label className="form-label">MoMo / Airtel / Bank Tx ID *</label>
                                    <input
                                      className="input"
                                      required
                                      value={txRef}
                                      onChange={(e) => setTxRef(e.target.value)}
                                      placeholder="Transaction Ref"
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">Receipt Photo / PDF</label>
                                    <input
                                      className="input"
                                      type="file"
                                      accept="image/*,.pdf"
                                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                    />
                                  </div>
                                  <div className="form-group full" style={{ flexDirection: 'row', gap: 8 }}>
                                    <button className="btn btn-primary btn-sm" type="submit" disabled={uploading}>
                                      <Upload size={13} /> {uploading ? 'Uploading...' : 'Send Proof'}
                                    </button>
                                    <button className="btn btn-outline btn-sm" type="button" onClick={() => setActiveProofRef('')}>
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <button
                                  className="btn btn-gold btn-sm"
                                  onClick={() => {
                                    setActiveProofRef(o.reference_code);
                                    setTxRef(o.payment_tx_ref || '');
                                  }}
                                >
                                  <Upload size={13} /> Upload / Update Proof of Payment
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'address' && (
                <form onSubmit={handleSaveAddress} className="panel-card" style={{ marginBottom: 0 }}>
                  <h4 style={{ color: 'var(--ups-black)', marginBottom: 12 }}>
                    Saved Delivery Address &amp; Preferred Prison Pickup Unit
                  </h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input
                        className="input"
                        required
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        className="input"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Default District</label>
                      <select
                        className="select"
                        value={form.default_district}
                        onChange={(e) => setForm({ ...form, default_district: e.target.value })}
                      >
                        {UGANDA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Preferred Nearby Prison Unit</label>
                      <select
                        className="select"
                        value={form.default_prison_unit}
                        onChange={(e) => setForm({ ...form, default_prison_unit: e.target.value })}
                      >
                        <option value="">— Select Nearby Unit —</option>
                        {(storeInfo?.prisonUnits || []).map((u) => (
                          <option key={u.id} value={`${u.name} (${u.district})`}>
                            {u.name} — {u.district} ({u.region})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group full">
                      <label className="form-label">Default Bulk Delivery Address</label>
                      <input
                        className="input"
                        value={form.default_address}
                        onChange={(e) => setForm({ ...form, default_address: e.target.value })}
                        placeholder="Plot / Street / Town / School / Farm"
                      />
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Address Book'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
