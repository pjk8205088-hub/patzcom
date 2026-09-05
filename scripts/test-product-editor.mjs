import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProduct, revision } from '../lib/product-editor.mjs';
const input = { title:'Test product', sku:'NEW-SKU', vendor:'PATZCOM', type:'Springs', price:100, available:true, images:['https://i.ebayimg.com/test.jpg'], desc_text:'Description' };
test('new listings are US-only and have independent IDs',()=>{
  const p=validateProduct(input,null,[]);
  assert.match(p.id,/^patz-/);assert.equal(p.handle,p.id);assert.equal(p.currency,'USD');assert.equal(p.listingSite,'US');
});
test('editing keeps IDs, URLs, imported HTML and unrelated fields',()=>{
  const existing={...input,id:'123',handle:'old-url',desc_html:'<video src="original.mp4"></video>',custom:'preserve'};
  const result=validateProduct({...input,price:150},existing,[existing]);
  assert.equal(result.id,'123');assert.equal(result.handle,'old-url');assert.equal(result.desc_html,existing.desc_html);assert.equal(result.custom,'preserve');assert.equal(existing.price,100);
});
test('changed descriptions escape executable markup',()=>{
  assert.equal(validateProduct({...input,desc_text:'<script>alert(1)</script>'},null,[]).desc_html.includes('<script>'),false);
});
test('reject duplicate SKUs, invalid prices, and unsafe images',()=>{
  assert.throws(()=>validateProduct(input,null,[{id:'other',sku:'new-sku'}]),/SKU/);
  for(const price of [NaN,-1,Infinity,0,'100'])assert.throws(()=>validateProduct({...input,price},null,[]));
  for(const url of ['javascript:alert(1)','http://example.com/a.jpg','https://user:pass@example.com/a.jpg','assets/img/../../bad'])assert.throws(()=>validateProduct({...input,images:[url]},null,[]));
});
test('catalog revision detects changes',()=>{assert.notEqual(revision([input]),revision([{...input,price:110}]));});
