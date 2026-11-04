#!/usr/bin/env python3
"""Deterministic internal restoration build with a strict no-loss baseline gate."""
import base64,json,re,subprocess,tempfile
from pathlib import Path
from audit import ROOT,STARTER,parse_html,sha,write_json,canonical
MODULES=['audio.js','core.js','integration.js','visual.js','settings.js','reliability.js','visual-extension.js','visual-practice.js','recall.js','events.js']
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

def build(output=None):
    output=output or ROOT/'.audit/working/Mi_Espanol_R1_INTERNAL.html'
    db=load_data();runtime='\n'.join((ROOT/'src'/name).read_text() for name in MODULES)+'\nrender();\n'
    with tempfile.TemporaryDirectory() as tmp:
        path=Path(tmp)/'runtime.js';path.write_text(runtime)
        subprocess.run(['node','--check',str(path)],check=True,capture_output=True)
    data='const DB='+json.dumps(db,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+';'
    shell=(ROOT/'src/shell.html').read_text()
    if shell.count('/* BUILD:DATA */')!=1 or shell.count('/* BUILD:CODE */')!=1:raise ValueError('Invalid source shell')
    html=shell.replace('/* BUILD:DATA */',data).replace('/* BUILD:CODE */',runtime)
    html=html.replace('</head>','<style>\n'+(ROOT/'src/restoration.css').read_text()+'\n</style></head>')
    html=re.sub(r'(<body\b[^>]*>)',r'\1<div id="recovery-status">Внутренняя проверочная сборка восстановления R1. Не финальный выпуск.</div><div id="recovery-audio-status" role="status" aria-live="polite"></div>',html,count=1)
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(html)
    manifest={'classification':'INTERNAL_REPAIR_BUILD_NOT_FINAL_RELEASE','baseline_sha256':sha(BASELINE.read_bytes()),'artifact_sha256':sha(html.encode()),'data_unchanged':True,'data_sha256':sha(canonical(db).encode()),'counts':{'vocab':len(db['vocab']),'quiz':len(db['quiz']),'tables':sum(len(s[1]) for s in db['atlas']),'schemes':len(db['schemes']),'images':len(db['images'])},'modules':[{ 'path':'src/'+f,'sha256':sha((ROOT/'src'/f).read_bytes())} for f in MODULES]}
    write_json(ROOT/'audit/restoration-r1/build.json',manifest)
    print('INTERNAL build:',output.relative_to(ROOT),'data unchanged; SHA-256',manifest['artifact_sha256'])
    return output,manifest
if __name__=='__main__':build()
