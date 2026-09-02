# PATZCOM Storefront

Static automotive parts storefront for `www.patzcom.com`.

## Local Preview

```bash
npm install
npm run dev
```

## Railway

Use these settings:

```bash
Build command: npm run build
Start command: npm start
Branch: main
```

The app serves the static storefront from:

```text
work/abc11-site_1/site
```

Add `www.patzcom.com` in Railway under:

```text
Service -> Settings -> Networking -> Public Networking -> Custom Domain
```

## Payments

The public cart exposes PayPal first and Stripe card checkout second. Payment
amounts are rebuilt from `assets/products.json` on the server; browser-submitted
prices are never trusted. PayPal uses the server-side Orders v2 create/capture
flow, and Stripe uses a server-created hosted Checkout Session.

Set these Railway variables to enable live checkout. Never commit these values:

```text
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_ENV=live
STRIPE_SECRET_KEY
PATZCOM_PUBLIC_URL=https://www.patzcom.com
PATZCOM_SHIPPING_FLAT=0
```

Until the credentials are present, the cart shows a clear setup message instead
of pretending that a payment was completed.

## eBay image sync

Set the Production App ID and Cert ID in Railway variables only. Never commit the
Cert ID or an OAuth token. The admin page uses the eBay Browse API to look up each
listing by its legacy item number first, then falls back to a title search only
when no trusted local gallery exists.

Required variables:

```text
EBAY_CLIENT_ID
EBAY_CLIENT_SECRET
EBAY_MARKETPLACE_ID=EBAY_US
EBAY_LISTING_SITE=US
EBAY_IMAGE_ENRICH_LIMIT=0
```

After OAuth credentials are configured, sign in at `/admin-login.html` and use
`Selling -> Catalog import -> Sync all eBay images`. The sync rebuilds every
affected PATZCOM product detail page and preserves existing media for ended or
unavailable eBay listings.

Seller Hub CSV imports default to `Listing site=US`; listings from AU, CA, DE, FR,
GB, and IT are excluded before PATZCOM pages are rebuilt.
