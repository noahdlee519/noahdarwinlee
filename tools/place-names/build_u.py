import json,os,sys
L=['es','fr','de','nl','it','pt','cs','pl','tr','ru','zh','ja','ko']
ne=json.load(open('out/u-ne.json'))
wd=json.load(open('out/wd-labels.json')) if os.path.exists('out/wd-labels.json') else {}
extra=json.load(open('out/u-wd-ids.json')) if os.path.exists('out/u-wd-ids.json') else {}
keys=dict(ne)
for k,q in extra.items(): keys.setdefault(k,{'q':q,'ne':{}})
outdir=sys.argv[1]
for l in L:
    res={}
    for k,v in keys.items():
        cat,_,rest=k.partition('|')
        eng=rest.split('|')[0] if cat in('city','town','lake','river') else rest.split('|')[-1] if cat!='c' else None
        t=None
        if cat!='lake': t=v['ne'].get(l)
        if not t and v.get('q'): t=wd.get(v['q'],{}).get(l)
        if not t: continue
        if eng is not None and t==eng: continue
        res.setdefault(cat,{})[rest]=t
    json.dump(res,open(os.path.join(outdir,'places-'+l+'.json'),'w'),ensure_ascii=False,separators=(',',':'))
    print(l,{c:len(v) for c,v in res.items()},os.path.getsize(os.path.join(outdir,'places-'+l+'.json')))
