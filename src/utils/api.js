export function formatUgx(amount) {
  return 'UGX ' + Number(amount || 0).toLocaleString('en-UG');
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-UG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-UG', { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

export async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function getAdminToken() {
  return localStorage.getItem('ups_admin_token') || '';
}

export function setAdminToken(token) {
  if (token) localStorage.setItem('ups_admin_token', token);
  else localStorage.removeItem('ups_admin_token');
}

export async function adminFetch(url, options = {}) {
  const token = getAdminToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    setAdminToken('');
    throw new Error(data.error || 'Unauthorized');
  }
  if (!res.ok) {
    throw new Error(data.error || `Admin request failed (${res.status})`);
  }
  return data;
}

export function getCustomerToken() {
  return localStorage.getItem('ups_customer_token') || '';
}

export function setCustomerToken(token) {
  if (token) localStorage.setItem('ups_customer_token', token);
  else localStorage.removeItem('ups_customer_token');
}

export async function customerFetch(url, options = {}) {
  const token = getCustomerToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    setCustomerToken('');
    throw new Error(data.error || 'Please sign in again.');
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function paymentStatusMeta(status) {
  const map = {
    pending_proof: { label: 'Awaiting Payment Proof', cls: 'badge-gold' },
    pay_on_delivery_pending: { label: 'Cash / Pay on Delivery', cls: 'badge-blue' },
    pending_verification: { label: 'Proof Submitted — Verifying', cls: 'badge-gold' },
    verified: { label: 'Payment Verified', cls: 'badge-green' },
    rejected: { label: 'Verification Failed', cls: 'badge-red' },
  };
  return map[status] || { label: status || 'Pending', cls: 'badge-gray' };
}

export function orderStatusMeta(status) {
  const map = {
    pending_verification: { label: 'Pending Verification', cls: 'badge-gold' },
    verified: { label: 'Verified & Processing', cls: 'badge-blue' },
    dispatched: { label: 'Dispatched (In Transit)', cls: 'badge-blue' },
    ready_for_pickup: { label: 'Ready at Prison Unit', cls: 'badge-green' },
    delivered: { label: 'Delivered / Completed', cls: 'badge-green' },
    cancelled: { label: 'Cancelled', cls: 'badge-red' },
  };
  return map[status] || { label: status || 'Processing', cls: 'badge-gray' };
}
