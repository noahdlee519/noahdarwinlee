import json,sys,os,time
from wd import sparql
qs=set()
for f in ['out/u-ne.json','out/c-ne.json']:
    for v in json.load(open(f)).values():
        if v.get('q'): qs.add(v['q'])
for f in ['wd/c-pol-ids.json','wd/u-found.json','wd/c-found.json','wd/rivers-found.json']:
    for k,v in json.load(open(f)).items():
        if k!='_done': qs.add(v)
qs=sorted(q for q in qs if q and q.startswith('Q'))
LG=['es','fr','de','nl','it','pt','pt-br','cs','pl','tr','ru','zh','zh-hans','zh-cn','ja','ko','en']
dst='wd/labels-raw.json'
res=json.load(open(dst)) if os.path.exists(dst) else {}
todo=[q for q in qs if q not in res]
print(len(qs),'todo',len(todo),file=sys.stderr)
B=400
for i in range(0,len(todo),B):
    b=todo[i:i+B]
    q='SELECT ?item ?l WHERE { VALUES ?item { %s } ?item rdfs:label ?l FILTER(lang(?l) IN (%s)) }'%(' '.join('wd:'+x for x in b),','.join('"%s"'%l for l in LG))
    for x in b: res.setdefault(x,{})
    for r in sparql(q):
        res[r['item']['value'].rsplit('/',1)[1]][r['l']['xml:lang']]=r['l']['value']
    if (i//B)%20==0: json.dump(res,open(dst,'w'),ensure_ascii=False); print(i,file=sys.stderr,flush=True)
    time.sleep(0.2)
json.dump(res,open(dst,'w'),ensure_ascii=False)
out={}
for q,m in res.items():
    o={}
    for l in ['es','fr','de','nl','it','cs','pl','tr','ru','ja','ko']:
        if m.get(l): o[l]=m[l]
    if m.get('pt-br') or m.get('pt'): o['pt']=m.get('pt-br') or m['pt']
    z=m.get('zh-hans') or m.get('zh-cn') or m.get('zh')
    if z: o['zh']=z
    if m.get('en'): o['en']=m['en']
    out[q]=o
json.dump(out,open('out/wd-labels.json','w'),ensure_ascii=False)
print('labels for',len(out))
