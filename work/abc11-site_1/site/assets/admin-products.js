const $ = id => document.getElementById(id);
let items = [], revision = '', editing = null, saving = false;
const form = $('form');
const field = name => form.elements.namedItem(name);
function imageUrl(value) {
  if (/^assets\/img\/[a-zA-Z0-9._-]+$/.test(value)) return '/' + value;
  try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
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
    const cells = Array.from({length:6}, () => row.appendChild(document.createElement('td')));
    const url = imageUrl(p.images?.[0] || '');
    if (url) { const img = document.createElement('img'); img.src=url; img.alt=''; img.loading='lazy'; cells[0].append(img); }
    const link = document.createElement('a'); link.textContent=p.title; link.href=`/products/${encodeURIComponent(p.handle)}.html`; cells[0].append(link);
    cells[1].textContent=p.sku || 'No SKU'; const id=document.createElement('small'); id.textContent=p.id; cells[1].append(id);
    cells[2].textContent=p.type; cells[3].textContent=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(p.price);
    cells[4].textContent=p.available ? 'Available' : 'Unavailable';
    const edit=document.createElement('button'); edit.className='secondary'; edit.textContent='Edit'; edit.onclick=()=>openEditor(p); cells[5].append(edit);
    $('rows').append(row);
  }
}
async function load() {
  $('status').textContent='Loading listings...';
  try {
    const response=await fetch('/api/admin/products',{cache:'no-store'});
    if(response.status===401){location.href='/admin-login.html';return;}
    const data=await response.json(); if(!response.ok) throw new Error(data.error || 'Unable to load listings.');
    items=data.items;revision=data.revision;render();$('create').disabled=false;$('export').disabled=false;
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
function openEditor(product){
  editing=product; form.reset();$('upload-status').textContent='';$('form-status').textContent='';$('editor-title').textContent=product?'Edit listing':'Create listing';
  for(const name of ['title','sku','vendor','type','price','desc_text'])field(name).value=product?.[name] ?? '';
  field('images').value=(product?.images || []).join('\n');field('available').checked=product?.available ?? true;
  preview();$('editor').showModal();field('title').focus();
}
$('create').onclick=()=>openEditor(null);$('cancel').onclick=()=>{if(!saving)$('editor').close();};
$('editor').addEventListener('cancel',event=>{if(saving)event.preventDefault();});
$('search').oninput=render;$('filter').onchange=render;$('reload').onclick=load;field('images').onchange=preview;
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
  product.price=Number(field('price').value);product.available=field('available').checked;product.images=field('images').value.split('\n').map(s=>s.trim()).filter(Boolean);
  saving=true;$('save').disabled=true;$('cancel').disabled=true;$('form-status').textContent='Saving and rebuilding pages...';
  try{
    const response=await fetch('/api/admin/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editing?.id,revision,product})});
    const result=await response.json();if(!response.ok)throw new Error(result.error || 'Save failed.');
    $('editor').close();await load();$('status').textContent='Saved to PATZCOM. eBay was not changed.';
  }catch(error){$('form-status').textContent=error.message;}
  finally{saving=false;$('save').disabled=false;$('cancel').disabled=false;}
};
load();
