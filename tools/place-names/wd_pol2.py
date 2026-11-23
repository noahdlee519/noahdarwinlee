import json,sys
from wd import sparql,lit
e=json.load(open((__import__('os').environ.get('REPO','../..')+'/')+'chronia/data/eras.json'))
have=json.load(open('wd/c-pol-ids.json'))
names=sorted({p[0] for p in e['polities'] if 'pol|'+p[0] not in have and p[0]})
best={}
for i in range(0,len(names),120):
    b=names[i:i+120]
    q='''SELECT ?n ?item ?sl WHERE { VALUES ?n { %s } ?item rdfs:label ?n; wikibase:sitelinks ?sl.
      FILTER(?sl >= 3) FILTER NOT EXISTS { ?item wdt:P31 wd:Q5 } FILTER NOT EXISTS { ?item wdt:P31 wd:Q16521 } FILTER NOT EXISTS { ?item wdt:P31 wd:Q4167410 } }'''%' '.join(lit(n)+'@en' for n in b)
    for r in sparql(q):
        n=r['n']['value']; sl=int(r['sl']['value']); qid=r['item']['value'].rsplit('/',1)[1]
        if n not in best or sl>best[n][1]: best[n]=(qid,sl)
    print(i,len(best),file=sys.stderr)
for n,(qid,sl) in best.items(): have['pol|'+n]=qid
json.dump(have,open('wd/c-pol-ids.json','w'),ensure_ascii=False)
print(len(names),len(best))
