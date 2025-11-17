// netlify/functions/subscribe.js
const crypto = require('crypto');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { email, firstName, lastName } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };

    const apiKey = process.env.MAILCHIMP_API_KEY;
    const server = process.env.MAILCHIMP_SERVER_PREFIX; // e.g., us19
    const listId = process.env.MAILCHIMP_AUDIENCE_ID;

    if (!apiKey || !server || !listId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Mailchimp env vars not configured' }) };
    }

    const subscriberHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
    const url = `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`;

    const body = {
      email_address: email,
      status_if_new: 'subscribed',
      status: 'subscribed',
      merge_fields: { FNAME: firstName || '', LNAME: lastName || '' }
    };

    const res = await fetch(url, {
      method: 'PUT', // PUT upserts (create or update) the member
      headers: {
        Authorization: `apikey ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) {
      return { statusCode: 400, body: JSON.stringify({ error: data }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, data }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};