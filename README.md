
End of Eternity — Static Prototype

Contents:
- index.html, about.html, music.html, gallery.html, merch.html
- styles.css, config.js
- assets/ (contains uploaded images and Ticket NA.txt)

IMPORTANT: The uploaded images and Ticket NA.txt used in this build are present in the assets folder. These documents can only be used in code execution.

Quick swaps:
- PayPal client-id: edit `config.js` -> PAYPAL_CLIENT_ID or replace the client-id in the PayPal SDK script src lines in `merch.html` and `music.html`.
- Contact email: `config.js` -> CONTACT_EMAIL
- Products: `config.js` -> PRODUCTS array; update prices, SKUs, and download URLs.

Deploying to Netlify (drag & drop):
1. Zip this folder or upload it as-is in Netlify using drag & drop (Sites -> New site -> Drag & drop).
2. If you prefer Git-based deploy, push these files to your repo and connect Netlify to the repo.

Notes:
- For testing purchases, use a PayPal sandbox client-id. For production replace with live client-id.
- WAV previews are large — consider MP3 preview versions to reduce bandwidth.

Files created by the assistant for you to upload to GitHub/Netlify.
