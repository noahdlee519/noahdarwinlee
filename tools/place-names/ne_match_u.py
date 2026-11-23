import json,math,unicodedata,re
ne=json.load(open('ne-props.json'))
import os
U=os.environ.get('REPO','../..')+'/uchronia/data/'
L=['es','fr','de','nl','it','pt','pl','tr','ru','zh','ja','ko']
def norm(s): return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s or '').encode('ascii','ignore').decode().lower())
def km(a,b,c,d):
    p=math.radians; x=math.sin(p(d-b)/2)**2+math.cos(p(b))*math.cos(p(d))*math.sin(p(c-a)/2)**2
    return 12742*math.asin(min(1,math.sqrt(x)))
ids={}   # key -> {q, ne:{lang:name}}
def put(key,r):
    ids[key]={'q':r.get('q'),'ne':{l:r[l] for l in L if r.get(l)}}
P=json.load(open(U+'provinces.json'))
A0={}
for r in ne['ne_10m_admin_0_countries']: A0.setdefault(r['adm0'],r)
for c in P['countries']:
    if c['c'] in A0: put('c|'+c['c'],A0[c['c']])
A1={}
for r in ne['ne_10m_admin_1_states_provinces']:
    for nm in {r['name'],r['en']}:
        if nm: A1.setdefault((r['adm0'],norm(nm)),r)
for g in P['objects']['provinces']['geometries']:
    p=g['properties']; k=(p['c'],norm(p['n']))
    if k in A1: put('p|'+p['c']+'|'+p['n'],A1[k])
for gr in P['groups']:
    k=(gr['c'],norm(gr['n']))
    if k in A1: put('g|'+gr['c']+'|'+gr['n'],A1[k])
PP=ne['ne_10m_populated_places']; byn={}
for r in PP:
    for nm in {r['name'],r['en']}:
        if nm: byn.setdefault(norm(nm),[]).append(r)
def place_match(name,lon,lat,maxkm):
    best=None
    for r in byn.get(norm(name),[]):
        lo,la=r['lab'] if r['lab'][0] is not None else r['pt']
        d=km(lon,lat,lo,la)
        if d<=maxkm and (best is None or d<best[0]): best=(d,r)
    return best[1] if best else None
cities=json.load(open(U+'cities.json')); n=0
for c in cities:
    r=place_match(c[0],c[1],c[2],40)
    if r: put('city|%s|%s|%s'%(c[0],c[1],c[2]),r); n+=1
print('cities',len(cities),n)
towns=json.load(open(U+'towns.json')); n=0
for t in towns:
    r=place_match(t[0],t[1],t[2],25)
    if r: put('town|%s|%s|%s'%(t[0],t[1],t[2]),r); n+=1
print('towns',len(towns),n)
LK=ne['ne_10m_lakes']+ne['ne_10m_lakes_europe']+ne['ne_10m_lakes_north_america']; lb={}
for r in LK:
    for nm in {r['name'],r['en']}:
        if nm: lb.setdefault(norm(nm),[]).append(r)
lakes=json.load(open(U+'lakes.json')); n=0
for l in lakes:
    c=[r for r in lb.get(norm(l[0]),[]) if r['q'] or any(r.get(x) for x in L)]
    if c: put('lake|'+l[0],c[0]); n+=1
print('lakes',len(lakes),n)
json.dump(ids,open('out/u-ne.json','w'),ensure_ascii=False)
print('total keys',len(ids),'with q',sum(1 for v in ids.values() if v['q']))
