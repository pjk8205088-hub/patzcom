const $ = id => document.getElementById(id);
let items = [], revision = '', editing = null, saving = false, selected = new Set();
const form = $('form');
const field = name => form.elements.namedItem(name);
function imageUrl(value) {
  if (/^assets\/img\/[a-zA-Z0-9._-]+$/.test(value)) return '/' + value;
  try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
}
function quantityFor(product) {
  if (Number.isInteger(product.quantity)) return product.quantity;
  const imported = product.desc_html?.match(/Available quantity:<\/strong>\s*(\d+)/i)?.[1];
  return imported ? Number(imported) : product.available ? 1 : 0;
}
function render() {
  const term = $('search').value.trim().toLowerCase();
  const mode = $('filter').value;
  const filtered = items.filter(p => [p.title,p.sku,p.id].join(' ').toLowerCase().includes(term) && (mode === 'all' || Boolean(p.available) === (mode === 'active')));
  $('count').textContent = `(${items.length})`;
  $('status').textContent = `${filtered.length} listings shown`;
  $('rows').replaceChildren();
  for (const p of filtered) {
    const row = document.createElement('tr');
    const cells = Array.from({length:8}, () => row.appendChild(document.createElement('td')));
    const check = document.createElement('input'); check.type='checkbox'; check.checked=selected.has(p.id); check.setAttribute('aria-label', `Select ${p.title}`); check.onchange=()=>{check.checked?selected.add(p.id):selected.delete(p.id);updateSelection(filtered);}; cells[0].append(check);
    const url = imageUrl(p.images?.[0] || '');
    if (url) { const img = document.createElement('img'); img.src=url; img.alt=''; img.loading='lazy'; cells[1].append(img); }
    const link = document.createElement('a'); link.textContent=p.title; link.href=`/products/${encodeURIComponent(p.handle)}.html`; cells[1].append(link);
    cells[2].textContent=p.sku || 'No SKU'; const id=document.createElement('small'); id.textContent=p.id; cells[2].append(id);
    cells[3].textContent=p.type; cells[4].textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(p.price);
    cells[5].textContent=String(quantityFor(p)); cells[6].textContent=p.available ? 'Active' : 'Paused';
    const actions=document.createElement('div');actions.className='row-actions';
    const edit=document.createElement('button'); edit.className='secondary'; edit.textContent='Edit'; edit.onclick=()=>openEditor(p); actions.append(edit);
    const duplicate=document.createElement('button');duplicate.className='secondary';duplicate.textContent='Sell similar';duplicate.onclick=()=>openEditor(p,{duplicate:true});actions.append(duplicate);
    const toggle=document.createElement('button');toggle.className='secondary';toggle.textContent=p.available?'Pause':'Activate';toggle.onclick=()=>saveAvailability(p,!p.available);actions.append(toggle);
    cells[7].append(actions);
    $('rows').append(row);
  }
  updateSelection(filtered);
}
function updateSelection(filtered = items) {
  const visibleIds=filtered.map(p=>p.id);
  const visibleSelected=visibleIds.filter(id=>selected.has(id)).length;
  $('selection-count').textContent=`${selected.size} selected`;
  $('select-all').checked=visibleIds.length>0&&visibleSelected===visibleIds.length;
  $('select-all').indeterminate=visibleSelected>0&&visibleSelected<visibleIds.length;
  $('bulk-activate').disabled=selected.size===0||saving;
  $('bulk-pause').disabled=selected.size===0||saving;
}
async function load() {
  $('status').textContent='Loading listings...';
  try {
    const response=await fetch('/api/admin/products',{cache:'no-store'});
    if(response.status===401){location.href='/admin-login.html';return;}
    const data=await response.json(); if(!response.ok) throw new Error(data.error || 'Unable to load listings.');
    items=data.items;revision=data.revision;selected=new Set([...selected].filter(id=>items.some(p=>p.id===id)));render();$('create').disabled=false;$('export').disabled=false;
    $('categories').replaceChildren(...[...new Set(items.map(p=>p.type))].sort().map(type=>{const option=document.createElement('option');option.value=type;return option;}));
  } catch(error){$('status').textContent=error.message;}
}
function preview(){
  $('previews').replaceChildren();
  for(const value of field('images').value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,30)){
    const url=imageUrl(value);if(!url)continue;
    const img=document.createElement('img');img.src=url;img.alt='Product image preview';img.onerror=()=>{img.alt='Image unavailable';};$('previews').append(img);
  }
}
function openEditor(product,{duplicate=false}={}){
  editing=duplicate?null:product; form.reset();$('upload-status').textContent='';$('form-status').textContent='';$('editor-title').textContent=duplicate?'Create similar listing':product?'Edit listing':'Create listing';
  for(const name of ['title','sku','vendor','type','price','desc_text'])field(name).value=product?.[name] ?? '';
  if(duplicate){field('title').value=`${product.title} (Copy)`.slice(0,300);field('sku').value='';}
  field('condition').value=product?.condition || 'new';field('quantity').value=product?quantityFor(product):1;
  field('images').value=(product?.images || []).join('\n');field('available').checked=product?.available ?? true;
  preview();$('editor').showModal();field('title').focus();
}
$('create').onclick=()=>openEditor(null);$('cancel').onclick=()=>{if(!saving)$('editor').close();};
$('editor').addEventListener('cancel',event=>{if(saving)event.preventDefault();});
$('search').oninput=render;$('filter').onchange=render;$('reload').onclick=load;field('images').onchange=preview;
$('select-all').onchange=()=>{const term=$('search').value.trim().toLowerCase(),mode=$('filter').value;const visible=items.filter(p=>[p.title,p.sku,p.id].join(' ').toLowerCase().includes(term)&&(mode==='all'||Boolean(p.available)===(mode==='active')));for(const p of visible)$('select-all').checked?selected.add(p.id):selected.delete(p.id);render();};
async function saveAvailability(product,available){
  if(saving)return;saving=true;updateSelection();
  try{const next={...product,available,quantity:available?Math.max(1,Number(product.quantity)||1):0};const response=await fetch('/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:product.id,revision,product:next})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to update listing.');await load();$('status').textContent=`${available?'Listing activated':'Listing paused'} on PATZCOM. eBay was not changed.`;}
  catch(error){$('status').textContent=error.message;}finally{saving=false;render();}
}
async function saveBulkAvailability(available){
  if(saving||!selected.size)return;saving=true;const ids=[...selected];updateSelection();$('status').textContent=`Updating ${ids.length} listings...`;
  try{for(const id of ids){const product=items.find(item=>item.id===id);if(!product)continue;const response=await fetch('/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,revision,product:{...product,available,quantity:available?Math.max(1,Number(product.quantity)||1):0}})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Bulk update failed.');revision=result.revision;}selected.clear();await load();$('status').textContent=`${ids.length} listings ${available?'activated':'paused'} on PATZCOM.`;}
  catch(error){await load();$('status').textContent=`${error.message} Some earlier selections may already have been updated.`;}finally{saving=false;render();}
}
$('bulk-activate').onclick=()=>saveBulkAvailability(true);$('bulk-pause').onclick=()=>saveBulkAvailability(false);
$('upload').onchange=async()=>{
  const files=[...$('upload').files];
  const current=field('images').value.split('\n').filter(s=>s.trim());
  if(files.length+current.length>30){$('upload-status').textContent='Use up to 30 photos per listing.';return;}
  saving=true;$('save').disabled=true;$('cancel').disabled=true;$('upload').disabled=true;
  try{
    for(const file of files){
      if(file.size>5*1024*1024)throw new Error(`${file.name}: maximum photo size is 5 MB.`);
      $('upload-status').textContent=`Uploading ${file.name}...`;
      const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Unable to read photo.'));reader.readAsDataURL(file);});
      const response=await fetch('/api/admin/product-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base64})});
      const result=await response.json();if(!response.ok)throw new Error(result.error || 'Upload failed.');
      field('images').value=[field('images').value.trim(),result.url].filter(Boolean).join('\n');preview();
    }
    $('upload-status').textContent='Photos uploaded. Save the listing to publish them.';
  }catch(error){$('upload-status').textContent=error.message;}
  finally{saving=false;$('save').disabled=false;$('cancel').disabled=false;$('upload').disabled=false;$('upload').value='';}
};
$('export').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(items,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='patzcom-catalog-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
form.onsubmit=async event=>{
  event.preventDefault();if(saving)return;
  const product=Object.fromEntries(['title','sku','vendor','type','desc_text'].map(name=>[name,field(name).value]));
  product.price=Number(field('price').value);product.condition=field('condition').value;product.quantity=Number(field('quantity').value);product.available=field('available').checked&&product.quantity>0;product.images=field('images').value.split('\n').map(s=>s.trim()).filter(Boolean);
  saving=true;$('save').disabled=true;$('cancel').disabled=true;$('form-status').textContent='Saving and rebuilding pages...';
  try{
    const response=await fetch('/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editing?.id,revision,product})});
    const result=await response.json();if(!response.ok)throw new Error(result.error || 'Save failed.');
    $('editor').close();await load();$('status').textContent='Saved to PATZCOM. eBay was not changed.';
  }catch(error){$('form-status').textContent=error.message;}
  finally{saving=false;$('save').disabled=false;$('cancel').disabled=false;}
};
load();
