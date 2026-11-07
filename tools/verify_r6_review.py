#!/usr/bin/env python3
"""Append a fresh verification run without overwriting the recovered review evidence."""
import hashlib,json,runpy,sys
from pathlib import Path
from audit import ROOT,write_json
import build_r6_review

def main():
 parent=ROOT/'audit/r6-quality-review';base=parent/'verification-2026-11-07';out=base;i=0
 while out.exists():i+=1;out=parent/(base.name+'-'+str(i))
 out.mkdir(parents=True,exist_ok=False);build_r6_review.OUT=out
 files=['test_r6_quality.py','test_r6_review_flow.py','test_r6_quality_regressions.py']
 for name in files:
  print('Verification:',name,flush=True)
  source=(ROOT/'tools'/name).read_text()
  if name!='test_r6_quality.py':source=source.replace('r6-quality-review',str(out.relative_to(ROOT/'audit')))
  exec(compile(source,str(ROOT/'tools'/name),'exec'),{'__name__':'__main__','__file__':str(ROOT/'tools'/name)})
 reports={}
 for name in ['quality-tests','lesson-tests','regression-tests','backup-tests','journey-tests']:
  data=json.loads((out/(name+'.json')).read_text());reports[name]={'summary':data['summary'],'artifact_sha256':data['artifact_sha256']}
 assert len({r['artifact_sha256'] for r in reports.values()})==1
 write_json(out/'verification.json',{'classification':'FRESH_R6_REVIEW_VALIDATION_NO_PREVIOUS_EVIDENCE_OVERWRITE','reports':reports,'scripts':{name:hashlib.sha256((ROOT/'tools'/name).read_bytes()).hexdigest() for name in files}})
 print('Verification directory:',out.relative_to(ROOT),flush=True)
if __name__=='__main__':main()
