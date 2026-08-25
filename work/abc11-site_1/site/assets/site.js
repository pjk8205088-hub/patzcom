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

fetch(R+'assets/products.json').then(r=>r.json()).then(p=>{ PRODUCTS=p; initSearch(); renderCart(); });
paintCount();
initQandA();
installImageFallbacks();
initProductPurchaseUI();

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
  mountPaypal(total);
}
function setQty(id,v){ const c=cart(); v=parseInt(v)||0; if(v<=0) delete c[id]; else c[id]=v; saveCart(c); renderCart(); }

function mountPaypal(total){
  const cfg = window.PATZCOM_CONFIG||{}, el = document.getElementById('paypal-button-container');
  if(!cfg.paypalClientId){ el.innerHTML = '<div class="muted" style="border:1px dashed var(--line);padding:14px;border-radius:8px">PayPal checkout is being prepared first and is not configured yet. Add your PayPal live client ID in <code>assets/config.js</code>. Stripe card checkout is planned as the second option after the PATZCOM U.S. Stripe/Atlas setup is confirmed.</div>'; return; }
  if(window.paypal){ return draw(); }
  const s=document.createElement('script');
  s.src=`https://www.paypal.com/sdk/js?client-id=${cfg.paypalClientId}&currency=${cfg.currency||'USD'}`;
  s.onload=draw; document.head.appendChild(s);
  function draw(){
    el.innerHTML='';
    paypal.Buttons({
      createOrder:(d,a)=>a.order.create({purchase_units:[{amount:{value:total.toFixed(2)}}]}),
      onApprove:(d,a)=>a.order.capture().then(()=>{ localStorage.removeItem(CART_KEY); alert('Thank you! Your order is confirmed.'); location.href=R+'index.html'; })
    }).render('#paypal-button-container');
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

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
