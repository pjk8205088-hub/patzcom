# patzcom.com - static storefront

## Folder structure
- `index.html` - Home page with hero, categories, and featured products
- `collections/*.html` - Category listings (`all.html` includes the full imported catalog)
- `products/*.html` - Product detail pages generated from the imported catalog snapshot
- `cart.html` - Cart and PayPal checkout
- `about.html`, `contact.html`, `policies.html`
- `assets/site.css`, `assets/site.js`, `assets/config.js`, `assets/products.json`

## 1. Enable payments
Open `assets/config.js` and paste your PayPal **Live client ID**.

```js
paypalClientId: "paste_it_here",
shippingFlat: 0, // flat shipping rate (USD)
```

After saving, the live PayPal checkout button appears automatically in the cart page.

## 2. Localize images (recommended)
The current site uses the original CDN image links. To host images locally:

```bash
python3 download_images.py
```

This downloads the images into `assets/img/` and rewrites the HTML to local paths.

## 3. Deployment
Upload the entire folder to any static host.

- Cloudflare Pages / Netlify: drag and drop the folder, then add `patzcom.com` as the domain
- Traditional web hosting: upload to `public_html` via FTP
- Local preview: run `python3 -m http.server 8000` and open `http://localhost:8000`

## 4. eBay catalog import workflow
When you export your own eBay listings or feed them through an API/SDK payload, paste the normalized JSON into the admin page or send it to:

```http
POST /api/admin/catalog/import
```

You can also import from a GitHub-hosted raw JSON file or a live eBay API URL:

```http
POST /api/admin/catalog/import-source
```

Supported shapes:
- `{ "items": [...] }`
- `{ "products": [...] }`
- a raw array of listing objects
- eBay Browse/API item summary payloads
- GitHub raw JSON files and GitHub API contents responses

After import, the server rewrites `assets/products.json` and regenerates every product detail page and collection page from the shared marketplace template.

## Notes
- The original spreadsheet had one-column offset issues in the Handle/URL fields, so links were regenerated from product names.
- For adding or editing products, it is safer to update the source spreadsheet and regenerate `assets/products.json`.
