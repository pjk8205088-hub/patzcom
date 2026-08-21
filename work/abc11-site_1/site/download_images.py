#!/usr/bin/env python3
"""PATZCOM - localize all remote images.
Run inside the site folder:  python3 download_images.py
Downloads every remote image into assets/img/ and rewrites all HTML + products.json
to point at the local copies. Safe to re-run."""
import os,re,json,glob,hashlib,urllib.request,concurrent.futures as cf
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.makedirs('assets/img',exist_ok=True)
urls=set()
pat=re.compile(r'https?://[^"\'\s)]+\.(?:jpg|jpeg|png|webp|gif)',re.I)
files=glob.glob('**/*.html',recursive=True)+['assets/products.json']
for f in files:
    urls|=set(pat.findall(open(f,encoding='utf-8').read()))
print(len(urls),'remote images found')
def name(u):
    ext=os.path.splitext(u.split('?')[0].split('/')[-1])[1][:5].lower() or '.jpg'
    return hashlib.md5(u.encode()).hexdigest()[:12]+ext
def get(u):
    f='assets/img/'+name(u)
    if os.path.exists(f) and os.path.getsize(f)>0: return u,f
    try:
        req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
        open(f,'wb').write(urllib.request.urlopen(req,timeout=90).read())
        return u,f
    except Exception as e:
        print('FAIL',u,e); return u,None
m={}
with cf.ThreadPoolExecutor(12) as ex:
    for u,f in ex.map(get,sorted(urls)):
        if f: m[u]=f
print('downloaded',len(m))
for f in files:
    depth=f.count('/')
    s=open(f,encoding='utf-8').read()
    for u,local in m.items():
        rel=('../'*depth)+local if f.endswith('.html') else local
        s=s.replace(u,rel)
    open(f,'w',encoding='utf-8').write(s)
print('rewritten. done.')
