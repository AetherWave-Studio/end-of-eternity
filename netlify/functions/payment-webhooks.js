// netlify/functions/payment-webhooks.js

const PAYPAL_MODE_LIVE = "live";
const PAYPAL_MODE_SANDBOX = "sandbox";

const PAYPAL_API = (mode) =>
  mode === PAYPAL_MODE_LIVE
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(mode) {
  const client = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!client || !secret) {
    throw new Error("PayPal client ID or secret not configured in env vars");
  }

  const tokenRes = await fetch(`${PAYPAL_API(mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${client}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error("Failed to get PayPal access token: " + text);
  }

  return tokenRes.json();
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Read and validate mode from environment
    const mode = process.env.PAYPAL_MODE;
    if (!mode) {
      throw new Error("PAYPAL_MODE not configured in environment");
    }

    const rawBody = event.body;
    const webhookEvent = JSON.parse(rawBody || "{}");

    // Normalize headers to lowercase
    const headers = {};
    Object.keys(event.headers || {}).forEach((k) => {
      headers[k.toLowerCase()] = event.headers[k];
    });

    const transmission_id = headers["paypal-transmission-id"];
    const transmission_time = headers["paypal-transmission-time"];
    const cert_url = headers["paypal-cert-url"];
    const auth_algo = headers["paypal-auth-algo"];
    const transmission_sig = headers["paypal-transmission-sig"];

    const webhook_id = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhook_id) {
      throw new Error("PAYPAL_WEBHOOK_ID not configured in env vars");
    }

    const tokenObj = await getAccessToken(mode);
    const accessToken = tokenObj.access_token;
    if (!accessToken) {
      throw new Error("No access token returned from PayPal");
    }

    const verifyRes = await fetch(
      `${PAYPAL_API(mode)}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transmission_id,
          transmission_time,
          cert_url,
          auth_algo,
          transmission_sig,
          webhook_id,
          webhook_event: webhookEvent,
        }),
      }
    );

    const verifyJson = await verifyRes.json();

    if (verifyJson.verification_status !== "SUCCESS") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid webhook signature",
          verifyJson,
        }),
      };
    }

    // Handle PayPal events here
    if (
      webhookEvent.event_type === "PAYMENT.CAPTURE.COMPLETED" ||
      webhookEvent.event_type === "CHECKOUT.ORDER.APPROVED"
    ) {
      // TODO: your fulfillment logic:
      // - update DB / Google Sheet
      // - send confirmation email
      // - add to Mailchimp list or tag
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};