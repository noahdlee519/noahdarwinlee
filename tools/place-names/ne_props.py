import json,glob
L=['es','fr','de','nl','it','pt','pl','tr','ru','zh','ja','ko']
def pt(g):
    try:
        c=g['coordinates']
        while isinstance(c[0],list): c=c[0]
        return c[:2]
    except Exception: return None
out={}
for f in sorted(glob.glob('ne/*.geojson')):
    rows=[]
    for ft in json.load(open(f))['features']:
        p={k.lower():v for k,v in ft['properties'].items()}
        r={'name':p.get('name'),'en':p.get('name_en'),'q':p.get('wikidataid'),'adm0':p.get('adm0_a3') or p.get('iso_a2'),'iso':p.get('iso_3166_2'),'lab':[p.get('longitude') or p.get('label_x'),p.get('latitude') or p.get('label_y')],'pt':pt(ft.get('geometry'))}
        for l in L: r[l]=p.get('name_'+l)
        rows.append(r)
    out[f[3:-8]]=rows
json.dump(out,open('ne-props.json','w'),ensure_ascii=False)
