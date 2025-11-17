// netlify/functions/payment-webhook.js
const PAYPAL_API = (mode) => (mode === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com');

async function getAccessToken(mode) {
  const client = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  const tokenRes = await fetch(`${PAYPAL_API(mode)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${client}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  return tokenRes.json();
}
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    const rawBody = event.body;
    const webhookEvent = JSON.parse(rawBody);
    // Normalize headers to lower-case for reliable access
    const headers = {};
    Object.keys(event.headers || {}).forEach(k => headers[k.toLowerCase()] = event.headers[k]);

    const transmission_id = headers['paypal-transmission-id'];
    const transmission_time = headers['paypal-transmission-time'];
    const cert_url = headers['paypal-cert-url'];
    const auth_algo = headers['paypal-auth-algo'];
    const transmission_sig = headers['paypal-transmission-sig'];

    const mode = process.env.PAYPAL_MODE || 'sandbox';
    const tokenObj = await getAccessToken(mode);
    const accessToken = tokenObj.access_token;
    if (!accessToken) return { statusCode: 500, body: JSON.stringify({ error: 'Could not get PayPal access token' }) };

    const verifyRes = await fetch(`${PAYPAL_API(mode)}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transmission_id,
        transmission_time,
        cert_url,
        auth_algo,
        transmission_sig,
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: webhookEvent
      })
    });

    const verifyJson = await verifyRes.json();
    if (verifyJson.verification_status !== 'SUCCESS') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid webhook signature', verifyJson }) };
    }

    // Process webhook events here. Example:
    if (webhookEvent.event_type === 'PAYMENT.CAPTURE.COMPLETED' || webhookEvent.event_type === 'CHECKOUT.ORDER.APPROVED') {
      // TODO: update DB, fulfill order, add to Mailchimp, send receipt, etc.
      // You can call the subscribe function or Mailchimp API from here if needed.
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};