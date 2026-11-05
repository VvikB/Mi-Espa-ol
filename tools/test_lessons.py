#!/usr/bin/env python3
"""Course UI, grading honesty, TTS dispatch, saved Journey and R5 compatibility."""
import argparse,collections,functools,http.server,json,threading
from playwright.sync_api import sync_playwright
from audit import ROOT,parse_html,write_json
from build import build

def main(prototype=False):
 artifact,manifest=build(revision='R6');lessons=[json.loads(p.read_text()) for p in sorted((ROOT/'data/lessons').glob('A1-*.json'))];results=[]
 def check(name,ok,evidence=None):results.append(dict(test=name,status='PASS' if ok else 'FAIL',evidence=evidence))
 if prototype:check('prototype_scope_one_lesson',len(lessons)==1)
 else:check('six_complete_lessons',len(lessons)==6)
 for l in lessons:
  check(l['id']+'_content_blocks',len(l['explanations'])>=3 and len(l['lexicon'])>=8 and len(l['dialogue']['turns'])>=6 and len(l['reading']['text'].split())>=50 and len(l['listening']['text'].split())>=30)
  check(l['id']+'_practice_balance',all(any(t['type']==k for t in l['tasks']) for k in ['input','reading','listening','writing','speaking']) and sum(bool(t.get('control')) for t in l['tasks'])>=3 and any(t.get('transfer') for t in l['tasks']))
  check(l['id']+'_honest_review_status',l['methodicalReview']=='INDEPENDENT_REVIEW_PENDING')
 class Quiet(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':428,'height':926},is_mobile=True,has_touch=True)
  context.add_init_script("window.__sounds=[];window.__alerts=[];window.alert=x=>__alerts.push(x);window.confirm=()=>true;window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};Object.defineProperty(speechSynthesis,'getVoices',{configurable:true,value:()=>[{lang:'es-ES',name:'test'}]});Object.defineProperty(speechSynthesis,'speak',{configurable:true,value:u=>{__sounds.push(u.text);u.onstart?.({});u.onend?.({})}})")
  page=context.new_page();page.set_default_timeout(8000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));url=f'http://127.0.0.1:{server.server_port}/'
  if not prototype:
   page.goto(url+'pilot/Mi_Espanol_Pilot_R5.html')
   page.evaluate("(()=>{state.vocab['170']={n:3,due:4102444800000};state.miRecall11={};for(const w of DB.vocab)state.miRecall11[mi11RecallId(w)]={steps:2,next:4102444800000};state.session['scheme-2']='Tengo ganas de practicar.';state.personalNotes={text:'Mi nota: mañana'};Journey.start();save();return true})()")
   before=page.evaluate('({v:state.vocab,r:state.miRecall11,s:state.session,p:state.personalNotes,a:Journey.active(),ids:CATALOG.words.map(w=>w.id),keys:DB.vocab.map(mi11RecallId)})')
  page.goto(url+str(artifact.relative_to(ROOT)))
  if not prototype:
   after=page.evaluate('({v:state.vocab,r:state.miRecall11,s:state.session,p:state.personalNotes,a:Journey.active(),ids:CATALOG.words.map(w=>w.id),keys:DB.vocab.map(mi11RecallId)})')
   check('R5_to_R6_all_progress_and_IDs',before==after)
   check('R5_to_R6_DB_unchanged',parse_html(ROOT/'pilot/Mi_Espanol_Pilot_R5.html')[2]==parse_html(artifact)[2])
  page.evaluate("if(state.miJourney3)state.miJourney3.active=null;save();LessonUI.start('A1-01')")
  page.evaluate('ContentIndex.open(CATALOG.exercises[0].id)')
  check('legacy_quiz_access_while_lesson_paused',page.locator('#quizInput').count()==1 and page.locator('[data-lesson-next]').count()==0)
  page.evaluate("navTo('today')");page.locator('[data-journey-start]').click()
  check('resume_after_legacy_access',page.locator('[data-lesson-next]').count()==1 and page.evaluate("Journey.active().lessonId==='A1-01'"))
  check('opening_does_not_award',page.evaluate("state.miJourney3.events.filter(e=>e.sessionId===Journey.active().id).length===0"))
  # Grade accents and ñ as distinct; opening a hint cannot grant independent success.
  page.locator('[data-lesson-next]').click();page.locator('[data-lesson-next]').click();page.locator('[data-lesson-next]').click()
  check('study_not_learning_success',page.evaluate('state.miJourney3.events.slice(-3).every(e=>e.performed===false&&e.ok===null)'))
  while page.evaluate('Journey.current()?.expected')!='café':
   t=page.evaluate('Journey.current()');page.locator('[data-lesson-choice]').nth(t['options'].index(t['expected'])).click();page.locator('[data-lesson-next]').click()
  check('next_disabled_without_answer',page.locator('[data-lesson-next]').is_disabled())
  page.locator('#journey-answer').fill('cafe');page.locator('[data-lesson-check]').click();check('accent_negative',page.evaluate('Journey.active().results[Journey.current().id].ok===false'))
  page.locator('[data-lesson-next]').click();page.locator('#journey-answer').fill('ano');page.locator('[data-lesson-check]').click();check('enye_negative',page.evaluate('Journey.active().results[Journey.current().id].ok===false'))
  # First listening has no visible transcript; fallback is reading, never audio success.
  while page.evaluate('Journey.current()?.type')!='listening':
   t=page.evaluate('Journey.current()')
   if t.get('options'):page.locator('[data-lesson-choice]').nth(t['options'].index(t['expected'])).click()
   page.locator('[data-lesson-next]').click()
  check('audio_text_hidden',page.evaluate('!document.getElementById("app").innerText.includes(Journey.current().text)'))
  check('audio_gate_disabled',page.locator('[data-lesson-choice]').first.is_disabled())
  page.locator('[data-lesson-transcript]').click();t=page.evaluate('Journey.current()');page.locator('[data-lesson-choice]').nth(t['options'].index(t['expected'])).click()
  check('transcript_counts_reading',page.evaluate('state.miJourney3.events.at(-1).skill==="reading"&&state.miJourney3.events.at(-1).transcriptUsed'))
  # Fresh complete sessions use the same Journey state and IDs, not a second progress store.
  for run_index,l in enumerate(lessons+([] if prototype else [lessons[0]])):
   negative=run_index==len(lessons)
   page.evaluate('(id)=>{Journey.flushDraft();state.miJourney3.active=null;save();LessonUI.start(id)}',l['id'])
   while page.evaluate('!!Journey.active()'):
    t=page.evaluate('Journey.current()')
    if t.get('stage'):pass
    elif t['type'] in ['writing','speaking']:
     page.locator('#journey-answer').fill('Hola. Me llamo Ana y estudio español. Hoy estoy en casa y quiero practicar con una amiga. Mañana vamos a tomar un café juntos y después voy a estudiar en la biblioteca.')
     for checkbox in page.locator('[name=journey-rubric]').all():checkbox.check()
     page.locator('[data-lesson-self]').click();check(t['id']+'_self_not_objective',page.evaluate('Journey.active().results[Journey.current().id].ok===null'))
    else:
     if t['type']=='listening':
      if negative:page.locator('[data-lesson-transcript]').click()
      else:page.locator('[data-speech]').click();check(t['id']+'_TTS',page.evaluate('__sounds.at(-1)')==t['text'])
     if t.get('control'):check(t['id']+'_no_hint',page.locator('[data-lesson-hint]').count()==0)
     if t.get('options'):page.locator('[data-lesson-choice]').nth((t['options'].index(t['expected'])+1)%len(t['options']) if negative and t.get('control') else t['options'].index(t['expected'])).click()
     else:
      page.locator('#journey-answer').fill('incorrecto' if negative and t.get('control') else (t.get('alternatives') or [t['expected']])[0]);page.locator('[data-lesson-check]').click()
     check(t['id']+'_correct',page.evaluate('Journey.active().results[Journey.current().id].ok')==(not (negative and t.get('control',False))))
    if t.get('stage')=='dialogue':
     page.locator('[data-lesson-translation]').click();check(l['id']+'_dialogue_translation',l['dialogue']['turns'][0]['ru'] in page.locator('#app').inner_text())
    if t['type']=='writing':
     old=page.evaluate('Journey.active()');page.reload();page.locator('[data-journey-start]').click();check(l['id']+'_resume_after_reload',page.evaluate('Journey.active()')==old)
    page.locator('[data-lesson-next]').click()
   check(l['id']+'_control_passed',page.evaluate('(id)=>state.miJourney3.lessonReviews[id].passed',l['id'])== (not negative))
   check(l['id']+'_next_lesson_link',page.get_by_role('button',name='Следующий урок',exact=True).count()==(0 if l['id']=='A1-06' else 1))
   check(l['id']+'_no_false_content_gaps',page.evaluate('state.miJourney3.lastSummary.gaps===0'))
   check(l['id']+'_due_in_future',page.evaluate('(id)=>state.miJourney3.lessonReviews[id].next>Date.now()',l['id']))
  page.evaluate('ContentIndex.open(CATALOG.exercises[0].id)')
  check('legacy_quiz_access_after_completion',page.locator('#quizInput').count()==1)
  check('course_backup_roundtrip',page.evaluate('async()=>{const b=await BackupService.create(),p=await BackupService.validate(b);return StateStore.canonical(p.progress.miJourney3)===StateStore.canonical(state.miJourney3)}'))
  check('events_unique',page.evaluate('new Set(state.miJourney3.events.map(e=>e.id)).size===state.miJourney3.events.length'))
  check('storage_not_locked',page.locator('#recovery-storage-status').is_hidden(),page.evaluate('__alerts'))
  page.evaluate("LessonUI.show('A1-01')")
  for width in [320,375,428]:
   page.set_viewport_size({'width':width,'height':926});check('mobile_width_'+str(width),page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  page.screenshot(path=str(ROOT/'audit/restoration-r6'/('prototype-428.png' if prototype else 'lessons-428.png')),full_page=True)
  check('no_js_errors',not errors,errors);browser.close()
 server.shutdown();report={'artifact_sha256':manifest['artifact_sha256'],'scope':'Prototype internal gate' if prototype else 'Six lessons, grading honesty, R5 migration and shared progress','device':'Chromium mobile emulation; real iPhone NOT TESTED','summary':dict(collections.Counter(r['status'] for r in results)),'results':results};write_json(ROOT/'audit/restoration-r6'/('prototype-tests.json' if prototype else 'lesson-tests.json'),report);print(report['summary'])
 for r in results:
  if r['status']=='FAIL':print(r)
 if report['summary'].get('FAIL'):raise SystemExit(1)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--prototype',action='store_true');main(p.parse_args().prototype)
