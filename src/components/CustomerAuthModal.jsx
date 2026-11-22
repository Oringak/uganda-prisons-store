import React, { useState } from 'react';
import { ArrowLeft, LogIn, ShieldCheck, UserPlus, X } from 'lucide-react';
import { apiFetch, setCustomerToken } from '../utils/api';

const UGANDA_DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Gulu', 'Lira', 'Mbarara',
  'Masaka', 'Arua', 'Fort Portal / Kabarole', 'Soroti', 'Tororo', 'Hoima',
  'Masindi', 'Kabale', 'Kasese', 'Iganga', 'Luwero', 'Mubende', 'Moroto',
  'Kitgum', 'Apac', 'Kapchorwa', 'Entebbe', 'Bushenyi', 'Ntungamo', 'Other District',
];

export default function CustomerAuthModal({
  initialMode = 'login',
  storeInfo,
  onClose,
  onAuthSuccess,
  onToast,
}) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Registration fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('Kampala');
  const [prisonUnit, setPrisonUnit] = useState(
    storeInfo?.prisonUnits?.[0]
      ? `${storeInfo.prisonUnits[0].name} (${storeInfo.prisonUnits[0].district})`
      : 'Luzira Upper / UPS Industries Showroom (Kampala)'
  );
  const [address, setAddress] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      setCustomerToken(data.token);
      onAuthSuccess(data.customer);
      onToast(data.message || `Welcome back, ${data.customer.full_name}!`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          email,
          password,
          default_district: district,
          default_address: address,
          default_prison_unit: prisonUnit,
        }),
      });
      setCustomerToken(data.token);
      onAuthSuccess(data.customer);
      onToast(data.message || 'UPS Market account created!');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-left">
            <button type="button" className="btn-back" onClick={onClose}>
              <ArrowLeft size={16} /> Back
            </button>
            <h3>{mode === 'login' ? 'Sign In to UPS Market' : 'Create UPS Market Account'}</h3>
          </div>
          <button className="icon-btn" aria-label="Close account dialog" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Official UPS Crest Identity */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div className="brand-emblem" style={{ width: 62, height: 62, margin: '0 auto 8px', padding: 4 }}>
              <img src="/images/prisonslogo-1.png" alt="Uganda Prisons Service Crest" className="brand-logo-img" />
            </div>
            <div style={{ fontWeight: 800, color: 'var(--ups-black)', fontSize: '1.02rem' }}>
              Welcome to Uganda Prisons Service Market
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--ups-gray)' }}>
              Fast 1-click ordering, saved delivery address, order history &amp; instant Yoola SMS alerts.
            </div>
          </div>

          {/* Jumia-style Mode Switch Tabs */}
          <div className="jm-auth-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => { setMode('login'); setError(''); }}
            >
              <LogIn size={15} /> Sign In
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => { setMode('register'); setError(''); }}
            >
              <UserPlus size={15} /> Create Account
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div className="form-group">
                <label className="form-label">Phone Number or Email *</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. 0772123456 or email@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  className="input"
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
                {submitting ? 'Signing In...' : 'SIGN IN'}
              </button>
              <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--ups-gray)' }}>
                New to UPS Market?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--ups-maroon)', fontWeight: 800, cursor: 'pointer' }}
                  onClick={() => { setMode('register'); setError(''); }}
                >
                  Create an account
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Full Name *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Okello John Bosco"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number (Uganda) *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. 0772123456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (Optional)</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">District *</label>
                  <select className="select" value={district} onChange={(e) => setDistrict(e.target.value)}>
                    {UGANDA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Create Password (min 6 chars) *</label>
                  <input
                    className="input"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">Preferred Nearby Uganda Prisons Pickup Unit</label>
                  <select className="select" value={prisonUnit} onChange={(e) => setPrisonUnit(e.target.value)}>
                    {(storeInfo?.prisonUnits || []).map((u) => (
                      <option key={u.id} value={`${u.name} (${u.district})`}>
                        {u.name} — {u.district} ({u.region})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group full">
                  <label className="form-label">Default Delivery Address (For Free Bulk Delivery)</label>
                  <input
                    className="input"
                    placeholder="Town, Street, School, or Farm location"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', marginTop: 14 }}>
                <ShieldCheck size={16} /> {submitting ? 'Creating Account...' : 'CREATE MY UPS ACCOUNT'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
