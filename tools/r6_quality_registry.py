"""Evidence-only review registry; no execution of historical HTML or repeated source audit."""
import json,subprocess
from pathlib import Path
from audit import ROOT,sha,write_json

def main():
 out=ROOT/'audit/r6-quality-review';changes=[];keys=[];lessons=[]
 def walk(old,new,path,lesson):
  if old==new:return
  if isinstance(old,dict) and isinstance(new,dict):
   for k in sorted(set(old)|set(new)):
    if k not in new:raise ValueError('Unexpected deletion '+path+'/'+k)
    if k not in old:changes.append(dict(lesson=lesson,path=path+'/'+k,status='ADDED',after=new[k]))
    else:walk(old[k],new[k],path+'/'+k,lesson)
  elif isinstance(old,list) and isinstance(new,list) and len(new)>=len(old):
   for i,v in enumerate(old):walk(v,new[i],path+'/'+str(i),lesson)
   for i in range(len(old),len(new)):changes.append(dict(lesson=lesson,path=path+'/'+str(i),status='ADDED',after=new[i]))
  else:changes.append(dict(lesson=lesson,path=path,status='CORRECTED',before=old,after=new))
 for n in range(1,7):
  path=f'data/lessons/A1-{n:02}.json';raw=subprocess.check_output(['git','show','a6ffd4f:'+path],cwd=ROOT);old=json.loads(raw);new=json.loads((ROOT/path).read_text());walk(old,new,'',new['id'])
  assert [t['id'] for t in new['tasks'][:16]]==[t['id'] for t in old['tasks']]
  for t in new['tasks']:
   if not t.get('expected'):continue
   keys.append({'id':t['id'],'type':t['type'],'prompt':t['prompt'],'expected':t['expected'],'alternatives':t['alternatives'],'option_key_count':t['options'].count(t['expected']) if t['options'] else None,'constraint':'EXPLICIT_SHORT_RESPONSE_MODEL' if t['type']=='input' and not t['options'] else 'UNIQUE_IN_CONTEXT_CHOICE','strict_question_signs':t.get('strictPunctuation',False),'reason':t['explanation'],'rule_refs':t['explanationRefs'],'status':'ASSISTANT_LANGUAGE_PASS_NOT_INDEPENDENT_ELE'})
  lessons.append({'id':new['id'],'before_core_explanation_words':sum(len(e['text'].split()) for e in old['explanations']),'current_core_explanation_words':sum(len(e['text'].split()) for e in new['explanations']),'reference_explanations_preserved':all(a['text']==b['referenceText'] for a,b in zip(old['explanations'],new['explanations'])),'production_core_lexical_items':len(new['loadGuidance']['coreLexiconIds']),'all_previous_lexicon_entries_retained':len(new['lexicon'])==len(old['lexicon'])==10,'scaffolding_units':len(new['scaffolding'][0]['entries']),'before_controls':sum(t.get('control',False) for t in old['tasks']),'current_controls':sum(t.get('control',False) for t in new['tasks']),'dialogue_review':'All Spanish turns and Russian translations checked by assistant; L5 informal register translation aligned','assessment_scope':'Closed evidence plus understanding; written/spoken production remains honest self-assessment','load_status':'EDITORIAL_HEURISTIC; learner effort and independent ELE judgment unverified','source_sha256':sha((ROOT/path).read_bytes())})
 write_json(out/'content-changes.json',{'base_commit':'a6ffd4f36c2ab89c4c94e470dc14e73e5a732f9b','scope':'Corrected R6, no R7','changes':changes})
 write_json(out/'answer-key-review.json',{'scope':'All 90 constrained answer keys and allowed variants examined; free production has rubrics rather than a single answer','records':keys})
 write_json(out/'lesson-review.json',{'scope':'Six-lesson assistant review against SPEC and LESSON_STANDARD; official PCIC/CEFR and independent ELE not performed','lessons':lessons})
 print('Reviewed lesson registries:',len(lessons),'answer keys:',len(keys))
if __name__=='__main__':main()
