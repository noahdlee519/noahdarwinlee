import json,os,sys
L=['es','fr','de','nl','it','pt','cs','pl','tr','ru','zh','ja','ko']
ne=json.load(open('out/c-ne.json'))
wd=json.load(open('out/wd-labels.json')) if os.path.exists('out/wd-labels.json') else {}
extra=json.load(open('out/c-wd-ids.json')) if os.path.exists('out/c-wd-ids.json') else {}
keys=dict(ne)
for k,q in extra.items(): keys.setdefault(k,{'q':q,'ne':{}})
manual=json.load(open('manual-c.json')) if os.path.exists('manual-c.json') else {}
outdir=sys.argv[1]
for l in L:
    res={'pol':{},'q':{},'city':{},'div':{},'lake':{},'river':{}}
    byname={}
    for k,v in keys.items():
        parts=k.split('|'); cat=parts[0]
        t=v['ne'].get(l) if cat!='lake' else None
        if not t and v.get('q'): t=wd.get(v['q'],{}).get(l)
        if not t: continue
        if cat=='pol' and t!=parts[1]: res['pol'][parts[1]]=t
        elif cat=='qid':
            if t!=parts[2]: res['q'][parts[1]+'|'+parts[2]]=t
            byname.setdefault(parts[2],set()).add(t)
        elif cat=='cityname' and t!=parts[1]: byname.setdefault(parts[1],set()).add(t)
        elif cat=='div' and t!=parts[2]: res['div'][parts[1]+'|'+parts[2]]=t
        elif cat in('lake','river') and t!=parts[1]: res[cat][parts[1]]=t
    for n,ts in byname.items():
        if len(ts)==1 and n not in ts: res['city'][n]=next(iter(ts))
    for cat,m in manual.get(l,{}).items(): res.setdefault(cat,{}).update(m)
    res={c:m for c,m in res.items() if m}
    json.dump(res,open(os.path.join(outdir,'places-'+l+'.json'),'w'),ensure_ascii=False,separators=(',',':'))
    print(l,{c:len(m) for c,m in res.items()},os.path.getsize(os.path.join(outdir,'places-'+l+'.json')))
