import json,os,sys,re
from clean import clean
L=['es','fr','de','nl','it','pt','cs','pl','tr','ru','zh','ja','ko']
ne=json.load(open('out/u-ne.json'))
wd=json.load(open('out/wd-labels.json')) if os.path.exists('out/wd-labels.json') else {}
extra=json.load(open('out/u-wd-ids.json')) if os.path.exists('out/u-wd-ids.json') else {}
keys={k:dict(v) for k,v in ne.items()}
for k,q in extra.items():
    if k in keys and keys[k].get('q'): continue
    keys.setdefault(k,{'ne':{}})['q']=q
outdir=sys.argv[1]
SPLIT={'town':'towns','u':'units'}
for l in L:
    res={}
    for k,v in keys.items():
        cat,_,rest=k.partition('|')
        eng=rest.split('|')[0] if cat in('city','town','lake','river') else rest.split('|')[-1] if cat!='c' else None
        t=None
        t=clean(l,v.get('ne',{}).get(l),eng,cat) if cat not in('lake','river') else None
        w=clean(l,wd.get(v['q'],{}).get(l),eng,cat) if v.get('q') else None
        if w and re.match(r'(?i)^(list|liste|lista|lijst|elenco|seznam|список|一覧|列表|목록)\b',w): w=None
        if not t or (cat in('c','pol') and w and len(w)<len(t)): t=w or t
        if not t: continue
        res.setdefault(cat,{})[rest]=t
    for cat,m in (json.load(open('manual-u.json')) if os.path.exists('manual-u.json') else {}).get(l,{}).items(): res.setdefault(cat,{}).update(m)
    files={'':{c:m for c,m in res.items() if c not in SPLIT}}
    for c,suf in SPLIT.items(): files['-'+suf]={c:res.get(c,{})}
    sizes=[]
    for suf,data in files.items():
        fn=os.path.join(outdir,'places-'+l+suf+'.json')
        json.dump(data,open(fn,'w'),ensure_ascii=False,separators=(',',':')); sizes.append(os.path.getsize(fn))
    print(l,{c:len(m) for c,m in res.items()},sizes)
