const { run, getSettingsMap } = require('../db');

/**
 * Normalizes Ugandan phone numbers to international format without '+':
 * e.g. 0772123456 -> 256772123456, +256772123456 -> 256772123456
 */
function normalizeUgandaPhone(raw = '') {
  const digits = String(raw).replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('256') && digits.length >= 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '256' + digits.slice(1);
  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('3') || digits.startsWith('4'))) {
    return '256' + digits;
  }
  return digits;
}

async function getYoolaConfig() {
  const settings = await getSettingsMap().catch(() => ({}));
  const apiKey = settings.yoola_sms_api_key || process.env.YOOLA_SMS_API_KEY || '';
  const sender = settings.yoola_sms_sender_id || process.env.YOOLA_SMS_SENDER_ID || 'UPS-STORE';
  const sandboxRaw = settings.yoola_sms_sandbox ?? process.env.YOOLA_SMS_SANDBOX ?? 'true';
  const sandbox = String(sandboxRaw).toLowerCase() === 'true';
  const enabled = String(settings.yoola_sms_enabled ?? 'true').toLowerCase() === 'true';
  const apiUrl = process.env.YOOLA_SMS_API_URL || 'https://yoolasms.com/api/v1/send';

  return { apiKey, sender, sandbox, enabled, apiUrl, configured: Boolean(apiKey) };
}

async function sendYoolaSms({ phone, message, eventType = 'general', referenceCode = '' }) {
  const normalizedPhone = normalizeUgandaPhone(phone);
  const now = new Date().toISOString();
  const cfg = await getYoolaConfig();

  if (!normalizedPhone) {
    return { ok: false, status: 'invalid_phone', detail: 'Invalid phone number' };
  }

  if (!cfg.enabled) {
    await run(
      `INSERT INTO sms_logs (phone, message, event_type, reference_code, provider_status, provider_response, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [normalizedPhone, message, eventType, referenceCode, 'disabled', 'SMS notifications disabled in settings', now]
    );
    return { ok: false, status: 'disabled', detail: 'SMS disabled in settings' };
  }

  if (!cfg.apiKey) {
    // Graceful simulated mode when Yoola API key is not configured yet
    const simResponse = JSON.stringify({
      simulated: true,
      note: 'Yoola SMS API key not yet configured. Add YOOLA_SMS_API_KEY in Admin Settings or .env to send live SMS.',
      endpoint: cfg.apiUrl,
      sender: cfg.sender,
    });
    await run(
      `INSERT INTO sms_logs (phone, message, event_type, reference_code, provider_status, provider_response, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [normalizedPhone, message, eventType, referenceCode, 'simulated_no_key', simResponse, now]
    );
    return { ok: true, simulated: true, status: 'simulated_no_key', phone: normalizedPhone };
  }

  const payload = {
    api_key: cfg.apiKey,
    phone: normalizedPhone,
    message,
    sender: cfg.sender,
    ...(cfg.sandbox ? { sandbox: true } : {}),
  };

  try {
    const response = await fetch(cfg.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let parsed = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep raw text
    }

    const ok = response.ok && (typeof parsed === 'object' ? parsed.status !== 'error' : true);
    const statusLabel = ok ? (cfg.sandbox ? 'sent_sandbox' : 'sent') : 'failed';

    await run(
      `INSERT INTO sms_logs (phone, message, event_type, reference_code, provider_status, provider_response, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedPhone,
        message,
        eventType,
        referenceCode,
        statusLabel,
        typeof parsed === 'string' ? parsed.slice(0, 600) : JSON.stringify(parsed).slice(0, 600),
        now,
      ]
    );

    return { ok, status: statusLabel, phone: normalizedPhone, response: parsed };
  } catch (err) {
    await run(
      `INSERT INTO sms_logs (phone, message, event_type, reference_code, provider_status, provider_response, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [normalizedPhone, message, eventType, referenceCode, 'error', String(err.message || err), now]
    );
    return { ok: false, status: 'error', error: err.message };
  }
}

function formatUgx(val) {
  return 'UGX ' + Number(val || 0).toLocaleString('en-UG');
}

async function sendOrderCreatedSms(order) {
  const deliveryLine =
    order.delivery_type === 'bulk_free_delivery'
      ? `FREE Bulk Delivery to ${order.district}`
      : `Pickup at ${order.prison_unit}`;
  const paymentAction =
    order.payment_method === 'Cash / Pay on Delivery'
      ? 'Sales Admin will confirm your order shortly.'
      : 'Please upload your Proof of Payment on the store using your Reference.';
  const message = `Dear ${order.customer_name}, thank you for ordering from Uganda Prisons Service Store! Ref: ${order.reference_code}. Total: ${formatUgx(order.total_ugx)}. ${deliveryLine}. ${paymentAction}`;
  return sendYoolaSms({
    phone: order.customer_phone,
    message,
    eventType: 'order_created',
    referenceCode: order.reference_code,
  });
}

async function sendProofSubmittedSms(order) {
  const message = `Dear ${order.customer_name}, Proof of Payment received for UPS Order ${order.reference_code} (Tx: ${order.payment_tx_ref || 'Uploaded'}). Our Sales Admin is verifying your payment and will notify you shortly.`;
  return sendYoolaSms({
    phone: order.customer_phone,
    message,
    eventType: 'proof_submitted',
    referenceCode: order.reference_code,
  });
}

async function sendPaymentVerifiedSms(order) {
  const fulfillment =
    order.delivery_type === 'bulk_free_delivery'
      ? `Our Prison Sales Agents are preparing your FREE bulk delivery to ${order.district}.`
      : `Your order is being prepared for pickup at ${order.prison_unit}.`;
  const message = `CONFIRMED! Dear ${order.customer_name}, your payment for UPS Order ${order.reference_code} (${formatUgx(order.total_ugx)}) has been VERIFIED. ${fulfillment} Thank you for supporting Uganda Prisons Service.`;
  return sendYoolaSms({
    phone: order.customer_phone,
    message,
    eventType: 'payment_verified',
    referenceCode: order.reference_code,
  });
}

async function sendOrderStatusSms(order, statusLabel) {
  const fulfillment =
    order.delivery_type === 'bulk_free_delivery'
      ? `Delivery destination: ${order.delivery_address || order.district}.`
      : `Pickup Unit: ${order.prison_unit}.`;
  const message = `UPS Store Update for ${order.customer_name} (Ref: ${order.reference_code}): Order status is now ${statusLabel.toUpperCase()}. ${fulfillment}`;
  return sendYoolaSms({
    phone: order.customer_phone,
    message,
    eventType: `status_${statusLabel}`,
    referenceCode: order.reference_code,
  });
}

module.exports = {
  normalizeUgandaPhone,
  getYoolaConfig,
  sendYoolaSms,
  sendOrderCreatedSms,
  sendProofSubmittedSms,
  sendPaymentVerifiedSms,
  sendOrderStatusSms,
};
