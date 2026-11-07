"""Resolve authored lesson references against the existing stable content catalog."""
import json
from audit import ROOT,canonical,sha
TABLES={1:[(0,0),(0,1),(0,2)],2:[(10,0),(1,1),(2,4)],3:[(8,0),(10,2),(7,4)],4:[(15,0),(15,3)],5:[(6,2)],6:[(10,0)]}
def elements(lesson):
    return lesson['explanations']+lesson['lexicon']+[lesson['dialogue'],lesson['reading'],lesson['listening']]+lesson['dialogue']['turns']+lesson['tasks']+lesson.get('scaffolding',[])+([lesson['finalListening']] if lesson.get('finalListening') else [])
def prepare(catalog,db):
    lessons=[json.loads(p.read_text()) for p in sorted((ROOT/'data/lessons').glob('A1-*.json'))]
    ids={r['id'] for kind in ['words','tables','schemes','images','exercises','schemeExercises'] for r in catalog[kind]};images={r['fields']['id']:r for r in json.loads((ROOT/'data/images.json').read_text())}
    catalog['lessons']=[];catalog['lessonElements']=[]
    for li,l in enumerate(lessons):
        num=int(l['id'][-2:]);l['tableRefs']=[next(t['id'] for t in catalog['tables'] if t['section']==s and t['table']==tidx) for s,tidx in TABLES[num]]
        l.update(week={1:1,2:1,3:3,4:2,5:2,6:7}[num],scenario=l['situation'],goals=[l['objective']],grammarRefs=l['tableRefs'],listeningRefs=[l['listening']['id']],readingRefs=[l['reading']['id']],exerciseRefs=[t['id'] for t in l['tasks'] if not t.get('stage')],speechPrompts=[t['prompt'] for t in l['tasks'] if t['type']=='speaking'])
        l['sourceHashes']={str(p):images[p]['sha256'] for p in l['originalMaterials']}
        for lex in l['lexicon']:
            i=lex['wordIndex'];lex['wordId']=next(w['id'] for w in catalog['words'] if w['legacyIndex']==i)
            if not 0<=i<len(db['vocab']):raise ValueError('Missing vocabulary record')
        l['vocabRefs']=[w['wordId'] for w in l['lexicon']]
        for e in [l]+elements(l):
            if e['id'] in ids:raise ValueError('Duplicate lesson ID: '+e['id'])
            ids.add(e['id']);record={'id':e['id'],'lessonId':l['id'],'contentHash':sha(canonical(e).encode()),'origin':'NEWLY_AUTHORED_R6_NOT_HISTORICAL','level':'A1'}
            catalog['lessons' if e is l else 'lessonElements'].append(record)
    return lessons
