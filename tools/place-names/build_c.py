import json,os,sys,re
from clean import clean
L=['es','fr','de','nl','it','pt','cs','pl','tr','ru','zh','ja','ko']
ne=json.load(open('out/c-ne.json'))
wd=json.load(open('out/wd-labels.json')) if os.path.exists('out/wd-labels.json') else {}
extra=json.load(open('out/c-wd-ids.json')) if os.path.exists('out/c-wd-ids.json') else {}
keys={k:dict(v) for k,v in ne.items()}
for k,q in extra.items():
    if k in keys and keys[k].get('q'): continue
    keys.setdefault(k,{'ne':{}})['q']=q
manual=json.load(open('manual-c.json')) if os.path.exists('manual-c.json') else {}
outdir=sys.argv[1]
for l in L:
    res={'pol':{},'q':{},'city':{},'div':{},'lake':{},'river':{}}
    byname={}
    for k,v in keys.items():
        parts=k.split('|'); cat=parts[0]
        eng=parts[2] if cat in('qid','div') else parts[1]
        t=None
        t=clean(l,v.get('ne',{}).get(l),eng,cat) if cat not in('lake','river') else None
        w=clean(l,wd.get(v['q'],{}).get(l),eng,cat) if v.get('q') else None
        if w and re.match(r'(?i)^(list|liste|lista|lijst|elenco|seznam|список|一覧|列表|목록)\b',w): w=None
        if not t or (cat in('c','pol') and w and len(w)<len(t)): t=w or t
        if not t: continue
        if cat=='pol': res['pol'][parts[1]]=t
        elif cat=='qid':
            res['q'][parts[1]+'|'+parts[2]]=t; byname.setdefault(parts[2],set()).add(t)
        elif cat=='cityname': byname.setdefault(parts[1],set()).add(t)
        elif cat=='div': res['div'][parts[1]+'|'+parts[2]]=t
        elif cat in('lake','river'): res[cat][parts[1]]=t
    for n,ts in byname.items():
        if len(ts)==1: res['city'][n]=next(iter(ts))
    for cat,m in manual.get(l,{}).items(): res.setdefault(cat,{}).update(m)
    res={c:m for c,m in res.items() if m}
    fn=os.path.join(outdir,'places-'+l+'.json')
    json.dump(res,open(fn,'w'),ensure_ascii=False,separators=(',',':'))
    print(l,{c:len(m) for c,m in res.items()},os.path.getsize(fn))
