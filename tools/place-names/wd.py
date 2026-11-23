import json,time,urllib.request,urllib.parse,sys
UA='CHRONIA-i18n/1.0 (https://chroniaatlas.com; place names for a historical atlas)'
def sparql(q,tries=5):
    data=urllib.parse.urlencode({'query':q,'format':'json'}).encode()
    for i in range(tries):
        try:
            req=urllib.request.Request('https://query.wikidata.org/sparql',data=data,headers={'User-Agent':UA,'Accept':'application/sparql-results+json','Content-Type':'application/x-www-form-urlencoded'})
            with urllib.request.urlopen(req,timeout=120) as r: return json.load(r)['results']['bindings']
        except Exception as e:
            sys.stderr.write('retry %d %s\n'%(i,str(e)[:120])); time.sleep(5*(i+1))
    raise RuntimeError('sparql failed')
def lit(s): return json.dumps(s,ensure_ascii=False)
