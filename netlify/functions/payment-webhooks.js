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