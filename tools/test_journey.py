#!/usr/bin/env python3
"""R3 UI checks: every scheme sound, source links and resumable learning."""
import collections,datetime,functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from audit import ROOT,write_json
from build import build
RESULTS=[]
def check(name,ok,evidence=None):RESULTS.append({'test':name,'status':'PASS' if ok else 'FAIL','evidence':evidence})
def main():
    artifact,manifest=build()
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':428,'height':926},is_mobile=True,has_touch=True)
        context.add_init_script("""window.__calls=[];window.__alerts=[];window.alert=x=>__alerts.push(String(x));window.confirm=()=>true;
        window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
        Object.defineProperty(speechSynthesis,'getVoices',{configurable:true,value:()=>[{lang:'es-ES'}]});
        Object.defineProperty(speechSynthesis,'speak',{configurable:true,value:u=>{__calls.push(u.text);u.onstart?.({});u.onend?.({})}});
        """)
        page=context.new_page();page.set_default_timeout(8000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}/'+str(artifact.relative_to(ROOT)))
        check('startup',not errors,errors[:])
        check('catalog_complete',page.evaluate("CATALOG.words.length===131&&CATALOG.tables.length===73&&CATALOG.schemeExercises.length===14"))
        audio_count=0
        for i in range(8):
            page.evaluate('(i)=>{schemeIndex=i;setLib("schemes")}',i)
            expected_rows=page.evaluate('(i)=>(DB.schemes[i].rows||DB.schemes[i].forms).length',i)
            check(f'scheme_{i}_rows_visible',page.locator('.scheme-forms tbody tr').count()==expected_rows)
            sounds=page.locator('.scheme-panel [data-speech]')
            for j in range(sounds.count()):
                text=sounds.nth(j).get_attribute('data-speech');before=page.evaluate('__calls.length');sounds.nth(j).click()
                check(f'scheme_{i}_sound_{j}',page.evaluate('__calls.length')==before+1 and page.evaluate('__calls.at(-1)')==text and not __import__('re').search('[А-Яа-яЁё]',text),text)
                audio_count+=1
            examples=page.evaluate('(i)=>DB.schemes[i].examples.map(e=>e[0])',i)
            whole=page.evaluate('(i)=>SchemeUI.allSpeech(i)',i)
            check(f'scheme_{i}_whole_includes_examples',all(e in whole for e in examples))
            tasks=page.evaluate('(i)=>DB.schemes[i].quiz',i)
            for j,q in enumerate(tasks):
                page.locator('#scheme-answer').fill(q[1]);page.locator('[data-scheme-check]').click()
                tid=page.evaluate('(a)=>CATALOG.schemeExercises.find(t=>t.legacyScheme===a[0]&&t.legacyIndex===a[1]).id',[i,j])
                check(f'scheme_{i}_exercise_{j}',page.evaluate('(id)=>state.miSchemePractice[id].lastCorrect',tid))
                if j<len(tasks)-1:page.locator('[data-scheme-next]').click()
        # Accent-specific negative and hinted answer do not receive independent credit.
        page.evaluate("schemeIndex=4;setLib('schemes');SchemeUI.next()")
        page.locator('#scheme-answer').fill('Donde vives?');page.locator('[data-scheme-check]').click()
        check('scheme_accent_negative',page.evaluate("state.miSchemePractice[CATALOG.schemeExercises.find(t=>t.legacyScheme===4&&t.legacyIndex===0).id].lastCorrect===false"))
        page.locator('[data-scheme-next]').click();page.locator('[data-scheme-hint]').click()
        before=page.evaluate("state.miSchemePractice[CATALOG.schemeExercises.find(t=>t.legacyScheme===4&&t.legacyIndex===1).id]?.correct||0")
        page.locator('#scheme-answer').fill('¿Cuánto cuesta?');page.locator('[data-scheme-check]').click()
        check('scheme_hint_not_independent',page.evaluate("state.miSchemePractice[CATALOG.schemeExercises.find(t=>t.legacyScheme===4&&t.legacyIndex===1).id].correct")==before)
        page.evaluate("schemeIndex=2;setLib('schemes')");page.locator('#schemeOwn').fill('Tengo ganas de practicar español.');page.locator('[data-scheme-save]').click()
        page.reload();page.evaluate("schemeIndex=2;setLib('schemes')")
        check('own_scheme_phrase_survives_reload',page.locator('#schemeOwn').input_value()=='Tengo ganas de practicar español.')
        page.locator('[data-scheme-source]').click()
        check('unverified_source_honest',page.locator('.warning').filter(has_text='ещё не подтверждена').count()==1)
        # All route and day refs resolve; no wrong fallback table.
        mapping=page.evaluate("ROUTE_DATA.routes.map(r=>({id:r.id,days:r.dayPlans.length,refs:[...r.tableIds,...r.schemeIds,...r.exerciseIds].every(id=>!!ContentIndex.get(id)),gaps:r.contentGaps.length}))")
        for r in mapping:check('route_'+r['id'],r['days']==7 and r['refs'] and r['gaps']>0,r)
        page.evaluate("RouteUI.set('week',1);navTo('today')")
        check('week1_uses_ser_estar',page.evaluate('weeklySection()')==10)
        page.locator('details summary').first.click()
        page.locator('[data-open-content]').first.click()
        check('week1_opens_correct_table',page.evaluate('section===10&&table===0'))
        # Duration plans use actual source references and can be resumed.
        counts=[]
        for minutes in [10,20,30]:
            page.evaluate('(m)=>{RouteUI.set("minutes",m);state.miJourney3={schema:1,events:[],completedDays:{},completedSessions:{},active:null};Journey.start()}',minutes)
            counts.append(page.evaluate('Journey.active().tasks.length'))
            check('duration_'+str(minutes),page.evaluate('Journey.active().minutes')==minutes)
        check('duration_changes_plan_size',counts[0]<counts[1]<counts[2],counts)
        page.evaluate("state.miJourney3={schema:1,events:[],completedDays:{},completedSessions:{},active:null};RouteUI.set('minutes',10);Journey.start()")
        page.locator('#journey-answer').fill('respuesta en borrador');page.wait_for_timeout(350);page.reload();page.evaluate("navTo('practice')")
        check('unfinished_draft_resumes_after_reload',page.locator('#journey-answer').input_value()=='respuesta en borrador')
        check('no_view_credit',page.evaluate('state.miJourney3.events.length')==0)
        # Complete six skills; listening requires completed playback.
        seen=[]
        while page.evaluate('!!Journey.active()'):
            t=page.evaluate('Journey.current()');seen.append(t['type'])
            if t['type']=='input':
                page.locator('#journey-answer').fill(t['expected']);page.locator('[data-journey-check]').click()
            elif t['type']=='reading':
                index=t['options'].index(t['meaning']);page.locator(f'[data-journey-choice="{index}"]').click()
            elif t['type']=='listening':
                check('listen_answer_disabled_before_audio',page.locator('[data-journey-choice]').first.is_disabled())
                page.locator('[data-speech]').click()
                index=t['options'].index(t['meaning']);page.locator(f'[data-journey-choice="{index}"]').click()
            elif t['type'] in ['writing','speaking']:
                page.locator('#journey-answer').fill('Estoy en casa. Tengo ganas de practicar.')
                page.locator('[name=journey-rubric]').first.check();page.locator('[data-journey-self]').click()
            page.locator('[data-journey-next]').click()
        check('full_cycle_six_skills',set(page.evaluate('state.miJourney3.events.filter(e=>e.performed).map(e=>e.skill)'))=={'vocabulary','grammar','reading','listening','writing','speaking'},seen)
        check('completed_day_recorded',page.evaluate('Object.keys(state.miJourney3.completedDays).length')==1)
        check('self_assessment_not_objective',page.evaluate("state.miJourney3.events.filter(e=>['speaking','writing'].includes(e.skill)).every(e=>e.ok===null&&e.selfAssessed)"))
        # Transcript fallback must record reading, never audio success.
        page.evaluate("Journey.start()")
        while page.evaluate("Journey.current()?.type!=='listening'"):
            t=page.evaluate('Journey.current()')
            if t['type']=='input':page.locator('#journey-answer').fill(t['expected']);page.locator('[data-journey-check]').click()
            elif t['type']=='reading':page.locator(f'[data-journey-choice="{t["options"].index(t["meaning"])}"]').click()
            page.locator('[data-journey-next]').click()
        page.locator('[data-journey-transcript]').click();t=page.evaluate('Journey.current()');page.locator(f'[data-journey-choice="{t["options"].index(t["meaning"])}"]').click()
        check('transcript_is_reading',page.evaluate("state.miJourney3.events.at(-1).skill==='reading'&&state.miJourney3.events.at(-1).transcriptUsed"))
        # Unknown content gaps do not mark a day complete.
        page.evaluate("state.miJourney3={schema:1,events:[],completedDays:{},completedSessions:{},active:null};RouteUI.set('week',3);Journey.start()")
        gaps=page.evaluate('Journey.active().tasks.filter(t=>t.type==="gap").length')
        check('content_gaps_explicit',gaps>=2,gaps)
        # Backup contains in-flight task and its draft; fresh storage can restore it.
        page.evaluate("state.miJourney3.active.drafts[Journey.current().id]={text:'restaurar ñ'};save()")
        backup=page.evaluate('async()=>await BackupService.create()')
        page.evaluate("state.miJourney3.active=null;localStorage.clear()");page.reload();page.evaluate('openSettings()')
        before=page.evaluate('__alerts.length')
        page.locator('#mi11-backup').set_input_files({'name':'r3-backup.json','mimeType':'application/json','buffer':json.dumps(backup,ensure_ascii=False).encode()})
        page.wait_for_function('(n)=>__alerts.length>n',arg=before);page.evaluate("navTo('practice')")
        check('backup_restores_active_lesson',page.locator('#journey-answer').input_value()=='restaurar ñ')
        # Visual vocabulary list no longer has truncated onclick handlers.
        page.evaluate("Journey.leave();visualMode='body';setLib('visual')")
        page.locator('details summary').last.click();page.locator('[data-visual-word]').first.click()
        check('visual_word_list_click',page.evaluate('visualChosen[0]')==page.evaluate('VISUAL_DATA.body[0][0]'))
        for theme in ['light','dark']:
            page.evaluate('(v)=>setTheme(v)',theme)
            for width in [320,375,428,430]:
                page.set_viewport_size({'width':width,'height':926})
                for tab in ['today','library','words','practice','progress']:
                    page.evaluate('(v)=>navTo(v)',tab)
                    check(f'layout_{theme}_{width}_{tab}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        check('no_javascript_errors',not errors,errors)
        page.set_viewport_size({'width':428,'height':926});page.evaluate("setTheme('light');schemeIndex=2;setLib('schemes')")
        page.screenshot(path=str(ROOT/'audit/restoration-r3/tener-428.png'),full_page=True)
        page.evaluate("navTo('today')");page.screenshot(path=str(ROOT/'audit/restoration-r3/today-428.png'),full_page=True)
        version=browser.version;context.close();browser.close()
    server.shutdown()
    summary=dict(collections.Counter(r['status'] for r in RESULTS))
    write_json(ROOT/'audit/restoration-r3/journey-tests.json',{'run_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'artifact_sha256':manifest['artifact_sha256'],'browser':version,'audio':'Mocked Spanish voice/output. User reported R2 launch/dictionary sound works on iPhone; R3 device recheck pending.','scheme_audio_buttons_clicked':audio_count,'summary':summary,'results':RESULTS})
    print(summary)
    for r in RESULTS:
        if r['status']=='FAIL':print(r)
    if summary.get('FAIL'):raise SystemExit(1)
if __name__=='__main__':main()
