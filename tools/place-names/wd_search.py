import json,sys,os,time
from wd import sparql,lit
src,dst=sys.argv[1],sys.argv[2]
items=json.load(open(src))
res=json.load(open(dst)) if os.path.exists(dst) else {}
done=set(res.get('_done',[]))
B=150
for lang in ('en','mul'):
    todo=[r for r in items if r[0] not in res]
    for i in range(0,len(todo),B):
        b=todo[i:i+B]; tag=lang+':'+b[0][0]
        if tag in done: continue
        vals=' '.join('(%s %s "Point(%r %r)"^^geo:wktLiteral %d)'%(lit(r[0]),lit(r[1])+'@'+lang,float(r[2]),float(r[3]),r[4]) for r in b)
        q='SELECT ?k ?item ?d WHERE { VALUES (?k ?n ?pt ?max) { %s } ?item rdfs:label ?n; wdt:P625 ?c. BIND(geof:distance(?c, ?pt) AS ?d) FILTER(?d < ?max) }'%vals
        try: rows=sparql(q)
        except Exception as e: print('fail',i,e,file=sys.stderr); continue
        best={}
        for r in rows:
            k=r['k']['value']; d=float(r['d']['value']); q_=r['item']['value'].rsplit('/',1)[1]
            if k not in best or d<best[k][1]: best[k]=(q_,d)
        for k,(q_,d) in best.items(): res[k]=q_
        done.add(tag); res['_done']=sorted(done)
        if (i//B)%10==0:
            json.dump(res,open(dst,'w'),ensure_ascii=False); print(lang,i,len(todo),len(res)-1,file=sys.stderr,flush=True)
        time.sleep(0.3)
    json.dump(res,open(dst,'w'),ensure_ascii=False)
print('matched',len(res)-1,'of',len(items))
