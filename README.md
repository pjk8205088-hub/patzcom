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
EBAY_IMAGE_ENRICH_LIMIT=0
```

After OAuth credentials are configured, sign in at `/admin-login.html` and use
`Selling -> Catalog import -> Sync all eBay images`. The sync rebuilds every
affected PATZCOM product detail page and preserves existing media for ended or
unavailable eBay listings.
