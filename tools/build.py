#!/usr/bin/env python3
"""Deterministic internal restoration build with a strict no-loss baseline gate."""
import base64,json,re,subprocess,tempfile
from pathlib import Path
from audit import ROOT,STARTER,parse_html,sha,write_json,canonical
MODULES=['audio.js','storage.js','core.js','integration.js','visual.js','settings.js','reliability.js','visual-extension.js','visual-practice.js','recall.js','backup.js','events.js','schemes.js','routes.js','journey.js']
BASELINE=STARTER/'source_candidates/Mi_Espanol_LAST_TESTABLE.html'

def load_data(root=ROOT):
    db=json.loads((root/'data/core.json').read_text());images=[]
    for entry in json.loads((root/'data/images.json').read_text()):
        path=(root/entry['file']).resolve()
        if not path.is_relative_to(root.resolve()):raise ValueError('Image path escapes project')
        raw=path.read_bytes()
        if sha(raw)!=entry['sha256']:raise ValueError('Image hash changed: '+entry['file'])
        images.append({**entry['fields'],'src':entry['data_url_header']+','+base64.b64encode(raw).decode()})
    db['images']=images
    baseline=parse_html(BASELINE)[2]
    if db!=baseline:raise ValueError('R1 no-loss gate: source content differs from immutable baseline')
    return db

def build(output=None,revision="R3"):
    if revision not in ("R3","R4"):raise ValueError("Unknown revision")
    output=output or ROOT/f'.audit/working/Mi_Espanol_{revision}_INTERNAL.html'
    db=load_data()
    recovery=None
    if revision=='R4':
        recovery=json.loads((ROOT/'data/recovered/vocabulary.json').read_text())
        db['vocab']=db['vocab']+recovery['words']
    modules=MODULES+(['recovered-content.js'] if revision=='R4' else [])
    runtime='\n'.join((ROOT/'src'/name).read_text() for name in modules)+'\nrender();\n'
    with tempfile.TemporaryDirectory() as tmp:
        path=Path(tmp)/'runtime.js';path.write_text(runtime)
        subprocess.run(['node','--check',str(path)],check=True,capture_output=True)
    data='const DB='+json.dumps(db,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+';'
    catalog=json.loads((ROOT/'data/catalog.json').read_text());routes=json.loads((ROOT/'data/routes.json').read_text())
    if catalog['source_sha256']!=sha(BASELINE.read_bytes()):raise ValueError('Wrong catalog source')
    if revision=='R4':
        for i,w in enumerate(recovery['words'],131):
            catalog['words'].append({'id':'recovered-word-'+sha(w['es'].encode())[:20],'legacyIndex':i,'pointer':'/vocab/'+str(i),'contentHash':sha(canonical(w).encode()),'sourceRows':w['sourceRows']})
    ids=set()
    for kind in ['words','exercises','schemes','tables','images','schemeExercises']:
        for record in catalog[kind]:
            if record['id'] in ids:raise ValueError('Duplicate content ID')
            ids.add(record['id']);value=db
            for part in record['pointer'].strip('/').split('/'):value=value[int(part)] if isinstance(value,list) else value[part]
            if sha(canonical(value).encode())!=record['contentHash']:raise ValueError('Catalog content differs: '+record['id'])
    for r in routes['routes']:
        for plan in [r]+r['dayPlans']:
            if any(id not in ids for field in ['tableIds','schemeIds','exerciseIds'] for id in plan[field]):raise ValueError('Unknown route content')
    data+='const CATALOG='+json.dumps(catalog,ensure_ascii=False,separators=(',',':')).replace('<','\\\\u003c')+';const ROUTE_DATA='+json.dumps(routes,ensure_ascii=False,separators=(',',':')).replace('<','\\\\u003c')+';'
    shell=(ROOT/'src/shell.html').read_text()
    if shell.count('/* BUILD:DATA */')!=1 or shell.count('/* BUILD:CODE */')!=1:raise ValueError('Invalid source shell')
    html=shell.replace('/* BUILD:DATA */',data).replace('/* BUILD:CODE */',runtime)
    html=html.replace('</head>','<style>\n'+(ROOT/'src/restoration.css').read_text()+'\n</style></head>')
    html=re.sub(r'(<body\b[^>]*>)',rf'\1<div id="recovery-status">Внутренняя проверочная сборка восстановления {revision}. Не финальный выпуск.</div><div id="recovery-storage-status" role="alert" hidden></div><div id="recovery-audio-status" role="status" aria-live="polite"></div>',html,count=1)
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(html)
    manifest={'classification':'INTERNAL_REPAIR_BUILD_NOT_FINAL_RELEASE','baseline_sha256':sha(BASELINE.read_bytes()),'artifact_sha256':sha(html.encode()),'data_unchanged':revision=='R3','technical_counts':{'catalog_ids':len(ids),'routes':len(routes['routes']),'day_plans':sum(len(r['dayPlans']) for r in routes['routes']),'scheme_exercises':len(catalog['schemeExercises'])},'data_sha256':sha(canonical(db).encode()),'counts':{'vocab':len(db['vocab']),'quiz':len(db['quiz']),'tables':sum(len(s[1]) for s in db['atlas']),'schemes':len(db['schemes']),'images':len(db['images'])},'modules':[{ 'path':'src/'+f,'sha256':sha((ROOT/'src'/f).read_bytes())} for f in modules]}
    if revision=='R4':manifest.update(revision=revision,original_data_unchanged=True)
    write_json(ROOT/f'audit/restoration-{revision.lower()}/build.json',manifest)
    print('INTERNAL build:',output.relative_to(ROOT),'original data retained; SHA-256',manifest['artifact_sha256'])
    return output,manifest
if __name__=='__main__':build()
