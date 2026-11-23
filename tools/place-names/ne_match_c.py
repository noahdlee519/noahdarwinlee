import json,re,unicodedata,glob
ne=json.load(open('ne-props.json'))
import os
C=os.environ.get('REPO','../..')+'/chronia/data/'
L=['es','fr','de','nl','it','pt','pl','tr','ru','zh','ja','ko']
def norm(s): return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s or '').encode('ascii','ignore').decode().lower())
out={}   # key -> {'q':..,'ne':{}}
def put(k,r): out[k]={'q':r.get('q'),'ne':{l:r[l] for l in L if r.get(l)}}
e=json.load(open(C+'eras.json'))
A0={}
for r in ne['ne_10m_admin_0_countries']:
    for nm in {r['name'],r['en']}:
        if nm: A0.setdefault(norm(nm),r)
n=0
for p in e['polities']:
    r=A0.get(norm(p[0]))
    if r: put('pol|'+p[0],r); n+=1
print('polities',len(e['polities']),'ne-matched',n)
PPq={r['q']:r for r in ne['ne_10m_populated_places'] if r['q']}
cq=0; tot=0
for f in ['cities-dated.json','cities-dated-minor.json']:
    d=json.load(open(C+f))
    for r in d['rows']:
        tot+=1
        q=r[8] if len(r)>8 else None
        if q:
            out.setdefault('qid|'+q+'|'+r[1],{'q':q,'ne':{}})
            if q in PPq: out['qid|'+q+'|'+r[1]]['ne']={l:PPq[q][l] for l in L if PPq[q].get(l)}; cq+=1
print('cities',tot,'with ne',cq,'with q',sum(1 for k in out if k.startswith('qid|')))
# divisions
feat=json.load(open('ne/ne_10m_admin_1_states_provinces.geojson'))
A1={}
for ft in feat['features']:
    pr={k.lower():v for k,v in ft['properties'].items()}
    r={'q':pr.get('wikidataid'),**{l:pr.get('name_'+l) for l in L}}
    for nm in {pr.get('name'),pr.get('name_en')}:
        if nm: A1.setdefault(((pr.get('iso_a2') or '').lower(),norm(nm)),r)
di=json.load(open(C+'divisions.json')); nd=0; td=0
for reg in di['regions']:
    d=json.load(open(C+reg[5]))
    for row in d['rows']:
        td+=1
        r=A1.get((reg[0].split('-')[0],norm(row[0])))
        if r: put('div|'+reg[0]+'|'+row[0],r); nd+=1
print('divisions',td,'matched',nd)
json.dump(out,open('out/c-ne.json','w'),ensure_ascii=False)
