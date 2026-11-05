#!/usr/bin/env python3
"""Read-only static intake of one supplied HTML. Never execute or render its scripts."""
import argparse,json,re
from pathlib import Path
from audit import ROOT,sha,canonical,write_json
EXPECTED={
'Mi_Espanol_4_4_REBUILT_iPhone.html':'02696b413cfbfbf82509b7a3049ca5c831aadbc77717282ff20656d62b5433c4',
'Mi_Espanol_Integrated_Review_2026-11-02.html':'2841c65f0df98a0608eddc9415ca389474bf48b6348b1baa69d510b061f03ebe',
'Mi_Espanol_Personal_Complete_Review.html':'09c69a5c130e14f1f58b31bd23e80c6fbe8ef547e4e250e09c29a71f745a16ac'}

def inspect(source):
    raw=source.read_bytes();digest=sha(raw);text=raw.decode('utf-8-sig');db=None
    for m in re.finditer(r'\bconst\s+DB\s*=\s*',text):
        try:
            value=json.JSONDecoder().raw_decode(text[m.end():])[0]
            if isinstance(value,dict):db=value;break
        except ValueError:pass
    result={'classification':'EXTERNALLY_SUPPLIED_CANDIDATE_NOT_R5_AUTHORED','path':str(source.resolve()),'bytes':len(raw),'sha256':digest,'expected_manifest_sha256':EXPECTED.get(source.name),'matches_expected_manifest':digest==EXPECTED[source.name] if source.name in EXPECTED else None,'script_execution':'NOT_PERFORMED','HTML_rendering':'NOT_PERFORMED','scripts_found':len(re.findall(r'<script\b',text,re.I)),'external_reference_count':len(re.findall(r'(?:src|href)=[\"\']https?://',text,re.I)),'DB_parse_status':'JSON_OBJECT_PARSED' if db is not None else 'UNPARSED_REQUIRES_MANUAL_STATIC_ANALYSIS_NOT_PROOF_OF_ABSENCE','automatic_integration':False}
    if db is not None:
        current=json.loads((ROOT/'data/core.json').read_text());current['vocab']+=json.loads((ROOT/'data/recovered/vocabulary.json').read_text())['words']
        hashes={kind:{sha(canonical(item).encode()) for item in value} for kind,value in current.items() if isinstance(value,list)}
        result['arrays']={kind:{'records':len(value),'items':[{'sourceIndex':i,'contentHash':sha(canonical(item).encode()),'exactly_in_R4':sha(canonical(item).encode()) in hashes.get(kind,set())} for i,item in enumerate(value)]} for kind,value in db.items() if isinstance(value,list)}
        result['limits']='Array hashes are evidence of exact equality only; near duplicates, embedded non-DB modules and identifiers require manual review. Not a complete content audit.'
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);parser.add_argument('--report',required=True,type=Path);args=parser.parse_args()
    if args.source.suffix.lower()!='.html':raise ValueError('Supply one HTML at a time')
    if args.report.exists():raise FileExistsError('Do not overwrite an earlier intake report')
    result=inspect(args.source);args.report.parent.mkdir(parents=True,exist_ok=True)
    with args.report.open('x') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
    print(json.dumps({k:result[k] for k in ['sha256','matches_expected_manifest','DB_parse_status','script_execution']},ensure_ascii=False))
if __name__=='__main__':main()
