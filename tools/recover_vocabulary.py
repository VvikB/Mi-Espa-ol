#!/usr/bin/env python3
"""Reviewed image text -> additive vocabulary, with held rows and provenance retained."""
import copy,json,re,unicodedata
from pathlib import Path
from audit import ROOT,sha,canonical,write_json
def key(text):
    return re.sub(r'\s+',' ',unicodedata.normalize('NFC',text).strip().lower()).strip(' .!?¡¿…')
def parse():
    entries=[];section=None;ordinal=0
    images={str(x['fields']['id']):x for x in json.loads((ROOT/'data/images.json').read_text())}
    for line in (ROOT/'data/recovered/poster-transcription.tsv').read_text().splitlines():
        if not line or line.startswith('#'):continue
        if line.startswith('@'):
            page,sid,title,box=line[1:].split('|');section={'imageId':int(page),'sectionId':sid,'category':title,'sectionBox':[float(x) for x in box.split(',')],'imageSha256':images[page]['sha256']};ordinal=0;continue
        if section is None:raise ValueError('Row without source section')
        ordinal+=1;fields=line.split('|');held=fields[0].startswith('!');raw_es=fields[0].lstrip('!').strip();raw_ru=fields[1].strip()
        es=raw_es;ru=raw_ru;note='';status='VISUALLY_TRANSCRIBED'
        if held:status='HELD_SOURCE_ERROR_OR_CONTEXT';note='|'.join(fields[2:])
        else:
            es=fields[2].strip() if len(fields)>2 and fields[2].strip() else raw_es
            ru=fields[3].strip() if len(fields)>3 and fields[3].strip() else raw_ru
            note=fields[4].strip() if len(fields)>4 else ''
            if es!=raw_es or ru!=raw_ru:status='TRANSCRIBED_WITH_EXPLICIT_LANGUAGE_CORRECTION'
        forms={};alternatives=[]
        if not held and es.endswith('o/a'):
            es=es[:-2];forms['feminine']=es[:-1]+'a'
        if raw_es=='Le queda /sienta bien':alternatives=['Le sienta bien']
        if raw_es=='el/la profesor(a)':forms['feminine']='la profesora'
        if raw_es=='feliz (felices)':forms['plural']='felices'
        entries.append({**section,'id':f'photo-{section["imageId"]}-{section["sectionId"]}-{ordinal:03d}','ordinalInSection':ordinal,'source_es':raw_es,'source_ru':raw_ru,'es':es,'ru':ru,'forms':forms,'alternatives':alternatives,'status':status,'note':note,'review':'VISUAL_ASSISTANT_TRANSCRIPTION; independent and complete methodological acceptance pending','transcriptionHash':sha(canonical([raw_es,raw_ru]).encode())})
    return entries
def generate():
    base=json.loads((ROOT/'data/core.json').read_text())['vocab'];entries=parse()
    words=[];provenance={};by_key={key(w['es']):('baseline',i) for i,w in enumerate(base)}
    for row in entries:
        if row['status']=='HELD_SOURCE_ERROR_OR_CONTEXT':continue
        k=key(row['es'])
        meta=provenance.setdefault(k,{'translations':[],'categories':[],'sourceRows':[],'forms':{},'alternatives':[],'notes':[]})
        for field,value in [('translations',row['ru']),('categories',row['category']),('sourceRows',row['id'])]:
            if value not in meta[field]:meta[field].append(value)
        meta['forms'].update(row['forms'])
        for a in row['alternatives']:
            if a not in meta['alternatives']:meta['alternatives'].append(a)
        if row['note'] and row['note'] not in meta['notes']:meta['notes'].append(row['note'])
        if k not in by_key:
            by_key[k]=('recovered',len(words));words.append({'es':row['es'],'ru':row['ru'],'ex':'','cat':row['category'],'forms':copy.deepcopy(row['forms']),'answerVariants':row['alternatives'][:],'sourceRows':[row['id']],'recoveryStatus':'RECOVERED_FROM_PROVIDED_IMAGE','methodologicalStatus':'PENDING_CONTEXT_EXAMPLES_AND_LEVEL_REVIEW'})
    for word in words:
        meta=provenance[key(word['es'])];word['ru']='; '.join(meta['translations']);word['forms']=meta['forms'];word['answerVariants']=meta['alternatives'];word['sourceRows']=meta['sourceRows']
    result={'schema':1,'classification':'Image-derived content restoration; not historical Stage10 recovery','rows':entries,'words':words,'headwords':provenance,'summary':{'transcribed_source_rows':len(entries),'held_source_rows':sum(x['status']=='HELD_SOURCE_ERROR_OR_CONTEXT' for x in entries),'corrected_rows':sum(x['status']=='TRANSCRIBED_WITH_EXPLICIT_LANGUAGE_CORRECTION' for x in entries),'new_headword_records':len(words),'baseline_records_retained':len(base),'combined_vocabulary_records':len(base)+len(words),'source_headwords_linked_to_existing':sum(k in {key(w['es']) for w in base} for k in provenance),'new_examples_authored':0}}
    write_json(ROOT/'data/recovered/vocabulary.json',result)
    return result
if __name__=='__main__':
    x=generate();print(x['summary'])
