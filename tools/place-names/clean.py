import re
from opencc import OpenCC
T2S=OpenCC('t2s')
GEN_EN=re.compile(r'\b(county|province|district|region|department|oblast|prefecture|governorate|state|municipality|canton|raion|rayon|krai|okrug|parish|division|territory|voivodeship|regency|commune|borough)\b',re.I)
PRE={
 'es':r'^(provincia|departamento|condado|municipio|distrito|regi[oó]n|estado|cant[oó]n|partido|parroquia|gobernaci[oó]n|prefectura|comuna|regencia|raión|óblast) (de la |del |de los |de las |de |)',
 'fr':r"^(province|département|comté|district|région|canton|arrondissement|municipalité|commune|préfecture|gouvernorat|paroisse|raïon|oblast|régence|État) (de la |de l’|de l'|du |des |de |d’|d')?",
 'de':r'^(Landkreis|Kreis|Provinz|Bezirk|Distrikt|Region|County|Departamento|Departement|Präfektur|Gouvernement|Oblast|Rajon|Municipio|Gemeinde|Kanton|Regierungsbezirk) ',
 'nl':r'^(provincie|district|regio|departement|county|graafschap|gemeente|kanton|prefectuur|gouvernement|oblast) ',
 'it':r"^(provincia|distretto|contea|regione|dipartimento|comune|cantone|prefettura|governatorato|municipio|reggenza) (di |del |della |dell’|dell'|dei |delle |degli )?",
 'pt':r'^(província|departamento|condado|distrito|região|município|cantão|prefeitura|governadoria|regência|paróquia) (de |do |da |dos |das )?',
 'cs':r'^(provincie|okres|kraj|distrikt|region|oblast|departement|hrabství|prefektura|gubernie|kanton|obec|municipalita) ',
 'pl':r'^(prowincja|hrabstwo|dystrykt|region|departament|okręg|powiat|obwód|gmina|prefektura|gubernatorstwo|kanton|rejon|regencja) ',
 'ru':r'^(округ|район|провинция|область|департамент|графство|регион|муниципалитет|дистрикт|префектура|мухафаза|кантон|коммуна) ',
}
SUF={
 'tr':r' (ili|ilçesi|eyaleti|bölgesi|vilayeti|kontluğu|Kontluğu|Bölgesi|İli|İlçesi|Eyaleti|vilâyeti|valiliği|belediyesi|ilçe)$',
 'ru':r' (округ|район|провинция|область|департамент|графство|регион|муниципалитет|дистрикт)$',
 'de':r' (County|Province|District)$',
 'nl':r' (County|District)$',
 'cs':r' (County|okres|kraj)$',
 'pl':r' (County)$',
}
SCRIPT={'ru':r'[Ѐ-ӿ]','zh':r'[一-鿿]','ja':r'[぀-ヿ一-鿿]','ko':r'[가-힯]'}
def clean(lang,t,eng,cat):
    if not t: return None
    if lang=='zh': t=T2S.convert(t)
    t=re.sub(r'\s*\([^)]*\)\s*$','',t).strip()
    if lang in SCRIPT and not re.search(SCRIPT[lang],t): return None
    if cat in('u','p','g','div') and eng and not GEN_EN.search(eng):
        if lang in PRE:
            t2=re.sub(PRE[lang],'',t,flags=re.I).strip()
            if t2 and t2!=t: t=t2[0].upper()+t2[1:] if lang not in('ru',) else t2
        if lang in SUF:
            t2=re.sub(SUF[lang],'',t).strip()
            if t2: t=t2
        if lang not in('ru','zh','ja','ko'):
            t2=re.sub(r'^(?:(?:Province|District|County|Region|Department|Municipality|Governorate|Prefecture|Parish) of |(?:de la |de los |de las |del |de |do |da |dos |das |di |du |des ))','',t)
            t2=re.sub(r' (?:Province|District|County|Region|Department|Municipality|Governorate|Prefecture|Parish|Distrikt|Distrito|Provinz|Rajon|rajon|Oblast|oblast)$','',t2).strip()
            if t2 and t2!=t: t=t2[0].upper()+t2[1:]
    if cat in('town','city','cityname','qid') and eng and ',' not in eng and ',' in t: t=t.split(',')[0].strip()
    if t and lang not in('ru','zh','ja','ko') and t[0].islower() and not t.startswith(("'s",'d’',"d'",'l’',"l'")): t=t[0].upper()+t[1:]
    if not t or t==eng: return None
    return t
