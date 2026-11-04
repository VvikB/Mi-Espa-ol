#!/usr/bin/env python3
"""One-time extraction into an empty destination. Never overwrites edited source modules."""
import base64,json,re
from pathlib import Path
from audit import ROOT,STARTER,parse_html,sha,write_json
BASELINE=STARTER/'source_candidates/Mi_Espanol_LAST_TESTABLE.html'
MARKERS=[('core.js',None),('integration.js','/* Integrated learning, versioned state, and source-safe interactive forms. */'),('visual.js',"let visualMode='body'"),('settings.js','const RELEASE_INFO='),('reliability.js','/* Mi Español — stage 11 reconstruction patch'),('visual-extension.js','/* Reconstructed, newly authored scenes:'),('visual-practice.js','/* Mi Español • Stage 11 continuing work.'),('recall.js','/* Stage 11: separate active-recall lane,')]
def extract(destination):
    destination=Path(destination)
    if destination.exists() and any(destination.iterdir()):raise ValueError('Destination must be empty; edited modules are never overwritten')
    text,scripts,db,code=parse_html(BASELINE)
    for d in ['src','data','assets/pages']: (destination/d).mkdir(parents=True,exist_ok=True)
    parts=[];positions=[0]+[code.index(marker) for _,marker in MARKERS[1:]]+[len(code)]
    for i,(name,_) in enumerate(MARKERS):
        segment=code[positions[i]:positions[i+1]]
        (destination/'src'/name).write_text(segment)
        parts.append({'path':'src/'+name,'baseline_sha256':sha(segment.encode())})
    m=scripts[0];template=text[:m.start(1)]+'/* BUILD:DATA */\n/* BUILD:CODE */'+text[m.end(1):]
    (destination/'src/shell.html').write_text(template)
    data={k:v for k,v in db.items() if k!='images'};write_json(destination/'data/core.json',data)
    images=[]
    for img in db['images']:
        header,b64=img['src'].split(',',1);raw=base64.b64decode(b64,validate=True);name=str(img['id'])+'.webp'
        (destination/'assets/pages'/name).write_bytes(raw)
        images.append({'fields':{k:v for k,v in img.items() if k!='src'},'file':'assets/pages/'+name,'data_url_header':header,'sha256':sha(raw)})
    write_json(destination/'data/images.json',images)
    write_json(destination/'data/baseline-provenance.json',{'source':str(BASELINE.relative_to(ROOT)),'sha256':sha(BASELINE.read_bytes()),'modules':parts,'data_origin':'All core entries/images copied from baseline; no added educational content'})
    return [m['path'] for m in parts]
if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('destination',type=Path);a=p.parse_args();print(extract(a.destination))
