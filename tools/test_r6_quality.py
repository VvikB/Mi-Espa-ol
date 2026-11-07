#!/usr/bin/env python3
"""Evidence for review defects: old-state preservation, meaningful mastery and targeted repairs."""
import collections,functools,http.server,json,threading
from playwright.sync_api import sync_playwright
from audit import ROOT,write_json,parse_html
from build_r6_review import build,OUT

def main():
 artifact,manifest=build();results=[]
 def check(name,ok,evidence=None):results.append(dict(test=name,status='PASS' if ok else 'FAIL',evidence=evidence))
 class Quiet(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=browser.new_context(viewport={'width':428,'height':926},is_mobile=True,has_touch=True)
  context.add_init_script("window.__alerts=[];window.alert=x=>__alerts.push(x);window.confirm=()=>true;window.__spoken=[];window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};Object.defineProperty(speechSynthesis,'getVoices',{value:()=>[{lang:'es-ES',name:'test'}]});Object.defineProperty(speechSynthesis,'speak',{value:u=>{__spoken.push(u.text);u.onstart?.({});u.onend?.({})}})")
  page=context.new_page();page.set_default_timeout(8000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));base=f'http://127.0.0.1:{server.server_port}/'
  page.goto(base+'pilot/Mi_Espanol_Pilot_R6.html')
  page.evaluate("(()=>{state.session.privateNote='Мои записи: mañana';state.vocab['41']={n:3,due:4102444800000};state.miRecall11={[mi11RecallId(DB.vocab[41])]:{steps:3,next:4102444800000}};state.miJourney3={schema:1,events:[],completedDays:{},completedSessions:{},active:null,lessonReviews:{'A1-01':{steps:3,next:4102444800000,passed:true,correct:3,total:3,custom:'keep'}}};LessonUI.start('A1-01');Journey.active().drafts[Journey.current().id]={text:'Мой черновик'};save();return true})()")
  before=page.evaluate('({state:state,ids:[...CATALOG.words,...CATALOG.tables,...CATALOG.lessons,...CATALOG.lessonElements].map(r=>r.id),keys:DB.vocab.map(mi11RecallId)})')
  page.goto(base+str(artifact.relative_to(ROOT)));after=page.evaluate('({state:state,keys:DB.vocab.map(mi11RecallId)})')
  check('R6_user_progress_byte_semantics_preserved',after['state']==before['state'])
  check('word_recall_keys_preserved',after['keys']==before['keys'])
  ids=page.evaluate('[...CATALOG.words,...CATALOG.tables,...CATALOG.lessons,...CATALOG.lessonElements].map(r=>r.id)');check('all_previous_IDs_retained',set(before['ids']).issubset(ids))
  check('DB_entirely_unchanged',parse_html(ROOT/'pilot/Mi_Espanol_Pilot_R6.html')[2]==parse_html(artifact)[2])
  def run_cycle(wrong_reading=False,legacy=False):
   while page.evaluate('!!Journey.active()'):
    t=page.evaluate('Journey.current()')
    if t.get('stage'):pass
    elif t['type'] in ['writing','speaking']:
     page.locator('#journey-answer').fill('Hola. Me llamo Ana y estudio español. Hoy estoy en casa y quiero practicar con una amiga. Mañana vamos a tomar un café juntos y después voy a estudiar en la biblioteca.')
     for c in page.locator('[name=journey-rubric]').all():c.check()
     page.locator('[data-lesson-self]').click()
    else:
     if t['type']=='listening':page.locator('[data-speech]').click()
     wrong=wrong_reading and t['id']=='A1-01:task:07'
     if t.get('options'):
      i=t['options'].index(t['expected']);page.locator('[data-lesson-choice]').nth((i+1)%len(t['options']) if wrong else i).click()
     else:page.locator('#journey-answer').fill(t['expected']);page.locator('[data-lesson-check]').click()
    page.locator('[data-lesson-next]').click()
  page.locator('[data-journey-start]').click();run_cycle(legacy=True)
  check('legacy_saved_session_not_falsely_upgraded',page.evaluate('state.miJourney3.lastSummary.currentAssessment===false'))
  check('legacy_lesson_review_unchanged',page.evaluate("state.miJourney3.lessonReviews['A1-01']")==before['state']['miJourney3']['lessonReviews']['A1-01'])
  page.evaluate("LessonUI.start('A1-01')");run_cycle(wrong_reading=True)
  review=page.evaluate("state.miJourney3.lessonReviews['A1-01']")
  check('correct_controls_do_not_mask_reading_error',review['controlPassed'] and not review['comprehensionPassed'] and not review['passed'],review)
  check('old_review_archived_with_unknown_fields',review['priorAssessment']['custom']=='keep' and review['custom']=='keep')
  candidates=page.evaluate("LessonAssessment.candidates(LESSON_DATA[0]).map(t=>t.id)")
  page.evaluate("navTo('progress')");check('error_log_in_progress','Уроки R6: результаты и ошибки' in page.locator('#app').inner_text());page.evaluate("navTo('practice')")
  check('specific_error_only_queued',candidates==['A1-01:task:07'],candidates)
  page.locator('[data-lesson-review]').click();check('targeted_session_contains_only_failed_ID',page.evaluate("Journey.active().reviewOnly&&Journey.active().tasks.length===1&&Journey.current().id==='A1-01:task:07'"))
  t=page.evaluate('Journey.current()');page.locator('[data-lesson-choice]').nth(t['options'].index(t['expected'])).click();page.locator('[data-lesson-next]').click()
  check('repair_updates_actual_result',page.evaluate("state.miJourney3.lessonReviews['A1-01'].passed&&state.miJourney3.taskReviews['A1-01:task:07'].lastCorrect"))
  check('targeted_repeat_not_full_cycle_claim',page.evaluate('state.miJourney3.lastSummary.reviewOnly===true') and 'Работа над ошибками завершена' in page.locator('#app').inner_text())
  check('task_backup_roundtrip',page.evaluate('async()=>{const b=await BackupService.create(),v=await BackupService.validate(b);return StateStore.canonical(v.progress.miJourney3.taskReviews)===StateStore.canonical(state.miJourney3.taskReviews)}'))
  # Scheduling is based on the result and elapsed interval, not repeated clicks.
  spaced=page.evaluate("""(()=>{const original=Date.now,t=LESSON_DATA[0].tasks.find(t=>t.id==='A1-01:task:14'),saved=StateStore.clean(state.miJourney3.taskReviews[t.id]);let now=2000000000000;Date.now=()=>now;try{delete state.miJourney3.taskReviews[t.id];const e={ok:true,performed:true,sessionId:'synthetic',id:'one',answer:t.expected};LessonAssessment.record(t,e,2);const first=StateStore.clean(state.miJourney3.taskReviews[t.id]);now+=1000;LessonAssessment.record(t,{...e,id:'two'},2);const early=StateStore.clean(state.miJourney3.taskReviews[t.id]);now=first.next+1;LessonAssessment.record(t,{...e,id:'three'},2);const due=StateStore.clean(state.miJourney3.taskReviews[t.id]);LessonAssessment.record(t,{...e,id:'four',ok:false},2);const failed=StateStore.clean(state.miJourney3.taskReviews[t.id]);return {first,early,due,failed,now}}finally{Date.now=original;state.miJourney3.taskReviews[t.id]=saved;}})()""")
  check('early_correct_does_not_inflate_interval',spaced['first']['steps']==spaced['early']['steps']==1 and spaced['first']['next']==spaced['early']['next'])
  check('due_correct_advances_interval',spaced['due']['steps']==2 and spaced['due']['next']-spaced['now']==3*86400000)
  check('failure_schedules_specific_task_soon',spaced['failed']['steps']==0 and spaced['failed']['needsWork'] and spaced['failed']['next']-spaced['now']==600000)
  keys=page.evaluate("LESSON_DATA.flatMap(l=>l.tasks.filter(t=>t.expected).map(t=>({id:t.id,valid:[t.expected,...t.alternatives].every(v=>LessonAssessment.matches(t,v)),wrongOptions:(t.options||[]).filter(v=>v!==t.expected).every(v=>!LessonAssessment.matches(t,v))})))")
  for t in keys:check('key_and_variants_'+t['id'],t['valid'] and t['wrongOptions'])
  check('shuffled_positions_and_source_immutable',page.evaluate("(()=>{const source=LESSON_DATA[0].tasks,before=JSON.stringify(source),a=LessonAssessment.shuffle(StateStore.clean(source),'alpha'),b=LessonAssessment.shuffle(StateStore.clean(source),'beta');return before===JSON.stringify(source)&&a.some((t,i)=>(t.options||[]).length&&JSON.stringify(t.options)!==JSON.stringify(b[i].options))&&a.every(t=>!(t.options||[]).length||t.options.includes(t.expected))})()"))
  # Enter must use the same strict question validation as the check button.
  page.evaluate("LessonUI.start('A1-01');const a=Journey.active();a.step=a.tasks.findIndex(t=>t.id==='A1-01:task:16');save();render()")
  page.locator('#journey-answer').fill('Puedes repetir');page.locator('#journey-answer').press('Enter');check('enter_requires_question_signs',page.evaluate('Journey.active().results[Journey.current().id].ok===false'))
  check('all_answer_rules_resolve',page.evaluate("LESSON_DATA.every(l=>l.tasks.filter(t=>t.expected).every(t=>t.explanationRefs.length&&t.explanationRefs.every(id=>!!ContentIndex.get(id).value)))"))
  check('support_and_reference_visible',page.evaluate("LESSON_DATA.every(l=>l.scaffolding.length&&l.explanations.every(e=>e.referenceText))"))
  check('no_js_errors',not errors,errors);page.screenshot(path=str(OUT/'review-428.png'),full_page=True);browser.close()
 server.shutdown();report={'artifact_sha256':manifest['artifact_sha256'],'scope':'R6 content acceptance fixes; no independent ELE or direct PCIC verification','summary':dict(collections.Counter(r['status'] for r in results)),'results':results};write_json(OUT/'quality-tests.json',report);print(report['summary'])
 for r in results:
  if r['status']=='FAIL':print(r)
 if report['summary'].get('FAIL'):raise SystemExit(1)
if __name__=='__main__':main()
