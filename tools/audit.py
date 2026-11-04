#!/usr/bin/env python3
"""Read-only G0 inventory. Reconstructs source bytes for audit only, never a release."""
import argparse, base64, collections, hashlib, json, re, subprocess, tempfile
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile
ROOT = Path(__file__).resolve().parents[1]
STARTER = ROOT / 'originals/starter'
OUT = ROOT / 'audit'

def sha(data): return hashlib.sha256(data).hexdigest()
def canonical(obj): return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')
def verify_transfer():
    manifest = json.loads((STARTER/'inventory/MANIFEST_SHA256.json').read_text())
    rows = []
    for entry in manifest['files']:
        f = STARTER / entry['file']
        status = 'NOT_DELIVERED_IN_STARTER'
        actual = None
        if f.exists():
            actual = sha(f.read_bytes())
            status = 'PASS' if actual == entry['sha256'] and f.stat().st_size == entry['bytes'] else 'FAIL'
        rows.append({**entry, 'status': status, 'actual_sha256': actual})
    return rows

def parse_html(path):
    text = path.read_text()
    scripts = list(re.finditer(r'<script\b[^>]*>([\s\S]*?)</script\s*>', text, re.I))
    db_script = next(m for m in scripts if m.group(1).startswith('const DB='))
    db, end = json.JSONDecoder().raw_decode(db_script.group(1)[len('const DB='):])
    code = db_script.group(1)[len('const DB=')+end:]
    return text, scripts, db, code

def inventory_html(path, extracted):
    text, scripts, db, code = parse_html(path)
    extracted.mkdir(parents=True, exist_ok=True)
    (extracted/'runtime.js').write_text('// DB JSON elided for review; exact original is preserved.\n'+code)
    review=OUT/'runtime-code'/path.stem/'runtime.js';review.parent.mkdir(parents=True,exist_ok=True);review.write_bytes((extracted/'runtime.js').read_bytes())
    write_json(extracted/'DB.json', db)
    checks=[]
    for i,m in enumerate(scripts):
        with tempfile.TemporaryDirectory() as t:
            js=Path(t)/'script.js';js.write_text(m.group(1))
            result=subprocess.run(['node','--check',str(js)],capture_output=True,text=True)
        checks.append({'script':i,'status':'PASS' if result.returncode==0 else 'FAIL','stderr':result.stderr})
    images=[]
    for i,img in enumerate(db['images']):
        header,encoded=img['src'].split(',',1);raw=base64.b64decode(encoded,validate=True)
        images.append({'audit_id':f'images/{i}','source_id':img['id'],'group':img['group'],'mime':header.split(';')[0][5:],'bytes':len(raw),'sha256':sha(raw)})
    counts={'vocab':len(db['vocab']),'quiz':len(db['quiz']),'grammar_sections':len(db['atlas']), 'tables':sum(len(s[1]) for s in db['atlas']),'schemes':len(db['schemes']),'images':len(db['images']),'weeks':len(db['weeks'])}
    # Audit IDs preserve positions and hashes. They are NOT invented historical stable IDs.
    entities=[]
    for kind in ['vocab','quiz','atlas','schemes','weeks']:
        for i,item in enumerate(db[kind]):
            entities.append({'audit_id':f'{kind}/{i}','content_sha256':sha(canonical(item).encode()),'historical_id':item.get('id') if isinstance(item,dict) else None})
    for i,section in enumerate(db['atlas']):
        for j,table in enumerate(section[1]):entities.append({'audit_id':f'atlas/{i}/tables/{j}','content_sha256':sha(canonical(table).encode()),'historical_id':None})
    entities.extend(images)
    write_json(extracted/'entities.json',entities)
    write_json(OUT/'entities'/(path.stem+'.json'),entities)
    normalized=[re.sub(r'\s+',' ',w['es'].strip().lower()) for w in db['vocab']]
    duplicate_es={s:n for s,n in collections.Counter(normalized).items() if n>1}
    functions=[{'name':m.group(1),'runtime_line':code[:m.start()].count('\n')+2} for m in re.finditer(r'function\s+(\w+)\s*\(',code)]
    function_counts=collections.Counter(x['name'] for x in functions)
    runtime_arrays=re.findall(r'(?:const|let|var)\s+(\w+)\s*=\s*[\[{]',code)
    return {'file':str(path.relative_to(ROOT)),'sha256':sha(path.read_bytes()),'bytes':path.stat().st_size,'title':re.findall(r'<title>(.*?)</title>',text),'db_keys':list(db),'counts':counts,'images':images,'empty_vocab':[i for i,w in enumerate(db['vocab']) if not w.get('es','').strip() or not w.get('ru','').strip()],'duplicate_normalized_es':duplicate_es,'vocab_field_coverage':{k:sum(k in w for w in db['vocab']) for k in sorted(set().union(*(set(w) for w in db['vocab'])))},'syntax':checks,'functions':functions,'redeclared_functions':{k:v for k,v in function_counts.items() if v>1},'runtime_object_declarations':runtime_arrays,'external_script_src':re.findall(r'<script[^>]+src=["\']([^"\']+)',text),'network_url_attributes':re.findall(r'(?:src|href)=["\'](https?[^"\']+)',text),'runtime_sha256':sha(code.encode())}

def reconstruct(path, target):
    """Split/reassemble unmodified HTML in deterministic modules, then compare bytes."""
    source=path.read_bytes();parts=[];cursor=0
    for m in re.finditer(rb'<script\b[^>]*>[\s\S]*?</script\s*>',source,re.I):
        parts.extend([source[cursor:m.start()],source[m.start():m.end()]]);cursor=m.end()
    parts.append(source[cursor:]);target.mkdir(parents=True,exist_ok=True)
    paths=[]
    for i,part in enumerate(parts):
        f=target/f'part-{i:02d}.bin';f.write_bytes(part);paths.append(f)
    output=target/'reconstructed-audit-only.html';output.write_bytes(b''.join(f.read_bytes() for f in paths))
    if output.read_bytes()!=source:raise ValueError('Reconstruction differs from supplied source')
    return {'source':str(path.relative_to(ROOT)),'sha256':sha(source),'reconstructed_sha256':sha(output.read_bytes()),'parts':len(parts),'status':'PASS','purpose':'BYTE_IDENTICAL_AUDIT_RECONSTRUCTION_NOT_RELEASE'}

def file_manifest():
    rows=[]
    for f in sorted((ROOT/'originals').rglob('*')):
        if f.is_file():rows.append({'path':str(f.relative_to(ROOT)),'bytes':f.stat().st_size,'sha256':sha(f.read_bytes()),'classification':'supplied_immutable'})
    for f in sorted((ROOT/'experimental').rglob('*')):
        if f.is_file():rows.append({'path':str(f.relative_to(ROOT)),'bytes':f.stat().st_size,'sha256':sha(f.read_bytes()),'classification':'new_unverified_draft_not_recovered'})
    return rows

def main():
    transfer=verify_transfer();write_json(OUT/'transfer-verification.json',transfer)
    inventories=[];recon=[]
    for f in sorted((STARTER/'source_candidates').glob('*.html')):
        inventories.append(inventory_html(f,ROOT/'.audit/extracted'/f.stem))
        recon.append(reconstruct(f,ROOT/'.audit/reconstruction'/f.stem))
    a,b=[parse_html(STARTER/'source_candidates'/Path(i['file']).name)[2] for i in inventories]
    differences={k:{'identical':a[k]==b[k],'left_sha256':sha(canonical(a[k]).encode()),'right_sha256':sha(canonical(b[k]).encode())} for k in a}
    historical={}
    for f in (STARTER/'reports').glob('*.md'):
        historical[f.name]={'classification':'HISTORICAL_NOT_CURRENT_QA','referenced_sha256':sorted(set(re.findall(r'\b[0-9a-f]{64}\b',f.read_text())))}
    for f in (STARTER/'docs').glob('*.docx'):
        root=ET.fromstring(zipfile.ZipFile(f).read('word/document.xml'))
        ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        lines=[''.join(t.itertext()) for t in root.findall('.//w:t',ns)]
        target=ROOT/'.audit/documents'/f.with_suffix('.txt').name;target.parent.mkdir(parents=True,exist_ok=True);target.write_text('\n'.join(lines))
    write_json(OUT/'source-inventory.json',inventories)
    write_json(OUT/'reconstruction.json',recon)
    write_json(OUT/'candidate-comparison.json',{'order':[x['file'] for x in inventories],'DB_comparison':differences,'all_DB_equal':a==b,'historical_reports':historical})
    write_json(OUT/'files.json',file_manifest())
    passed=sum(r['status']=='PASS' for r in transfer);failed=sum(r['status']=='FAIL' for r in transfer)
    print(f'Transfer integrity: {passed} PASS, {failed} FAIL, {len(transfer)-passed-failed} not delivered in STARTER')
    for i in inventories:print(Path(i['file']).name,i['counts'],'syntax:',[x['status'] for x in i['syntax']])
    print('DB byte-independent content comparison:',a==b)
    print('Reconstruction: byte-identical audit artifacts only; NO final build produced')
    if failed or any(s['status']=='FAIL' for i in inventories for s in i['syntax']):raise SystemExit(1)
if __name__=='__main__': main()
