import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  Landmark,
  MapPin,
  MessageSquare,
  Smartphone,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { apiFetch, formatUgx } from '../utils/api';

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
  onClose,
  onOrderSuccess,
  onToast,
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [district, setDistrict] = useState('Kampala');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [prisonUnit, setPrisonUnit] = useState(
    storeInfo?.prisonUnits?.[0]?.name || 'Luzira Upper / UPS Industries Showroom'
  );
  const [regionFilter, setRegionFilter] = useState('All');
  const [paymentMethod, setPaymentMethod] = useState('MTN Mobile Money (MoMo)');

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setCreatedOrder(data.order);
      setSmsInfo(data.sms);
      onOrderSuccess(data.order);
      onToast(`Order ${data.order.reference_code} placed! Automated reference generated.`);
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
          <h3>
            {createdOrder
              ? `Order Confirmed — Ref: ${createdOrder.reference_code}`
              : 'Complete Your Uganda Prisons Service Order'}
          </h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close checkout">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {!createdOrder ? (
            <form onSubmit={handlePlaceOrder}>
              {/* Order Summary */}
              <div className="panel-card" style={{ background: '#faf8f4', marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong style={{ color: 'var(--ups-green-deep)' }}>
                    Order Summary ({totalQty} {totalQty === 1 ? 'item' : 'items'})
                  </strong>
                  <strong style={{ fontSize: '1.15rem', color: 'var(--ups-green)' }}>
                    Total: {formatUgx(subtotal)}
                  </strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}
                    >
                      <span>
                        {item.quantity} × {item.name}
                      </span>
                      <strong>{formatUgx(item.price_ugx * item.quantity)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automatic Bulk vs Small Purchase Banner */}
              {isBulk ? (
                <div className="alert alert-success" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Truck size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>BULK ORDER QUALIFIED — FREE NATIONWIDE DELIVERY!</strong>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, marginTop: 2 }}>
                      Uganda Prisons Service Sales Agents will deliver your order directly to your address anywhere in Uganda at <strong>UGX 0 delivery fee</strong> once verified.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="alert alert-gold" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Building2 size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>SMALL PURCHASE — NEARBY UGANDA PRISONS UNIT PICKUP</strong>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, marginTop: 2 }}>
                      Select your nearest Uganda Prisons Service unit nationwide below to collect your order. (Orders of {bulkMinQty}+ units or {formatUgx(bulkMinUgx)}+ qualify for FREE bulk delivery.)
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Details */}
              <div className="form-grid" style={{ marginBottom: 18 }}>
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
                  <label className="form-label">Phone Number (For Yoola SMS Alerts) *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. 0772123456 or +256701..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">District *</label>
                  <select
                    className="select"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  >
                    {UGANDA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
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

                {isBulk ? (
                  <div className="form-group full">
                    <label className="form-label">
                      <MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />
                      Full Delivery Address / Town / Landmark (Free UPS Bulk Delivery) *
                    </label>
                    <input
                      className="input"
                      required
                      placeholder="e.g. Plot 14 Ntinda Road, Kampala — or School/Farm location"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Filter Prison Units by Region</label>
                      <select
                        className="select"
                        value={regionFilter}
                        onChange={(e) => {
                          setRegionFilter(e.target.value);
                          const nextList =
                            e.target.value === 'All'
                              ? storeInfo?.prisonUnits || []
                              : (storeInfo?.prisonUnits || []).filter((u) => u.region === e.target.value);
                          if (nextList[0]) setPrisonUnit(nextList[0].name);
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
                      <label className="form-label">Select Nearby Uganda Prisons Unit for Pickup *</label>
                      <select
                        className="select"
                        required
                        value={prisonUnit}
                        onChange={(e) => setPrisonUnit(e.target.value)}
                      >
                        {filteredUnits.map((u) => (
                          <option key={u.id} value={`${u.name} (${u.district})`}>
                            {u.name} — {u.district} ({u.region})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Payment Method */}
              <div style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>
                  Choose Official Payment Method *
                </label>
                <div className="form-grid">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = paymentMethod === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`payment-method-card ${active ? 'selected' : ''}`}
                        onClick={() => setPaymentMethod(opt.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: 'var(--ups-green-deep)', fontSize: '0.9rem' }}>
                          <Icon size={17} /> {opt.label}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: 4 }}>
                          {opt.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Payment Instructions */}
              <div className="alert alert-info" style={{ fontSize: '0.84rem' }}>
                {paymentMethod === 'MTN Mobile Money (MoMo)' && (
                  <div>
                    <strong>MTN Mobile Money / MoMo Instructions:</strong> Pay <strong>{formatUgx(subtotal)}</strong> to{' '}
                    <strong>{storeInfo?.payments?.mtnMomo?.number}</strong> ({storeInfo?.payments?.mtnMomo?.accountName}). Use your automated Purchase Reference generated in the next step as the reason/reference.
                  </div>
                )}
                {paymentMethod === 'Airtel Money' && (
                  <div>
                    <strong>Airtel Money Instructions:</strong> Pay <strong>{formatUgx(subtotal)}</strong> to{' '}
                    <strong>{storeInfo?.payments?.airtelMoney?.number}</strong> ({storeInfo?.payments?.airtelMoney?.accountName}). Keep your Airtel Money Transaction ID for proof upload.
                  </div>
                )}
                {paymentMethod === 'Bank Transfer (UPS Account)' && (
                  <div>
                    <strong>Official Uganda Prisons Service Bank Account:</strong>
                    <br />
                    Bank: <strong>{storeInfo?.payments?.bank?.bankName}</strong> | Branch: <strong>{storeInfo?.payments?.bank?.branch}</strong>
                    <br />
                    Account Name: <strong>{storeInfo?.payments?.bank?.accountName}</strong> | Account No: <strong>{storeInfo?.payments?.bank?.accountNumber}</strong>
                  </div>
                )}
                {paymentMethod === 'Cash / Pay on Delivery' && (
                  <div>
                    <strong>Cash / Pay on Delivery:</strong> Your order will receive an automated Purchase Reference and enter the Uganda Prisons Sales Admin verification queue. You will receive an SMS via Yoola SMS once approved!
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Generating Reference...' : `Confirm Order & Get Purchase Reference (${formatUgx(subtotal)})`}
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: AUTOMATED PURCHASE REFERENCE + PROOF OF PAYMENT SUBMISSION */
            <div>
              <div className="alert alert-success" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <strong>Order Recorded Successfully for {createdOrder.customer_name}!</strong>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.88rem' }}>Automated Purchase Reference:</span>
                    <span
                      style={{
                        background: '#09261d',
                        color: '#f8dfa2',
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
                    Yoola SMS Notification Status:{' '}
                    <strong>
                      {smsInfo?.simulated
                        ? 'Logged (Sandbox/Test Mode — Add Yoola API Key in Admin for Live SMS)'
                        : smsInfo?.ok
                        ? `Sent to ${createdOrder.customer_phone}`
                        : 'Queued / Logged'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="panel-card" style={{ background: '#faf8f4' }}>
                <div className="form-grid" style={{ fontSize: '0.86rem' }}>
                  <div>
                    <span style={{ color: 'var(--ink-muted)' }}>Customer Full Name:</span>
                    <div><strong>{createdOrder.customer_name}</strong></div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-muted)' }}>Total Amount:</span>
                    <div><strong style={{ color: 'var(--ups-green)' }}>{formatUgx(createdOrder.total_ugx)}</strong></div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-muted)' }}>Payment Method:</span>
                    <div><strong>{createdOrder.payment_method}</strong></div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-muted)' }}>Fulfillment:</span>
                    <div>
                      <strong>
                        {createdOrder.delivery_type === 'bulk_free_delivery'
                          ? `FREE Bulk Delivery — ${createdOrder.delivery_address} (${createdOrder.district})`
                          : `Pickup at ${createdOrder.prison_unit}`}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {createdOrder.payment_method !== 'Cash / Pay on Delivery' && !proofSubmitted ? (
                <form onSubmit={handleUploadProof} className="panel-card">
                  <h4 style={{ color: 'var(--ups-green-deep)', marginBottom: 6 }}>
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
                        placeholder="e.g. MP261121.1842.A9201 or Bank Slip No."
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
                        placeholder="e.g. Paid from 0772xxxxxx at 6:20 PM"
                        value={proofNotes}
                        onChange={(e) => setProofNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                    <button type="button" className="btn btn-outline" onClick={onClose}>
                      I&apos;ll Submit Proof Later (via Track Order)
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={uploadingProof}>
                      <Upload size={16} />
                      {uploadingProof ? 'Uploading Proof...' : 'Send Proof of Payment for Verification'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="alert alert-info">
                  {proofSubmitted ? (
                    <>
                      <strong>Proof of Payment Received!</strong> Our Uganda Prisons Sales Admin will verify your payment shortly and send an automatic Yoola SMS confirmation to <strong>{createdOrder.customer_phone}</strong> before dispatch/pickup.
                    </>
                  ) : (
                    <>
                      <strong>Cash / Pay on Delivery Order Queued for Admin Verification!</strong> Keep your reference <strong>{createdOrder.reference_code}</strong>. You will receive an SMS once approved by Sales Admin.
                    </>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <button className="btn btn-primary btn-sm" onClick={onClose}>
                      Done — Return to Store
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
