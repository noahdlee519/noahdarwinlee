import json,sys
from wd import sparql,lit
s=json.load(open('wd/u-search.json')); ty=json.load(open('wd/types.json')); f=json.load(open('wd/u-found.json'))
okr=set(ty['river'])
names=[r for r in s if r[0].startswith('river|') and f.get(r[0]) not in okr]
res={}
for i in range(0,len(names),60):
    b=names[i:i+60]
    q='SELECT ?n ?item ?sl ?d WHERE { VALUES (?n ?pt) { %s } ?item rdfs:label ?n; wdt:P31/wdt:P279* wd:Q355304; wikibase:sitelinks ?sl. OPTIONAL { ?item wdt:P625 ?c. BIND(geof:distance(?c, ?pt) AS ?d) } }'%' '.join('(%s "Point(%r %r)"^^geo:wktLiteral)'%(lit(r[1])+'@en',float(r[2]),float(r[3])) for r in b)
    for r in sparql(q):
        n=r['n']['value']; d=float(r['d']['value']) if 'd' in r else 9e9; sl=int(r['sl']['value'])
        if d>2500 and d<9e9: continue
        sc=(d if d<9e9 else 3000)-sl*20
        if n not in res or sc<res[n][1]: res[n]=(r['item']['value'].rsplit('/',1)[1],sc)
out={'river|'+n:q for n,(q,_) in res.items()}
json.dump(out,open('wd/rivers-found.json','w'))
print(len(names),len(out))
