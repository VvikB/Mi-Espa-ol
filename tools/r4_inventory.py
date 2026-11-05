#!/usr/bin/env python3
"""Inventory all reachable project-related HTML/archives before R4 integration."""
import collections,hashlib,json,os,re,subprocess,zipfile
from pathlib import Path
from audit import ROOT,canonical,sha,write_json
OUT=ROOT/'audit/restoration-r4'
SKIP={'.git','.aws','.codex','.agents','__pycache__','node_modules'}
def classify(path):
    s=str(path)
    if '/originals/' in s or '/attachments/' in s or '/scratch/spanish-import/' in s:return 'PROVIDED_OR_DUPLICATE_INPUT'
    if '/experimental/' in s:return 'NEW_SESSION_DRAFT_NOT_HISTORICAL'
    if '/src/' in s:return 'CURRENT_MODULAR_SHELL'
    return 'GENERATED_OR_TEST_COPY_NOT_INDEPENDENT_HISTORICAL_SOURCE'
def parse_db(text):
    matches=list(re.finditer(r'\bconst\s+DB\s*=\s*',text))
    for m in matches:
        try:return json.JSONDecoder().raw_decode(text[m.end():])[0]
        except (ValueError,json.JSONDecodeError):continue
    return None
def entities(db):
    result={}
    for kind,items in db.items():
        if not isinstance(items,list):continue
        result[kind]=[{'pointer':f'/{kind}/{i}','sha256':sha(canonical(x).encode())} for i,x in enumerate(items)]
    result['tables']=[{'pointer':f'/atlas/{i}/1/{j}','sha256':sha(canonical(t).encode())} for i,s in enumerate(db.get('atlas',[])) for j,t in enumerate(s[1])]
    result['schemeExercises']=[{'pointer':f'/schemes/{i}/quiz/{j}','sha256':sha(canonical(q).encode())} for i,s in enumerate(db.get('schemes',[])) for j,q in enumerate(s.get('quiz',[]))]
    return result
def main():
    OUT.mkdir(parents=True,exist_ok=True);errors=[];paths=[]
    for root in [Path('/workspace'),Path('/tmp')]:
        for directory,dirs,files in os.walk(root,followlinks=False,onerror=lambda e:errors.append({'path':e.filename,'error':e.strerror})):
            dirs[:]=[d for d in dirs if d not in SKIP and not d.startswith(('playwright_','.org.chromium.'))]
            for name in files:
                f=Path(directory)/name
                if f.suffix.lower() not in {'.html','.zip','.pdf','.docx','.md'}:continue
                if root==Path('/tmp') and not re.search('espanol|espa.ol|spanish',str(f),re.I):continue
                if f.is_symlink():errors.append({'path':str(f),'error':'symlink not followed'});continue
                paths.append(f)
    files=[];html_by_hash={};archives=[]
    def add_html(data,location,classification):
        digest=sha(data);entry=html_by_hash.setdefault(digest,{'sha256':digest,'bytes':len(data),'locations':[],'classifications':[]})
        entry['locations'].append(location)
        if classification not in entry['classifications']:entry['classifications'].append(classification)
        if 'data' not in entry:
            text=data.decode('utf-8');db=parse_db(text)
            entry['data']=db
            entry['title']=re.findall(r'<title>(.*?)</title>',text)
            entry['script_blocks']=len(re.findall(r'<script\b',text))
            entry['has_DB']=db is not None
    for f in sorted(set(paths)):
        try:
            data=f.read_bytes();row={'path':str(f),'bytes':len(data),'sha256':sha(data),'classification':classify(f),'suffix':f.suffix.lower()};files.append(row)
            if f.suffix.lower()=='.html':add_html(data,str(f),classify(f))
            if f.suffix.lower()=='.zip':
                with zipfile.ZipFile(f) as archive:
                    members=[]
                    if sum(i.file_size for i in archive.infolist())>1024**3:raise ValueError('Archive larger than bounded audit limit')
                    for member in archive.infolist():
                        if member.is_dir():continue
                        raw=archive.read(member);record={'name':member.filename,'bytes':len(raw),'sha256':sha(raw)};members.append(record)
                        if member.filename.lower().endswith('.html'):add_html(raw,str(f)+'!/'+member.filename,classify(f))
                    archives.append({'path':str(f),'sha256':row['sha256'],'crc_status':'PASS' if archive.testzip() is None else 'FAIL','members':members})
        except Exception as error:errors.append({'path':str(f),'error':str(error)})
    baseline=json.loads((ROOT/'data/core.json').read_text());baseline['images']=None
    # For comparison include images from the immutable supplied candidate, not a rebuilt/new R4 file.
    raw=(ROOT/'originals/starter/source_candidates/Mi_Espanol_LAST_TESTABLE.html').read_text()
    r3=parse_db(raw);r3entities=entities(r3)
    html=[]
    for entry in html_by_hash.values():
        db=entry.pop('data')
        if db is not None:
            actual=entities(db);entry['counts']={k:len(v) for k,v in actual.items()};entry['DB_sha256']=sha(canonical(db).encode())
            entry['compared_to_R3_preserved_data']={kind:{'same':db.get(kind)==r3.get(kind),'unique_full_content_hashes':sorted(set(x['sha256'] for x in actual.get(kind,[]))-set(x['sha256'] for x in r3entities.get(kind,[])))} for kind in actual}
            entry['nested_educational_arrays']=[{'pointer':x['pointer'],'sha256':x['sha256']} for kind in ['tables','schemeExercises'] for x in actual[kind]]
        html.append(entry)
    expected=json.loads((ROOT/'originals/starter/inventory/MANIFEST_SHA256.json').read_text())['files']
    all_hashes={x['sha256'] for x in files}|{m['sha256'] for a in archives for m in a['members']}
    missing=[{'name':x['file'],'expected_sha256':x['sha256'],'status':'NOT_FOUND_IN_AVAILABLE_BYTES_NOT_PROOF_OF_PERMANENT_DELETION'} for x in expected if x['sha256'] not in all_hashes]
    history=subprocess.check_output(['git','log','--all','--format=%H %s','--','*.html','*.zip','*.pdf'],cwd=ROOT).decode().splitlines()
    draft=json.loads((ROOT/'experimental/pre-audit-draft/course.json').read_text())
    report={'scope':'PRE_R4_INTEGRATION; /workspace recursively and project-related /tmp HTML/ZIP/PDF/DOCX/MD, no credential internals','excluded_directory_names':sorted(SKIP),'read_errors':errors,'files':files,'archives':archives,'unique_HTML_content':html,'not_found_expected_artifacts':missing,'git_history_for_source_artifacts':history,'new_unintegrated_draft':{'path':'experimental/pre-audit-draft/course.json','records':len(draft),'classification':'NEWLY_CREATED_IN_THIS_SESSION_NOT_RECOVERED_HISTORICAL_LESSONS','integrated':False},'large_archive':{'sediment_id':'file_0000000019d08210a8f9fe3e7aa45091','status':'POINTER_ONLY_TRANSFER_LIMIT_32_MIB_NOT_READ','user_previously_reported_no_other_sources':True},'standalone_development_regulation':{'found':any('regulation' in Path(r['path']).name.lower() for r in files),'status':'No standalone titled file identified; current user instructions and MASTER SPECIFICATION are available'}}
    write_json(OUT/'available-sources.json',report)
    print('Files:',len(files),'archives:',len(archives),'distinct HTML byte versions:',len(html),'traversal/read errors:',len(errors))
    for x in html:
        if x['has_DB']:print(x['sha256'][:12],x['classifications'],x['counts'])
    print('Expected artifacts not found:',[x['name'] for x in missing])
if __name__=='__main__':main()
