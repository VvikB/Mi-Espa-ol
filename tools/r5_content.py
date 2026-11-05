"""Apply reviewed R5 patches with strict before-value gates and stable IDs."""
import copy,json
from audit import ROOT,sha,canonical

def apply_patch(db,p):
    parts=p['pointer'].strip('/').split('/');parent=db
    for part in parts[:-1]:parent=parent[int(part)] if isinstance(parent,list) else parent[part]
    key=int(parts[-1]) if isinstance(parent,list) else parts[-1]
    if parent[key]!=p['before']:raise ValueError('Editorial patch baseline mismatch: '+p['pointer'])
    parent[key]=copy.deepcopy(p['after'])
def review(db):
    vocab=json.loads((ROOT/'data/reviewed/vocabulary-review.json').read_text());grammar=json.loads((ROOT/'data/reviewed/grammar-review.json').read_text());links=json.loads((ROOT/'data/reviewed/source-links.json').read_text())
    if len(db['vocab'])!=len(vocab['records']):raise ValueError('Vocabulary scope changed')
    for record in vocab['records']:
        if record['original']!=db['vocab'][record['index']] or sha(canonical(record['original']).encode())!=record['originalHash']:raise ValueError('Wrong original word')
    images={p['id']:p for p in db['images']};files={p['fields']['id']:p for p in json.loads((ROOT/'data/images.json').read_text())}
    for t in grammar['tables']:
        rows=db['atlas'][t['section']][1][t['table']][2]
        if [r['originalValues'] for r in t['rows']]!=rows:raise ValueError('Grammar row changed')
        for p in t['sourcePages']:
            if files[p['id']]['sha256']!=p['sha256']:raise ValueError('Grammar source changed')
    for link in links['schemes']:
        for p,h in link['sourceHashes'].items():
            if files[p]['sha256']!=h:raise ValueError('Note source changed')
    for p in grammar['patches']+vocab['patches']:apply_patch(db,p)
    # Small scheme corrections are explicit and preserve the original scheme/task indices.
    scheme_patches=[
      dict(pointer='/schemes/7/rule',before='Dársele bien/mal algo — что-то хорошо/плохо получается. Для hablar о навыках: se me da bien; se te da bien; se le da bien.',after='Dársele bien/mal algo — что-то хорошо/плохо получается: se me da bien cocinar; se me dan bien los idiomas. Глагол согласуется с тем, что получается; лицо выражается me/te/le/nos/os/les.'),
      dict(pointer='/schemes/7/rows/1/1',before='Я не очень способен к языкам.',after='Мне не очень хорошо даются языки.')]
    for p in scheme_patches:apply_patch(db,p)
    sources=json.loads((ROOT/'data/recovered/vocabulary.json').read_text());rowmap={r['id']:r for r in sources['rows']}
    wordmeta=[]
    for r in vocab['records']:
        w=r['original'];source_rows=w.get('sourceRows',[])
        if not source_rows:
            from recover_vocabulary import key
            source_rows=sources['headwords'].get(key(w['es']),{}).get('sourceRows',[])
        wordmeta.append({k:r[k] for k in ['index','partOfSpeech','originalRecallKey','usageNotes','regionalStatus','example','status']}|{'originalEs':w['es'],'originalRu':w['ru'],'imageIds':list(dict.fromkeys(rowmap[id]['imageId'] for id in source_rows)),'origin':'PRESERVED_BASE_HTML' if r['index']<131 else 'RECOVERED_PHOTO_R4'})
    return {'words':wordmeta,'tables':[{k:t[k] for k in ['section','table','sourcePages','sourceAnchor','relationship','correctionIds']} for t in grammar['tables']],'schemes':links['schemes'],'schemePatches':scheme_patches,'summary':vocab['summary']}

def update_catalog(catalog,db,meta):
    for kind in ['words','exercises','schemes','tables','images','schemeExercises']:
        for record in catalog[kind]:
            value=db
            for part in record['pointer'].strip('/').split('/'):value=value[int(part)] if isinstance(value,list) else value[part]
            newhash=sha(canonical(value).encode())
            if newhash!=record['contentHash']:record['previousContentHash']=record['contentHash'];record['contentHash']=newhash;record['editorialRevision']='R5'
    for r in catalog['schemes']:
        link=meta['schemes'][r['legacyIndex']];r['sourceImageId']=link['pageIds'][0] if link['pageIds'] else None;r['sourceLinkStatus']=link['status']
