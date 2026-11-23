import json,glob
C=(__import__('os').environ.get('REPO','../..')+'/')+'chronia/data/'
have=json.load(open('out/c-ne.json'))
out=[]; seen=set()
def add(k,n,lon,lat,mx):
    if k in seen or not n: return
    seen.add(k); out.append([k,n,lon,lat,mx])
di=json.load(open(C+'divisions.json'))
for reg in di['regions']:
    d=json.load(open(C+reg[5]))
    for row in d['rows']:
        k='div|'+reg[0]+'|'+row[0]
        if k in have: continue
        lab=d['labels'][row[3]] if row[3] is not None and row[3]<len(d['labels']) else None
        if lab: add(k,row[0],lab[0],lab[1],150)
qnames=set()
for f in ['cities-dated.json','cities-dated-minor.json']:
    for r in json.load(open(C+f))['rows']:
        q=r[8] if len(r)>8 else None
        if not q: add('cityname|'+r[1],r[1],r[2],r[3],30)
        for st in (r[7] if len(r)>7 and r[7] else []):
            if st[1]!=r[1]: add('cityname|'+st[1],st[1],r[2],r[3],40)
def walk(o):
    if isinstance(o,list):
        if len(o)==3 and isinstance(o[0],str) and isinstance(o[1],(int,float)) and isinstance(o[2],(int,float)) and -180<=o[1]<=180 and -90<=o[2]<=90:
            add('cityname|'+o[0],o[0],o[1],o[2],30); return
        for v in o: walk(v)
    elif isinstance(o,dict):
        for k,v in o.items():
            if k not in('lo','hi','topo'): walk(v)
for f in glob.glob(C+'dated/*.json')+[C+'modern.json']:
    walk(json.load(open(f)).get('rows'))
g=json.load(open(C+'geography.json'))
json.dump(out,open('wd/c-search.json','w'),ensure_ascii=False)
from collections import Counter; print(Counter(r[0].split('|')[0] for r in out),len(out)); print(list(g.keys()), json.dumps(g.get('lakes'))[:300])
