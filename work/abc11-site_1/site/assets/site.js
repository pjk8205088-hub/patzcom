const R = window.ROOT || '';
let PRODUCTS = [];
const CART_KEY = 'patzcom_cart';
const cart = () => JSON.parse(localStorage.getItem(CART_KEY) || '{}');
const saveCart = c => { localStorage.setItem(CART_KEY, JSON.stringify(c)); paintCount(); };
function paintCount(){
  const n = Object.values(cart()).reduce((a,b)=>a+b,0);
  document.querySelectorAll('#cartcount').forEach(e=>e.textContent=n);
}
function addToCart(id){
  const q = parseInt((document.getElementById('qty')||{}).value || 1) || 1;
  const c = cart(); c[id] = (c[id]||0)+q; saveCart(c);
  const b = document.querySelector('.btn.add'); if(b){ b.textContent='Added ✓'; setTimeout(()=>b.textContent='Add to cart',1200); }
}
function setMain(el){
  document.getElementById('mainimg').src = el.src;
  document.querySelectorAll('.thumb').forEach(t=>t.classList.remove('on')); el.classList.add('on');
}
const money = n => '$'+n.toLocaleString('en-US',{minimumFractionDigits:2});
const qaKey = id => `patzcom_qa_${id}`;
const imgFallback = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#0f1319"/>
  <rect x="24" y="24" width="752" height="552" rx="24" fill="#151b23" stroke="#2a3440"/>
  <g fill="#8d98a8" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
    <text x="400" y="286" font-size="28" font-weight="700">Image unavailable</text>
    <text x="400" y="330" font-size="18">This product image could not be loaded.</text>
  </g>
</svg>`);

fetch(R+'assets/products.json').then(r=>r.json()).then(p=>{ PRODUCTS=p; initSearch(); initMarketplaceHome(); renderCart(); });
paintCount();
initQandA();
installImageFallbacks();
initProductPurchaseUI();
initVideoPlaceholders();
initCollectionWhiteUI();

function initSearch(){
  const q = document.getElementById('q'), box = document.getElementById('results');
  if(!q) return;
  q.addEventListener('input', ()=>{
    const v = q.value.trim().toLowerCase();
    if(v.length<2){ box.style.display='none'; return; }
    const hits = PRODUCTS.filter(p=>(p.title+' '+p.vendor+' '+p.type+' '+p.tags.join(' ')).toLowerCase().includes(v)).slice(0,8);
    box.innerHTML = hits.length ? hits.map(p=>`<a href="${R}products/${p.handle}.html"><img src="${p.images[0]||''}"><span>${p.title}</span><b style="margin-left:auto">${p.price?money(p.price):''}</b></a>`).join('')
      : '<a><span>No results</span></a>';
    box.style.display='block';
  });
  document.addEventListener('click', e=>{ if(!e.target.closest('.hdr')) box.style.display='none'; });
}

function initMarketplaceHome(){
  const list = document.getElementById('market-list');
  if(!list) return;

  const categoryList = document.getElementById('market-category-list');
  const searchInput = document.getElementById('market-search-input');
  const resultsCount = document.getElementById('market-results-count');
  const catalogCount = document.getElementById('store-catalog-count');
  const inStockCount = document.getElementById('in-stock-count');
  const allListingsCount = document.getElementById('all-listings-count');
  const buyNowCount = document.getElementById('buy-now-count');
  const pager = document.getElementById('market-pager');
  const sortSelect = document.getElementById('market-sort');
  const viewToggle = document.getElementById('market-view-toggle');
  const state = { query:'', category:'', inStock:false, sale:false, shipping:false, format:'all', priceBand:'', min:null, max:null, sort:'match', page:1, compact:false, includeDescription:false };
  const pageSize = 24;

  const productText = (product) => [
    product.title, product.vendor, product.type, product.sku, product.ebayItemId,
    ...(Array.isArray(product.tags) ? product.tags : []),
    state.includeDescription ? product.desc_text : '',
  ].filter(Boolean).join(' ').toLowerCase();
  const categories = [...new Map(PRODUCTS.map((product) => [product.type || 'All Products', 0])).keys()]
    .sort((a, b) => a.localeCompare(b));

  catalogCount.textContent = PRODUCTS.length.toLocaleString('en-US');
  allListingsCount.textContent = `(${PRODUCTS.length.toLocaleString('en-US')})`;
  buyNowCount.textContent = `(${PRODUCTS.length.toLocaleString('en-US')})`;
  inStockCount.textContent = `(${PRODUCTS.filter((product) => product.available !== false).length.toLocaleString('en-US')})`;
  categoryList.innerHTML = [
    `<button class="category-link active" data-category="" type="button">All products <span>(${PRODUCTS.length})</span></button>`,
    ...categories.map((category) => {
      const count = PRODUCTS.filter((product) => (product.type || 'All Products') === category).length;
      return `<button class="category-link" data-category="${escapeHtml(category)}" type="button">${escapeHtml(category)} <span>(${count})</span></button>`;
    }),
  ].join('');

  function filteredProducts(){
    const min = Number.isFinite(state.min) ? state.min : null;
    const max = Number.isFinite(state.max) ? state.max : null;
    const filtered = PRODUCTS.filter((product) => {
      const price = Number(product.price || 0);
      if(state.category && (product.type || 'All Products') !== state.category) return false;
      if(state.query && !productText(product).includes(state.query)) return false;
      if(state.inStock && product.available === false) return false;
      if(state.format === 'buy' && product.available === false) return false;
      if(state.sale && !product.compare) return false;
      if(state.shipping && product.shipping === false) return false;
      if(state.priceBand === 'under' && price >= 500) return false;
      if(state.priceBand === 'mid' && (price < 500 || price > 2000)) return false;
      if(state.priceBand === 'over' && price <= 2000) return false;
      if(min !== null && price < min) return false;
      if(max !== null && price > max) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if(state.sort === 'price-low') return Number(a.price || 0) - Number(b.price || 0);
      if(state.sort === 'price-high') return Number(b.price || 0) - Number(a.price || 0);
      if(state.sort === 'title') return String(a.title).localeCompare(String(b.title));
      return String(a.title).localeCompare(String(b.title));
    });
  }

  function productHref(product){
    return `${R}products/${encodeURIComponent(product.handle)}.html`;
  }

  function renderPager(totalPages){
    if(totalPages <= 1){ pager.innerHTML = ''; return; }
    const buttons = [];
    for(let page = 1; page <= totalPages; page += 1){
      if(page === 1 || page === totalPages || Math.abs(page - state.page) <= 1){
        buttons.push(`<button class="page-btn${page === state.page ? ' active' : ''}" data-page="${page}" type="button">${page}</button>`);
      } else if(buttons[buttons.length - 1] !== '<span class="page-gap">…</span>') {
        buttons.push('<span class="page-gap">…</span>');
      }
    }
    pager.innerHTML = `<button class="page-btn" data-page="${Math.max(1, state.page - 1)}" type="button" ${state.page === 1 ? 'disabled' : ''}>‹</button>${buttons.join('')}<button class="page-btn" data-page="${Math.min(totalPages, state.page + 1)}" type="button" ${state.page === totalPages ? 'disabled' : ''}>›</button>`;
  }

  function render(){
    const products = filteredProducts();
    const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
    state.page = Math.min(state.page, totalPages);
    const pageItems = products.slice((state.page - 1) * pageSize, state.page * pageSize);
    resultsCount.textContent = products.length.toLocaleString('en-US');
    list.classList.toggle('compact', state.compact);
    if(!pageItems.length){
      list.innerHTML = `<div class="market-empty"><strong>No products match these filters.</strong><span>Clear a filter or try a broader search.</span><button class="filter-apply" id="empty-clear" type="button">Clear filters</button></div>`;
    } else {
      list.innerHTML = pageItems.map((product) => {
        const image = product.images?.[0] || imgFallback;
        const price = money(Number(product.price || 0));
        const compare = product.compare ? `<div class="market-old">${money(Number(product.compare))}</div>` : '';
        const status = product.available === false ? 'Out of stock' : 'In stock';
        return `<article class="market-row">
          <a class="market-row-img" href="${productHref(product)}"><img loading="lazy" src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}"></a>
          <div class="market-row-body">
            <div class="market-row-kicker">${escapeHtml(product.vendor || 'PATZCOM')} · ${escapeHtml(product.type || 'Automotive parts')}</div>
            <h3><a href="${productHref(product)}">${escapeHtml(product.title)}</a></h3>
            <div class="market-sub">Brand New · ${escapeHtml(status)}</div>
            <div class="market-price">${price}</div>
            ${compare}
            <div class="market-extra"><span>Buy it now</span><span>International shipping available</span><span>Secure checkout</span></div>
          </div>
          <div class="market-row-meta"><div>Ships from <strong>South Korea</strong></div><div>PATZCOM direct catalog</div>${product.sku ? `<div>SKU ${escapeHtml(product.sku)}</div>` : ''}</div>
        </article>`;
      }).join('');
    }
    renderPager(totalPages);
  }

  function clearFilters(){
    state.query = ''; state.category = ''; state.inStock = false; state.sale = false; state.shipping = false; state.format = 'all'; state.priceBand = ''; state.min = null; state.max = null; state.page = 1;
    if(searchInput) searchInput.value = '';
    document.querySelectorAll('#filter-in-stock,#filter-shipping,#filter-sale').forEach((input) => { input.checked = false; });
    document.querySelectorAll('input[name="price-band"], input[name="bf"]').forEach((input) => { input.checked = input.value === 'all'; });
    document.getElementById('min-price').value = ''; document.getElementById('max-price').value = '';
    document.querySelectorAll('.category-link').forEach((button) => button.classList.toggle('active', !button.dataset.category));
    document.querySelectorAll('.market-pills .pill').forEach((button) => button.classList.toggle('active', button.dataset.format === 'all' && !button.dataset.stock && !button.dataset.sale));
    render();
  }

  categoryList.addEventListener('click', (event) => {
    const button = event.target.closest('.category-link');
    if(!button) return;
    state.category = button.dataset.category || ''; state.page = 1;
    document.querySelectorAll('.category-link').forEach((item) => item.classList.toggle('active', item === button));
    render();
  });
  searchInput?.addEventListener('input', () => { state.query = searchInput.value.trim().toLowerCase(); state.page = 1; render(); });
  document.getElementById('include-description')?.addEventListener('change', (event) => { state.includeDescription = event.target.checked; render(); });
  document.getElementById('filter-in-stock')?.addEventListener('change', (event) => { state.inStock = event.target.checked; state.page = 1; render(); });
  document.getElementById('filter-shipping')?.addEventListener('change', (event) => { state.shipping = event.target.checked; state.page = 1; render(); });
  document.getElementById('filter-sale')?.addEventListener('change', (event) => { state.sale = event.target.checked; state.page = 1; render(); });
  document.querySelectorAll('input[name="price-band"]').forEach((input) => input.addEventListener('change', () => { state.priceBand = input.checked ? input.value : ''; state.page = 1; render(); }));
  document.querySelectorAll('input[name="bf"]').forEach((input) => input.addEventListener('change', () => { if(input.checked){ state.format = input.value; state.page = 1; render(); } }));
  document.getElementById('apply-price')?.addEventListener('click', () => {
    const minValue = Number(document.getElementById('min-price').value); const maxValue = Number(document.getElementById('max-price').value);
    state.min = Number.isFinite(minValue) && minValue >= 0 ? minValue : null; state.max = Number.isFinite(maxValue) && maxValue >= 0 ? maxValue : null; state.page = 1; render();
  });
  document.getElementById('clear-filters')?.addEventListener('click', (event) => { event.preventDefault(); clearFilters(); });
  document.querySelector('.market-pills')?.addEventListener('click', (event) => {
    const button = event.target.closest('.pill'); if(!button) return;
    state.format = button.dataset.format || 'all'; state.inStock = button.dataset.stock === 'true'; state.sale = button.dataset.sale === 'true'; state.page = 1;
    document.querySelectorAll('.market-pills .pill').forEach((item) => item.classList.toggle('active', item === button)); render();
  });
  sortSelect?.addEventListener('change', () => { state.sort = sortSelect.value; state.page = 1; render(); });
  viewToggle?.addEventListener('click', () => { state.compact = !state.compact; viewToggle.setAttribute('aria-pressed', String(state.compact)); render(); });
  pager.addEventListener('click', (event) => { const button = event.target.closest('[data-page]'); if(!button || button.disabled) return; state.page = Number(button.dataset.page); render(); window.scrollTo({ top: list.offsetTop - 120, behavior: 'smooth' }); });
  list.addEventListener('click', (event) => { if(event.target.closest('#empty-clear')) clearFilters(); });
  document.getElementById('header-search-btn')?.addEventListener('click', () => { if(searchInput){ searchInput.value = document.getElementById('q').value; state.query = searchInput.value.trim().toLowerCase(); state.page = 1; render(); document.getElementById('market-list').scrollIntoView({behavior:'smooth', block:'start'}); } });
  render();
}

function renderCart(){
  const body = document.getElementById('cartbody'); if(!body) return;
  const c = cart(); const ids = Object.keys(c);
  if(!ids.length){ body.innerHTML = `<p class="muted">Your cart is empty. <a href="${R}collections/all.html" style="color:var(--acc)">Continue shopping →</a></p>`; return; }
  let total = 0;
  body.innerHTML = ids.map(id=>{
    const p = PRODUCTS.find(x=>x.id===id); if(!p) return '';
    total += (p.price||0)*c[id];
    return `<div class="crow"><img src="${p.images[0]||''}">
      <div><a href="${R}products/${p.handle}.html">${p.title}</a><div class="vendor">${p.vendor}</div></div>
      <div>${money(p.price||0)}</div>
      <input type="number" min="1" value="${c[id]}" onchange="setQty('${id}',this.value)">
      <button class="rm" onclick="setQty('${id}',0)">×</button></div>`;
  }).join('');
  const cfg = window.PATZCOM_CONFIG||{};
  total += (cfg.shippingFlat||0);
  document.getElementById('total').textContent = money(total);
  document.getElementById('checkout').style.display='block';
  mountPayments(total);
}
function setQty(id,v){ const c=cart(); v=parseInt(v)||0; if(v<=0) delete c[id]; else c[id]=v; saveCart(c); renderCart(); }

let paymentConfigPromise;
function paymentItems(){
  return Object.entries(cart()).map(([id, quantity]) => ({ id, quantity: Number(quantity) }));
}

function setPaymentStatus(message, kind = ''){
  const el = document.getElementById('payment-status');
  if(!el) return;
  el.className = `payment-status${kind ? ` ${kind}` : ''}`;
  el.textContent = message;
}

function loadPaymentConfig(){
  if(!paymentConfigPromise){
    paymentConfigPromise = fetch(`${R}api/payments/config`, { cache:'no-store' }).then((response) => {
      if(!response.ok) throw new Error('Payment configuration could not be loaded.');
      return response.json();
    });
  }
  return paymentConfigPromise;
}

function loadPayPalSdk(clientId, currency){
  if(window.paypal) return Promise.resolve(window.paypal);
  if(window.__paypalSdkPromise) return window.__paypalSdkPromise;
  window.__paypalSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency || 'USD')}&intent=capture`;
    script.onload = () => window.paypal ? resolve(window.paypal) : reject(new Error('PayPal SDK did not load.'));
    script.onerror = () => reject(new Error('PayPal SDK could not be loaded.'));
    document.head.appendChild(script);
  });
  return window.__paypalSdkPromise;
}

async function mountPayments(total){
  const paypalEl = document.getElementById('paypal-button-container');
  const stripeEl = document.getElementById('stripe-checkout-container');
  if(!paypalEl || !stripeEl) return;
  paypalEl.innerHTML = '<div class="payment-loading">Loading secure PayPal checkout…</div>';
  stripeEl.innerHTML = '';
  try {
    const config = await loadPaymentConfig();
    const items = paymentItems();
    if(config.paypal?.enabled && config.paypal.clientId){
      const paypal = await loadPayPalSdk(config.paypal.clientId, config.currency);
      paypalEl.innerHTML = '';
      paypal.Buttons({
        style: { layout:'vertical', shape:'rect', label:'paypal', tagline:false },
        createOrder: async () => {
          const response = await fetch(`${R}api/paypal/orders`, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ items }),
          });
          const payload = await response.json();
          if(!response.ok || !payload.id) throw new Error(payload.message || 'PayPal order could not be created.');
          return payload.id;
        },
        onApprove: async (data) => {
          setPaymentStatus('Confirming your PayPal payment…');
          const response = await fetch(`${R}api/paypal/orders/${encodeURIComponent(data.orderID)}/capture`, { method:'POST' });
          const payload = await response.json();
          if(!response.ok || payload.status !== 'COMPLETED') throw new Error(payload.message || 'PayPal payment could not be completed.');
          localStorage.removeItem(CART_KEY);
          setPaymentStatus('Payment confirmed. Thank you for your order.', 'success');
          setTimeout(() => { location.href = `${R}payment-success.html?provider=paypal&order_id=${encodeURIComponent(payload.id)}`; }, 500);
        },
        onCancel: () => setPaymentStatus('PayPal checkout was cancelled. Your cart is still saved.'),
        onError: (error) => setPaymentStatus(error?.message || 'PayPal checkout is temporarily unavailable.', 'error'),
      }).render('#paypal-button-container');
    } else {
      paypalEl.innerHTML = '<div class="payment-unavailable"><strong>PayPal is not configured yet.</strong><span>The primary checkout will appear after the PayPal Live credentials are added in Railway.</span></div>';
    }

    if(config.stripe?.enabled){
      stripeEl.innerHTML = '<button class="stripe-checkout-btn" type="button"><span class="stripe-mark">S</span><span>Pay with card</span><small>Secure checkout by Stripe</small></button>';
      stripeEl.querySelector('button').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        setPaymentStatus('Opening secure card checkout…');
        try {
          const response = await fetch(`${R}api/stripe/checkout-session`, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ items: paymentItems() }),
          });
          const payload = await response.json();
          if(!response.ok || !payload.url) throw new Error(payload.message || 'Stripe checkout could not be started.');
          location.href = payload.url;
        } catch(error) {
          button.disabled = false;
          setPaymentStatus(error.message, 'error');
        }
      });
    } else {
      stripeEl.innerHTML = '<div class="payment-unavailable"><strong>Stripe card checkout is ready to activate.</strong><span>Add STRIPE_SECRET_KEY in Railway to enable secure Visa, Mastercard, and American Express checkout.</span></div>';
    }
  } catch(error) {
    paypalEl.innerHTML = '<div class="payment-unavailable"><strong>Secure checkout is temporarily unavailable.</strong><span>Please try again shortly or contact PATZCOM support.</span></div>';
    stripeEl.innerHTML = '';
    setPaymentStatus(error.message, 'error');
  }
}

function initQandA(){
  let mount = document.querySelector('.qa-mount');
  const isProductPage = Boolean(document.querySelector('.pwrap'));
  const isCollectionPage = Boolean(document.querySelector('.grid') && document.querySelector('.crumbs'));
  if(!mount && (isProductPage || isCollectionPage)){
    mount = document.createElement('div');
    mount.className = 'qa-mount';
    mount.dataset.mode = isProductPage ? 'product' : 'category';
    if(isProductPage){
      const page = document.querySelector('.pwrap') || document.querySelector('.wrap.page') || document.body;
      page.insertAdjacentElement('afterend', mount);
    } else {
      const ref = document.querySelector('.sec .wrap');
      ref ? ref.parentElement.insertAdjacentElement('afterend', mount) : document.body.appendChild(mount);
    }
  }
  if(!mount) return;

  const pageMode = mount.dataset.mode || 'category';
  const presetHandle = mount.dataset.product || '';
  const presetCategory = mount.dataset.category || '';
  const categories = [...new Set(PRODUCTS.map(p => p.type))].sort();
  const products = PRODUCTS.slice().sort((a, b) => a.title.localeCompare(b.title));

  mount.innerHTML = `
    <section class="qa-panel">
      <div class="qa-head">
        <div>
          <p class="eyebrow">Q&amp;A</p>
          <h2>Ask about a product before you buy</h2>
          <p class="muted">Pick a category, choose a product, and leave a question. Saved questions appear here for easy review.</p>
        </div>
      </div>
      <div class="qa-grid">
        <label>
          <span>Category</span>
          <select id="qa-category">
            <option value="">All categories</option>
            ${categories.map(c => `<option value="${escapeHtml(c)}" ${c === presetCategory ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>Product</span>
          <select id="qa-product"></select>
        </label>
      </div>
      <label class="qa-question">
        <span>Your question</span>
        <textarea id="qa-text" rows="4" placeholder="Example: Does this fit a 2024 Telluride with OEM suspension?"></textarea>
      </label>
      <div class="qa-actions">
        <button class="btn add" id="qa-submit" type="button">Post Question</button>
        <p class="muted" id="qa-hint">${pageMode === 'product' ? 'This question is tied to the current product.' : 'Questions are stored locally in this browser for now.'}</p>
      </div>
      <div class="qa-list" id="qa-list"></div>
    </section>
  `;

  const categoryEl = document.getElementById('qa-category');
  const productEl = document.getElementById('qa-product');
  const questionEl = document.getElementById('qa-text');
  const listEl = document.getElementById('qa-list');
  const submitEl = document.getElementById('qa-submit');

  function optionsForCategory(category){
    const filtered = category ? products.filter(p => p.type === category) : products;
    productEl.innerHTML = filtered.map(p => `<option value="${escapeHtml(p.handle)}">${escapeHtml(p.title)}</option>`).join('');
    if(presetHandle && filtered.some(p => p.handle === presetHandle)) productEl.value = presetHandle;
    if(!productEl.value && filtered[0]) productEl.value = filtered[0].handle;
    renderQuestions();
  }

  function renderQuestions(){
    const handle = productEl.value;
    const product = PRODUCTS.find(p => p.handle === handle);
    const qs = JSON.parse(localStorage.getItem(qaKey(handle)) || '[]');
    listEl.innerHTML = product ? `
      <div class="qa-product-title">
        <strong>${escapeHtml(product.title)}</strong>
        <span>${escapeHtml(product.type)}</span>
      </div>
      ${qs.length ? qs.map(q => `
        <article class="qa-item">
          <div class="qa-q">${escapeHtml(q.text)}</div>
          <div class="qa-meta">Asked ${escapeHtml(q.date)}</div>
        </article>
      `).join('') : '<div class="qa-empty">No questions yet. Be the first to ask.</div>'}
    ` : '<div class="qa-empty">Choose a product to view and ask questions.</div>';
  }

  categoryEl.addEventListener('change', () => optionsForCategory(categoryEl.value));
  productEl.addEventListener('change', renderQuestions);
  submitEl.addEventListener('click', () => {
    const text = questionEl.value.trim();
    const handle = productEl.value;
    if(!text || !handle) return;
    const qs = JSON.parse(localStorage.getItem(qaKey(handle)) || '[]');
    qs.unshift({ text, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) });
    localStorage.setItem(qaKey(handle), JSON.stringify(qs.slice(0, 20)));
    questionEl.value = '';
    renderQuestions();
  });

  optionsForCategory(presetCategory);
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

function installImageFallbacks(){
  document.addEventListener('error', e => {
    const img = e.target;
    if(!(img instanceof HTMLImageElement)) return;
    if(img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = '1';
    img.src = imgFallback;
    img.alt = img.alt || 'Image unavailable';
    img.style.objectFit = 'cover';
  }, true);
}

function initProductPurchaseUI(){
  const pdp = document.querySelector('.pdp');
  const buy = document.querySelector('.pdp .buy');
  if(!pdp || !buy) return;

  document.body.classList.add('detail-white-page');

  if(!document.querySelector('.detail-banner')){
    const heading = buy.querySelector('h1')?.textContent?.trim() || 'PATZCOM product detail';
    const banner = document.createElement('div');
    banner.className = 'detail-banner wrap';
    banner.innerHTML = `<h1>Product details</h1><p>${escapeHtml(heading)}</p>`;
    document.querySelector('.crumbs')?.insertAdjacentElement('beforebegin', banner);
  }

  if(!buy.querySelector('.fit-card')){
    buy.insertAdjacentHTML('afterbegin', `
      <div class="fit-card">
        <div class="fit-icon">VIN</div>
        <div>
          <div class="fit-title">Check if this fits your vehicle</div>
          <div class="fit-sub">Add your vehicle for a faster compatibility check.</div>
        </div>
      </div>
      <div class="fit-grid">
        <input type="text" placeholder="Year">
        <input type="text" placeholder="Make">
        <input type="text" placeholder="Model">
        <input type="text" placeholder="Trim">
        <input type="text" placeholder="Engine">
        <button type="button" class="fit-btn">Add vehicle</button>
      </div>
    `);
  }

  if(!buy.querySelector('.store-line')){
    const vendor = buy.querySelector('.vendor')?.textContent?.trim() || 'PATZCOM';
    const title = buy.querySelector('h1');
    title?.insertAdjacentHTML('afterend', `
      <div class="store-line">
        <div class="store-mark">P</div>
        <div>
          <strong>PATZCOM</strong> <span>(1220)</span>
          <div class="store-note">100% positive · ${escapeHtml(vendor)} parts · message seller</div>
        </div>
      </div>
    `);
  }

  const price = buy.querySelector('.price.big');
  if(price && !buy.querySelector('.tax-note')){
    price.insertAdjacentHTML('afterend', '<div class="tax-note">Taxes may apply. Final total is shown at checkout.</div>');
  }

  if(!buy.querySelector('.pay-panel')){
    const tags = buy.querySelector('.tags');
    const panel = `
      <div class="pay-panel">
        <div class="pay-title">Payments</div>
        <div class="pay-row"><span>PayPal</span><strong>Primary checkout</strong></div>
        <div class="pay-row"><span>Stripe</span><strong>Card checkout ready</strong></div>
        <div class="pay-row"><span>Secure checkout</span><strong>Buyer protected</strong></div>
      </div>
      <div class="policy-box">
        <div class="policy-title">Shipping, returns and payments</div>
        <div class="policy-copy">Free FedEx shipping, 30-day returns, and secure payment flow are shown before checkout.</div>
      </div>
    `;
    tags ? tags.insertAdjacentHTML('beforebegin', panel) : buy.insertAdjacentHTML('beforeend', panel);
  }
}

function initVideoPlaceholders(){
  document.querySelectorAll('.desc video, .fr-video video').forEach(video => {
    const src = video.querySelector('source')?.getAttribute('src') || video.getAttribute('src') || '';
    const sourceLooksInvalid = !src || /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(src);
    if(!sourceLooksInvalid) return;

    const wrapper = video.closest('.fr-video') || video;
    const placeholder = document.createElement('div');
    placeholder.className = 'video-slot';
    placeholder.innerHTML = `
      <div class="video-frame">
        <div class="video-icon">▶</div>
        <div class="video-copy">Video unavailable</div>
        <div class="video-subcopy">This product video is not embedded in the current catalog build.</div>
      </div>
    `;
    wrapper.replaceWith(placeholder);
  });
}

function initCollectionWhiteUI(){
  const isCollectionPage = Boolean(document.querySelector('.grid') && document.querySelector('.crumbs'));
  if(!isCollectionPage) return;
  document.body.classList.add('collection-white-body');
}

function initQandAFromGeneratedPage(){
  let mount = document.querySelector('.qa-mount');
  const isProductPage = Boolean(document.querySelector('.pwrap'));
  const isCollectionPage = Boolean(document.querySelector('.grid') && document.querySelector('.crumbs'));
  if(!mount && (isProductPage || isCollectionPage)){
    mount = document.createElement('div');
    mount.className = 'qa-mount';
    mount.dataset.mode = isProductPage ? 'product' : 'category';
    if(isProductPage){
      const page = document.querySelector('.pwrap') || document.querySelector('.wrap.page') || document.body;
      page.insertAdjacentElement('afterend', mount);
    } else {
      const ref = document.querySelector('.sec .wrap');
      ref ? ref.parentElement.insertAdjacentElement('afterend', mount) : document.body.appendChild(mount);
    }
  }
  if(!mount) return;

  const pageMode = mount.dataset.mode || 'category';
  const presetHandle = mount.dataset.product || '';
  const presetCategory = mount.dataset.category || '';

  const categories = [...new Set(PRODUCTS.map(p => p.type))].sort();
  const products = PRODUCTS.slice().sort((a, b) => a.title.localeCompare(b.title));

  mount.innerHTML = `
    <section class="qa-panel">
      <div class="qa-head">
        <div>
          <p class="eyebrow">Q&amp;A</p>
          <h2>Ask about a product before you buy</h2>
          <p class="muted">Pick a category, choose a product, and leave a question. Saved answers are shown on the page for easy review.</p>
        </div>
      </div>
      <div class="qa-grid">
        <label>
          <span>Category</span>
          <select id="qa-category">
            <option value="">All categories</option>
            ${categories.map(c => `<option value="${escapeHtml(c)}" ${c === presetCategory ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>Product</span>
          <select id="qa-product"></select>
        </label>
      </div>
      <label class="qa-question">
        <span>Your question</span>
        <textarea id="qa-text" rows="4" placeholder="Example: Does this fit a 2024 Telluride with OEM suspension?"></textarea>
      </label>
      <div class="qa-actions">
        <button class="btn add" id="qa-submit" type="button">Post Question</button>
        <p class="muted" id="qa-hint">Questions are stored locally in this browser for now.</p>
      </div>
      <div class="qa-list" id="qa-list"></div>
    </section>
  `;

  const categoryEl = document.getElementById('qa-category');
  const productEl = document.getElementById('qa-product');
  const questionEl = document.getElementById('qa-text');
  const listEl = document.getElementById('qa-list');
  const submitEl = document.getElementById('qa-submit');

  function optionsForCategory(category){
    const filtered = category ? products.filter(p => p.type === category) : products;
    productEl.innerHTML = filtered.map(p => `<option value="${escapeHtml(p.handle)}">${escapeHtml(p.title)}</option>`).join('');
    if(presetHandle && filtered.some(p => p.handle === presetHandle)) productEl.value = presetHandle;
    if(!productEl.value && filtered[0]) productEl.value = filtered[0].handle;
    renderQuestions();
  }

  function renderQuestions(){
    const handle = productEl.value;
    const product = PRODUCTS.find(p => p.handle === handle);
    const qs = JSON.parse(localStorage.getItem(qaKey(handle)) || '[]');
    listEl.innerHTML = product ? `
      <div class="qa-product-title">
        <strong>${escapeHtml(product.title)}</strong>
        <span>${escapeHtml(product.type)}</span>
      </div>
      ${qs.length ? qs.map(q => `
        <article class="qa-item">
          <div class="qa-q">${escapeHtml(q.text)}</div>
          <div class="qa-meta">Asked ${escapeHtml(q.date)}</div>
        </article>
      `).join('') : '<div class="qa-empty">No questions yet. Be the first to ask.</div>'}
    ` : '<div class="qa-empty">Choose a product to view and ask questions.</div>';
  }

  categoryEl.addEventListener('change', () => optionsForCategory(categoryEl.value));
  productEl.addEventListener('change', renderQuestions);
  submitEl.addEventListener('click', () => {
    const text = questionEl.value.trim();
    if(!text) return;
    const handle = productEl.value;
    if(!handle) return;
    const qs = JSON.parse(localStorage.getItem(qaKey(handle)) || '[]');
    qs.unshift({ text, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) });
    localStorage.setItem(qaKey(handle), JSON.stringify(qs.slice(0, 20)));
    questionEl.value = '';
    renderQuestions();
  });

  optionsForCategory(presetCategory);
}

function escapeHtmlFromGeneratedPage(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
