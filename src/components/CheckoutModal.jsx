import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  Landmark,
  LogIn,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { apiFetch, formatUgx, getCustomerToken, setCustomerToken } from '../utils/api';

const PAYMENT_OPTIONS = [
  {
    id: 'MTN Mobile Money (MoMo)',
    label: 'MTN Mobile Money / MoMo',
    desc: 'Pay via MTN MoMo Pay or direct transfer, then submit proof.',
    icon: Smartphone,
  },
  {
    id: 'Airtel Money',
    label: 'Airtel Money',
    desc: 'Pay via Airtel Money Merchant / Number, then upload receipt.',
    icon: Smartphone,
  },
  {
    id: 'Bank Transfer (UPS Account)',
    label: 'Uganda Prisons Service Bank Account',
    desc: 'Deposit or EFT into the official UPS Bank Account.',
    icon: Landmark,
  },
  {
    id: 'Cash / Pay on Delivery',
    label: 'Cash / Pay on Delivery (or at Prison Unit)',
    desc: 'Sales Admin verifies your purchase order before dispatch/pickup.',
    icon: CreditCard,
  },
];

const UGANDA_DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Gulu', 'Lira', 'Mbarara',
  'Masaka', 'Arua', 'Fort Portal / Kabarole', 'Soroti', 'Tororo', 'Hoima',
  'Masindi', 'Kabale', 'Kasese', 'Iganga', 'Luwero', 'Mubende', 'Moroto',
  'Kitgum', 'Apac', 'Kapchorwa', 'Entebbe', 'Bushenyi', 'Ntungamo', 'Other District',
];

export default function CheckoutModal({
  items,
  storeInfo,
  customer,
  onOpenAuth,
  onCustomerCreated,
  onClose,
  onOrderSuccess,
  onToast,
}) {
  const [customerName, setCustomerName] = useState(customer?.full_name || '');
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
  const [district, setDistrict] = useState(customer?.default_district || 'Kampala');
  const [deliveryAddress, setDeliveryAddress] = useState(customer?.default_address || '');
  const [prisonUnit, setPrisonUnit] = useState(
    customer?.default_prison_unit ||
      (storeInfo?.prisonUnits?.[0]
        ? `${storeInfo.prisonUnits[0].name} (${storeInfo.prisonUnits[0].district})`
        : 'Luzira Upper / UPS Industries Showroom (Kampala)')
  );
  const [regionFilter, setRegionFilter] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState('MTN Mobile Money (MoMo)');

  // Optional 1-click account creation during checkout (Jumia style!)
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdOrder, setCreatedOrder] = useState(null);
  const [smsInfo, setSmsInfo] = useState(null);

  // Proof of payment form state after order creation
  const [txRef, setTxRef] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);

  const bulkMinQty = storeInfo?.bulkRules?.minQty || 5;
  const bulkMinUgx = storeInfo?.bulkRules?.minUgx || 1000000;

  const { subtotal, totalQty, isBulk } = useMemo(() => {
    let sub = 0;
    let qty = 0;
    let prodBulk = false;
    for (const item of items) {
      sub += Number(item.price_ugx) * Number(item.quantity);
      qty += Number(item.quantity);
      if (Number(item.quantity) >= Number(item.bulk_min_qty || bulkMinQty)) {
        prodBulk = true;
      }
    }
    return {
      subtotal: sub,
      totalQty: qty,
      isBulk: prodBulk || qty >= bulkMinQty || sub >= bulkMinUgx,
    };
  }, [items, bulkMinQty, bulkMinUgx]);

  const filteredUnits = useMemo(() => {
    const units = storeInfo?.prisonUnits || [];
    if (regionFilter === 'All') return units;
    return units.filter((u) => u.region === regionFilter);
  }, [storeInfo, regionFilter]);

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let activeToken = getCustomerToken();

      // If guest checked "Create my UPS Market account", register first seamlessly
      if (!customer && createAccount && accountPassword.length >= 6) {
        try {
          const reg = await apiFetch('/api/customer/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: customerName,
              phone: customerPhone,
              email: customerEmail,
              password: accountPassword,
              default_district: district,
              default_address: deliveryAddress,
              default_prison_unit: prisonUnit,
            }),
          });
          setCustomerToken(reg.token);
          activeToken = reg.token;
          if (onCustomerCreated) onCustomerCreated(reg.customer);
        } catch {
          // If phone already registered, continue placing the order cleanly
        }
      }

      const headers = { 'Content-Type': 'application/json' };
      if (activeToken) headers.Authorization = `Bearer ${activeToken}`;

      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        district,
        delivery_address: isBulk ? deliveryAddress : '',
        prison_unit: isBulk ? '' : prisonUnit,
        payment_method: paymentMethod,
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      };
      const data = await apiFetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      setCreatedOrder(data.order);
      setSmsInfo(data.sms);
      onOrderSuccess(data.order);
      onToast(`Order ${data.order.reference_code} confirmed! Automated reference generated.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadProof(e) {
    e.preventDefault();
    setError('');
    setUploadingProof(true);
    try {
      const fd = new FormData();
      fd.append('payment_tx_ref', txRef);
      fd.append('customer_name', createdOrder.customer_name);
      fd.append('proof_notes', proofNotes);
      if (proofFile) fd.append('proof', proofFile);

      const res = await fetch(`/api/orders/${encodeURIComponent(createdOrder.reference_code)}/proof`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not upload proof');
      setCreatedOrder(data.order);
      setProofSubmitted(true);
      onToast('Proof of payment sent to Uganda Prisons Sales Admin for verification!');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingProof(false);
    }
  }

  function copyRef() {
    if (!createdOrder) return;
    navigator.clipboard?.writeText(createdOrder.reference_code);
    onToast(`Copied reference: ${createdOrder.reference_code}`);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-left">
            <button type="button" className="btn-back" onClick={onClose} aria-label="Back to store">
              <ArrowLeft size={16} /> Back
            </button>
            <h3>
              {createdOrder
                ? `Order Confirmed — Ref: ${createdOrder.reference_code}`
                : 'UPS Market Checkout (3 Simple Steps)'}
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close checkout">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ background: '#f1f1f2' }}>
          {error && <div className="alert alert-error">{error}</div>}

          {!createdOrder ? (
            /* JUMIA 2-COLUMN 3-STEP CHECKOUT LAYOUT */
            <form onSubmit={handlePlaceOrder} className="jm-checkout-grid">
              <div className="jm-checkout-steps">
                {/* STEP 1: CUSTOMER ADDRESS */}
                <div className="jm-step-card">
                  <div className="jm-step-head">
                    <span><span className="jm-step-num">1</span> CUSTOMER ADDRESS</span>
                    {!customer && onOpenAuth && (
                      <button type="button" className="jm-step-link" onClick={onOpenAuth}>
                        <LogIn size={13} /> Sign In for 1-Click Auto-Fill
                      </button>
                    )}
                    {customer && (
                      <span className="status-badge badge-green">Signed in: {customer.full_name}</span>
                    )}
                  </div>
                  <div className="jm-step-body">
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Customer Full Name *</label>
                        <input
                          className="input"
                          required
                          placeholder="e.g. Okello John Bosco"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone Number (Yoola SMS Alerts) *</label>
                        <input
                          className="input"
                          required
                          placeholder="e.g. 0772123456"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">District *</label>
                        <select className="select" value={district} onChange={(e) => setDistrict(e.target.value)}>
                          {UGANDA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email Address (Optional)</label>
                        <input
                          className="input"
                          type="email"
                          placeholder="customer@example.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {!customer && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={createAccount}
                            onChange={(e) => setCreateAccount(e.target.checked)}
                          />
                          Save my details &amp; create a UPS Market account (Track orders anytime!)
                        </label>
                        {createAccount && (
                          <div className="form-group" style={{ marginTop: 8, maxWidth: 320 }}>
                            <label className="form-label">Choose Account Password (min 6 chars) *</label>
                            <input
                              className="input"
                              type="password"
                              required
                              minLength={6}
                              placeholder="Create a password"
                              value={accountPassword}
                              onChange={(e) => setAccountPassword(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* STEP 2: DELIVERY DETAILS */}
                <div className="jm-step-card">
                  <div className="jm-step-head">
                    <span><span className="jm-step-num">2</span> DELIVERY DETAILS</span>
                    <span className={`status-badge ${isBulk ? 'badge-verified' : 'badge-gold'}`}>
                      {isBulk ? 'FREE DOOR DELIVERY (BULK)' : 'PRISON PICK-UP STATION'}
                    </span>
                  </div>
                  <div className="jm-step-body">
                    {isBulk ? (
                      <>
                        <div className="alert alert-success" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                          <Truck size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <strong>FREE NATIONWIDE BULK DOOR DELIVERY QUALIFIED!</strong>
                            <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                              Uganda Prisons Service Sales Agents will deliver directly to your address anywhere in Uganda at <strong>UGX 0</strong>.
                            </div>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            <MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Exact Delivery Address / Street / Town / School / Farm *
                          </label>
                          <input
                            className="input"
                            required
                            placeholder="e.g. Plot 14 Ntinda Road, Kampala"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="alert alert-gold" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                          <Building2 size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <strong>PICK-UP STATION — NEARBY UGANDA PRISONS UNIT</strong>
                            <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                              Choose your nearest Uganda Prisons unit below to collect your order. *(Orders of {bulkMinQty}+ units or {formatUgx(bulkMinUgx)}+ unlock FREE door delivery.)*
                            </div>
                          </div>
                        </div>
                        <div className="form-grid">
                          <div className="form-group">
                            <label className="form-label">Filter by Region</label>
                            <select
                              className="select"
                              value={regionFilter}
                              onChange={(e) => {
                                setRegionFilter(e.target.value);
                                const nextList =
                                  e.target.value === 'All'
                                    ? storeInfo?.prisonUnits || []
                                    : (storeInfo?.prisonUnits || []).filter((u) => u.region === e.target.value);
                                if (nextList[0]) setPrisonUnit(`${nextList[0].name} (${nextList[0].district})`);
                              }}
                            >
                              <option value="All">All Regions of Uganda</option>
                              <option value="Central">Central Region</option>
                              <option value="Eastern">Eastern Region</option>
                              <option value="Northern">Northern Region</option>
                              <option value="Western">Western Region</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Select Nearby Uganda Prisons Unit *</label>
                            <select className="select" required value={prisonUnit} onChange={(e) => setPrisonUnit(e.target.value)}>
                              {filteredUnits.map((u) => (
                                <option key={u.id} value={`${u.name} (${u.district})`}>
                                  {u.name} — {u.district} ({u.region})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* STEP 3: PAYMENT METHOD */}
                <div className="jm-step-card">
                  <div className="jm-step-head">
                    <span><span className="jm-step-num">3</span> PAYMENT METHOD</span>
                  </div>
                  <div className="jm-step-body">
                    <div className="form-grid" style={{ marginBottom: 12 }}>
                      {PAYMENT_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const active = paymentMethod === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`payment-method-card ${active ? 'selected' : ''}`}
                            onClick={() => setPaymentMethod(opt.id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--ups-black)', fontSize: '0.86rem' }}>
                              <Icon size={16} color={active ? '#9e1b4d' : '#164785'} /> {opt.label}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginTop: 3 }}>
                              {opt.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="alert alert-info" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
                      {paymentMethod === 'MTN Mobile Money (MoMo)' && (
                        <div>
                          <strong>MTN Mobile Money / MoMo:</strong> Pay <strong>{formatUgx(subtotal)}</strong> to{' '}
                          <strong>{storeInfo?.payments?.mtnMomo?.number}</strong> ({storeInfo?.payments?.mtnMomo?.accountName}), then submit your Transaction ID &amp; receipt on the next screen.
                        </div>
                      )}
                      {paymentMethod === 'Airtel Money' && (
                        <div>
                          <strong>Airtel Money:</strong> Pay <strong>{formatUgx(subtotal)}</strong> to{' '}
                          <strong>{storeInfo?.payments?.airtelMoney?.number}</strong> ({storeInfo?.payments?.airtelMoney?.accountName}), then upload your confirmation receipt.
                        </div>
                      )}
                      {paymentMethod === 'Bank Transfer (UPS Account)' && (
                        <div>
                          <strong>Official UPS Bank Account:</strong> {storeInfo?.payments?.bank?.bankName} ({storeInfo?.payments?.bank?.branch}) — Account: <strong>{storeInfo?.payments?.bank?.accountName}</strong> • No: <strong>{storeInfo?.payments?.bank?.accountNumber}</strong>.
                        </div>
                      )}
                      {paymentMethod === 'Cash / Pay on Delivery' && (
                        <div>
                          <strong>Cash / Pay on Delivery:</strong> Your order enters the Sales Admin verification queue and you will receive an automatic Yoola SMS once approved!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT STICKY JUMIA ORDER SUMMARY SIDEBAR */}
              <aside className="jm-checkout-summary">
                <div className="jm-step-card">
                  <div className="jm-step-head">
                    <span>ORDER SUMMARY ({totalQty})</span>
                  </div>
                  <div className="jm-step-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, maxHeight: 220, overflowY: 'auto' }}>
                      {items.map((item) => (
                        <div key={item.id} style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: '0.8rem' }}>
                          <img src={item.image_url} alt={item.name} style={{ width: 44, height: 36, objectFit: 'cover', borderRadius: 5 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: 'var(--ups-black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </div>
                            <div style={{ color: 'var(--ups-gray)' }}>Qty: {item.quantity}</div>
                          </div>
                          <strong>{formatUgx(item.price_ugx * item.quantity)}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="jm-summary-line">
                      <span>Items Total ({totalQty})</span>
                      <strong>{formatUgx(subtotal)}</strong>
                    </div>
                    <div className="jm-summary-line">
                      <span>Delivery Fee</span>
                      <strong style={{ color: '#15803d' }}>FREE (UGX 0)</strong>
                    </div>
                    <div className="jm-summary-total">
                      <span>Total</span>
                      <strong>{formatUgx(subtotal)}</strong>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: 12 }}
                      disabled={submitting}
                    >
                      <ShieldCheck size={16} />
                      {submitting ? 'Confirming Order...' : 'CONFIRM ORDER'}
                    </button>
                    <p style={{ fontSize: '0.72rem', color: 'var(--ups-gray)', textAlign: 'center', marginTop: 8 }}>
                      Automated Purchase Reference &amp; Yoola SMS confirmation sent immediately.
                    </p>
                  </div>
                </div>
              </aside>
            </form>
          ) : (
            /* STEP 4: AUTOMATED PURCHASE REFERENCE + PROOF OF PAYMENT SUBMISSION */
            <div className="panel-card" style={{ marginBottom: 0 }}>
              <div className="alert alert-success" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <strong>Order Confirmed for {createdOrder.customer_name}!</strong>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.88rem' }}>Automated Purchase Reference:</span>
                    <span
                      style={{
                        background: 'var(--ups-black)',
                        color: 'var(--ups-gold-bright)',
                        border: '1px solid var(--ups-gold)',
                        padding: '5px 12px',
                        borderRadius: 8,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        fontSize: '1rem',
                      }}
                    >
                      {createdOrder.reference_code}
                    </span>
                    <button type="button" className="btn btn-outline btn-sm" onClick={copyRef}>
                      <Copy size={14} /> Copy Ref
                    </button>
                  </div>
                  <div style={{ fontSize: '0.82rem', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={14} />
                    Yoola SMS Alert:{' '}
                    <strong>
                      {smsInfo?.ok ? `Sent to ${createdOrder.customer_phone}` : 'Logged & Queued'}
                    </strong>
                  </div>
                </div>
              </div>

              {createdOrder.payment_method !== 'Cash / Pay on Delivery' && !proofSubmitted ? (
                <form onSubmit={handleUploadProof} className="panel-card" style={{ background: '#f8f9fa' }}>
                  <h4 style={{ color: 'var(--ups-black)', marginBottom: 6 }}>
                    Submit Proof of Payment to Sales Admin
                  </h4>
                  <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', marginBottom: 14 }}>
                    After completing payment via <strong>{createdOrder.payment_method}</strong>, attach your payment screenshot/bank slip and Transaction ID below. Your Purchase Reference (<strong>{createdOrder.reference_code}</strong>) and Full Name (<strong>{createdOrder.customer_name}</strong>) are automatically attached.
                  </p>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">MoMo / Airtel / Bank Transaction ID *</label>
                      <input
                        className="input"
                        required
                        placeholder="e.g. MP261122.1842.A9201 or Bank Slip No."
                        value={txRef}
                        onChange={(e) => setTxRef(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Upload Proof of Payment (Receipt Photo / PDF)</label>
                      <input
                        className="input"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="form-group full">
                      <label className="form-label">Additional Payment Notes (Optional)</label>
                      <input
                        className="input"
                        placeholder="e.g. Paid from 0772xxxxxx"
                        value={proofNotes}
                        onChange={(e) => setProofNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                    <button type="button" className="btn btn-outline" onClick={onClose}>
                      I&apos;ll Submit Proof Later
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={uploadingProof}>
                      <Upload size={16} />
                      {uploadingProof ? 'Uploading Proof...' : 'Send Proof of Payment'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="alert alert-info" style={{ marginBottom: 0 }}>
                  {proofSubmitted ? (
                    <>
                      <strong>Proof of Payment Received!</strong> Sales Admin will verify your payment shortly and send an automatic Yoola SMS confirmation to <strong>{createdOrder.customer_phone}</strong>.
                    </>
                  ) : (
                    <>
                      <strong>Cash / Pay on Delivery Order Queued for Admin Verification!</strong> Keep your reference <strong>{createdOrder.reference_code}</strong>. You will receive an SMS once approved!
                    </>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <button className="btn btn-primary btn-sm" onClick={onClose}>
                      Done — Continue Shopping
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
