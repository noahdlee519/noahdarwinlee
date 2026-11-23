import json,sys,os,time
from wd import sparql
groups={'settle':('wd:Q486972',),'admin':('wd:Q56061','wd:Q82794'),'lake':('wd:Q15324',),'river':('wd:Q355304','wd:Q4022')}
catg={'town':'settle','city':'settle','cityname':'settle','u':'admin','p':'admin','g':'admin','div':'admin','lake':'lake','river':'river'}
found={}
for f in ['wd/u-found.json','wd/c-found.json']:
    for k,q in json.load(open(f)).items():
        if k!='_done': found[k]=q
need={}
for k,q in found.items():
    g=catg.get(k.split('|')[0])
    if g: need.setdefault(g,set()).add(q)
dst='wd/types.json'
ok=json.load(open(dst)) if os.path.exists(dst) else {}
for g,qs in need.items():
    qs=sorted(qs); good=set(ok.get(g,[]))
    for i in range(0,len(qs),300):
        b=qs[i:i+300]
        roots=' '.join(groups[g])
        q='SELECT DISTINCT ?item WHERE { VALUES ?item { %s } VALUES ?root { %s } ?item wdt:P31/wdt:P279* ?root }'%(' '.join('wd:'+x for x in b),roots)
        try:
            for r in sparql(q): good.add(r['item']['value'].rsplit('/',1)[1])
        except Exception as e: print('fail',g,i,e,file=sys.stderr)
        if (i//300)%20==0: print(g,i,len(qs),len(good),file=sys.stderr,flush=True)
        time.sleep(0.2)
    ok[g]=sorted(good); json.dump(ok,open(dst,'w'))
    print(g,len(qs),'typed ok',len(good),file=sys.stderr)
