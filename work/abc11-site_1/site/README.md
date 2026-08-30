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

### Recommended import order
1. Export or fetch your eBay listings into JSON.
2. Normalize that JSON to the PATZCOM catalog format below.
3. Upload the JSON to GitHub, or paste it into the admin import panel.
4. If you have an eBay API endpoint or GitHub raw JSON URL, use `POST /api/admin/catalog/import-source`.

### Common catalog format
Use this structure for both GitHub JSON uploads and eBay API exports:

```json
{
  "items": [
    {
      "id": "1234567890",
      "title": "Product title",
      "handle": "product-title",
      "vendor": "BRAND",
      "type": "Category name",
      "tags": ["tag one", "tag two"],
      "price": 0,
      "compare": null,
      "available": true,
      "grams": 0,
      "sku": "",
      "desc_text": "Short description",
      "desc_html": "<p>Rich description</p>",
      "images": [
        "https://example.com/image-1.jpg",
        "https://example.com/image-2.jpg"
      ]
    }
  ]
}
```

### Field mapping
- `id`: eBay item id, Shopify id, or any unique product id
- `title`: product name shown on the storefront
- `handle`: URL slug for product detail pages
- `vendor`: brand or maker name
- `type`: PATZCOM category name
- `tags`: optional keywords
- `price`: numeric price
- `compare`: compare-at price, if any
- `available`: `true` or `false`
- `grams`: optional weight
- `sku`: optional SKU
- `desc_text` / `desc_html`: plain-text or HTML product description
- `images`: ordered gallery image URLs

## Notes
- The original spreadsheet had one-column offset issues in the Handle/URL fields, so links were regenerated from product names.
- For adding or editing products, it is safer to update the source spreadsheet and regenerate `assets/products.json`.
