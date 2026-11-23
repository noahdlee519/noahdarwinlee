import json,sys
from wd import sparql,lit
e=json.load(open((__import__('os').environ.get('REPO','../..')+'/')+'chronia/data/eras.json'))
titles=sorted({t for p in e['polities'] for t in ([p[3]] if isinstance(p[3],str) else [x[1] for x in p[3]]) if t})
res={}
for i in range(0,len(titles),150):
    b=titles[i:i+150]
    q='SELECT ?t ?item ?en WHERE { VALUES ?t { %s } ?a schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?t. OPTIONAL { ?item rdfs:label ?en FILTER(lang(?en)="en") } }'%' '.join(lit(t)+'@en' for t in b)
    for r in sparql(q): res[r['t']['value']]={'q':r['item']['value'].rsplit('/',1)[1],'en':r.get('en',{}).get('value')}
    print(i,len(res),file=sys.stderr)
json.dump(res,open('wd/pol-titles.json','w'),ensure_ascii=False)
print(len(titles),len(res))
