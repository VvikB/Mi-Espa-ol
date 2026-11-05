#!/usr/bin/env python3
"""Assign initial stable IDs once; never rewrite an existing catalog implicitly."""
import hashlib,json
from pathlib import Path
from audit import ROOT,canonical,sha,write_json
from build import load_data,BASELINE
def identity(prefix,value):
    return prefix+'-'+hashlib.sha256(canonical(value).encode()).hexdigest()[:16]
def create():
    db=load_data();source=sha(BASELINE.read_bytes())
    result={'schema':1,'source_sha256':source,'words':[],'exercises':[],'schemes':[],'tables':[],'images':[],'schemeExercises':[]}
    for i,w in enumerate(db['vocab']):
        result['words'].append({'id':identity('word',[w['es'].strip().lower(),w['ru'].strip().lower()]),'legacyIndex':i,'pointer':f'/vocab/{i}','contentHash':sha(canonical(w).encode())})
    for i,q in enumerate(db['quiz']):
        result['exercises'].append({'id':identity('exercise',[q['q'],q['a']]),'legacyIndex':i,'pointer':f'/quiz/{i}','contentHash':sha(canonical(q).encode())})
    for i,s in enumerate(db['schemes']):
        sid=identity('scheme',s['name']);result['schemes'].append({'id':sid,'legacyIndex':i,'pointer':f'/schemes/{i}','contentHash':sha(canonical(s).encode()),'sourceImageId':None,'sourceLinkStatus':'UNVERIFIED'})
        for j,q in enumerate(s.get('quiz',[])):
            result['schemeExercises'].append({'id':identity('scheme-task',[sid,q]),'schemeId':sid,'legacyScheme':i,'legacyIndex':j,'pointer':f'/schemes/{i}/quiz/{j}','contentHash':sha(canonical(q).encode())})
    for si,s in enumerate(db['atlas']):
        for ti,t in enumerate(s[1]):
            result['tables'].append({'id':identity('table',[s[0],t[0]]),'section':si,'table':ti,'pointer':f'/atlas/{si}/1/{ti}','contentHash':sha(canonical(t).encode())})
    for i,img in enumerate(db['images']):
        result['images'].append({'id':'page-'+str(img['id']),'legacyIndex':i,'sourceId':img['id'],'pointer':f'/images/{i}','contentHash':sha(canonical(img).encode())})
    ids=[r['id'] for kind in ['words','exercises','schemes','schemeExercises','tables','images'] for r in result[kind]]
    if len(ids)!=len(set(ids)):raise ValueError('Duplicate catalog ID')
    return result
if __name__=='__main__':
    target=ROOT/'data/catalog.json'
    if target.exists():raise SystemExit('Catalog already exists: validate/edit explicitly; do not reassign IDs')
    result=create();write_json(target,result);print({k:len(v) for k,v in result.items() if isinstance(v,list)})
