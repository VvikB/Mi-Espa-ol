#!/usr/bin/env python3
"""Current browser evidence for immutable candidates; failing product checks remain FAIL."""
import collections, datetime, functools, http.server, importlib.metadata, json, threading, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from audit import ROOT, write_json, sha
RESULTS=[]

def record(candidate, name, ok, evidence=None, status=None):
    RESULTS.append({'candidate':candidate,'test':name,'status':status or ('PASS' if ok else 'FAIL'),'evidence':evidence})

def main():
    handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT))
    class Quiet(handler.func):
        def log_message(self,*a): pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    screenshots=ROOT/'audit/screenshots';screenshots.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        for f in sorted((ROOT/'originals/starter/source_candidates').glob('*.html')):
            name=f.name;context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            context.add_init_script("""window.__audioCalls=[];window.__alerts=[];window.alert=s=>window.__alerts.push(String(s));window.confirm=()=>true;Object.defineProperty(window.speechSynthesis,'speak',{value:u=>window.__audioCalls.push(u.text),configurable:true});""")
            page=context.new_page();errors=[];requests=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('request',lambda r:requests.append(r.url))
            url=f'http://127.0.0.1:{server.server_port}/'+str(f.relative_to(ROOT))
            page.goto(url);record(name,'startup',len(errors)==0,{'title':page.title(),'errors':errors[:]})
            inventory=page.evaluate("({db:contentManifest(),scenes:Object.keys(VISUAL_DATA),sceneItems:Object.values(VISUAL_DATA).reduce((a,b)=>a+b.length,0),hasRecall:typeof mi11RecallBegin==='function',hasBackupV2:typeof mi11MakeBackup==='function'})")
            write_json(ROOT/'audit/runtime'/f.with_suffix('.json').name,{'sha256':sha(f.read_bytes()),'inventory':inventory})
            record(name,'runtime_inventory',inventory['db']['words']==131 and inventory['db']['images']==25,inventory)
            # Five real navigation controls at four widths and both themes.
            for theme in ['light','dark']:
                page.evaluate('(t)=>setTheme(t)',theme)
                for width in [320,375,390,430]:
                    page.set_viewport_size({'width':width,'height':844})
                    for v in ['today','library','words','practice','progress']:
                        page.locator(f'#nav button[onclick="navTo(\'{v}\')"]').click()
                        dims=page.evaluate('({view,body:document.documentElement.scrollWidth,viewport:innerWidth,nav:document.querySelectorAll("#nav button").length})')
                        record(name,f'nav_{theme}_{width}_{v}',dims['view']==v and dims['body']<=width and dims['nav']==5,dims)
            page.set_viewport_size({'width':390,'height':844});page.evaluate("setTheme('light');navTo('today')")
            page.screenshot(path=str(screenshots/(f.stem+'-today-390.png')),full_page=True)
            # Runtime click handlers are not covered by node --check.
            page.evaluate("navTo('words')")
            before=len(errors)
            buttons=page.locator('#wordsList button');total=buttons.count()
            initial=page.evaluate('__audioCalls.length')
            for i in range(total):buttons.nth(i).click()
            calls=page.evaluate('__audioCalls.length')-initial
            record(name,'dictionary_audio_all_rows',calls==total and len(errors)==before,{'buttons_clicked':total,'speech_calls':calls,'new_errors':errors[before:before+4],'new_error_count':len(errors)-before,'first_handler':buttons.first.get_attribute('onclick')})
            page.evaluate('showWordCard()');before=len(errors);initial=page.evaluate('__audioCalls.length')
            page.locator('#wordCard button').first.click()
            record(name,'legacy_card_audio_click',page.evaluate('__audioCalls.length')==initial+1,{'handler':page.locator('#wordCard button').first.get_attribute('onclick'),'new_errors':errors[before:]})
            page.evaluate("state.vocab={};state.vocab['2']={n:1,due:0};")
            record(name,'legacy_due_before_new',page.evaluate('chooseWord()')==2,{'selected':page.evaluate('chooseWord()'),'expected_due_index':2})
            # Accent-sensitive typed response, negative and positive through actual UI.
            q=page.evaluate("({i:DB.quiz.findIndex(q=>/[áéíóúñ]/.test(q.a)),a:DB.quiz.find(q=>/[áéíóúñ]/.test(q.a))?.a})")
            if q['i']>=0:
                page.evaluate('(i)=>{quizIndex=i;quizShown=false;navTo("practice")}',q['i'])
                page.locator('#quizInput').fill(q['a'].replace('í','i').replace('é','e').replace('á','a').replace('ó','o').replace('ú','u').replace('ñ','n'))
                page.get_by_role('button',name='Проверить',exact=True).click()
                record(name,'written_accent_negative',page.evaluate('state.answers[String(quizIndex)].correct') is False,q)
                page.evaluate('quizShown=false;render()');page.locator('#quizInput').fill(q['a']);page.get_by_role('button',name='Проверить',exact=True).click()
                record(name,'written_accent_positive',page.evaluate('state.answers[String(quizIndex)].correct') is True,q)
            page.reload();record(name,'progress_survives_http_reload',page.evaluate('Object.keys(state.answers).length')>0)
            # All images decode, including original data URLs; dimensions are actual browser facts.
            image_results=page.evaluate("async()=>{return await Promise.all(DB.images.map(async x=>{const i=new Image();i.src=x.src;try{await i.decode();return {id:x.id,ok:true,width:i.naturalWidth,height:i.naturalHeight}}catch(e){return {id:x.id,ok:false}}}))}")
            record(name,'all_25_images_decode',len(image_results)==25 and all(x['ok'] for x in image_results),image_results)
            write_json(ROOT/'audit/runtime'/(f.stem+'-images.json'),image_results)
            # Verify all six/original four scene quizzes via UI, not only object counts.
            for scene in inventory['scenes']:
                page.evaluate('(k)=>{visualMode=k;visualChosen=null;setLib("visual")}',scene)
                count=page.locator('svg').count();record(name,f'scene_{scene}_renders',count==1,{'svg_count':count,'items':page.evaluate('(k)=>VISUAL_DATA[k].length',scene)})
                if inventory['hasRecall']:
                    page.get_by_role('button',name='Проверить знания',exact=True).click();page.evaluate('mi11Answer(0)')
                    record(name,f'scene_{scene}_quiz_records',page.evaluate('(k)=>state.miVisual11[k].attempts===1&&state.miVisual11[k].correct===1',scene))
            # Table form handlers compile after rendering? No execution of arbitrary input.
            page.evaluate("section=DB.atlas.findIndex(s=>s[1].some(tableIsConjugation));table=DB.atlas[section][1].findIndex(tableIsConjugation);studyHide=true;setLib('tables')")
            compiled=page.evaluate("[...document.querySelectorAll('.form-task [onclick],.form-task [onkeydown]')].map(e=>{let s=e.getAttribute('onclick')||e.getAttribute('onkeydown');try{new Function('event',s);return {ok:true}}catch(x){return {ok:false,handler:s,error:x.message}}})")
            record(name,'table_form_handlers_compile',bool(compiled) and all(x['ok'] for x in compiled),{'handlers':len(compiled),'invalid':sum(not x['ok'] for x in compiled),'examples':[x for x in compiled if not x['ok']][:3]})
            # Week routes are inspected for actual semantic association.
            weekly=page.evaluate('DB.weeks.map((w,i)=>{state.week=i+1;return {week:i+1,title:w[0],grammar:DB.atlas[weeklySection()][0],quizzes:weeklyQuizzes()}})')
            write_json(ROOT/'audit/runtime'/(f.stem+'-weeks.json'),weekly)
            record(name,'week1_route_ser_estar',bool(__import__('re').search('ser|estar',weekly[0]['grammar'],__import__('re').I)),weekly[0])
            # Unified speak route with mocked device output, not proof of audibility.
            initial=page.evaluate('__audioCalls.length');page.evaluate("speak('¡Hola! ¿Qué tal, señor?')")
            record(name,'speech_service_invocation_mocked',page.evaluate('__audioCalls.length')==initial+1,{'text':page.evaluate('__audioCalls.at(-1)'),'physical_sound':'NOT_TESTED'})
            page.evaluate("openSettings();setTheme('dark')");page.screenshot(path=str(screenshots/(f.stem+'-settings-dark-390.png')),full_page=True)
            targets=page.evaluate("[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({text:e.textContent.trim().slice(0,50),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(e=>e.w<44||e.h<44)")
            record(name,'settings_touch_targets_44px',not targets,targets[:15])
            # Contrast check over computed button foreground and effective solid background.
            contrast=page.evaluate(r"""()=>{function rgb(s){const n=s.match(/[\d.]+/g);return n?n.map(Number):[0,0,0,0]}function lum(v){let a=v.slice(0,3).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return .2126*a[0]+.7152*a[1]+.0722*a[2]}return [...document.querySelectorAll('button')].filter(e=>e.offsetWidth).map(e=>{let fg=rgb(getComputedStyle(e).color),p=e,bg;while(p){bg=rgb(getComputedStyle(p).backgroundColor);if(bg.length<4||bg[3]===1)break;p=p.parentElement}if(!p)bg=[255,255,255];const a=lum(fg),b=lum(bg);return {text:e.textContent.trim().slice(0,40),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}})}""")
            record(name,'dark_settings_button_contrast_AA',all(x['ratio']>=4.5 for x in contrast),{'minimum':min(x['ratio'] for x in contrast),'below_4_5':[x for x in contrast if x['ratio']<4.5]})
            if inventory['hasBackupV2']:
                # UI backup/restore round-trip with a real download and file-input import.
                page.evaluate("state={week:3,answers:{'0':{n:2,correct:true,due:123456}},vocab:{'1':{n:1,due:99999}},favorites:{x:true},session:{note:'España ñ á'},miRecall11:{test:{steps:1,next:123,attempts:1,correct:1}}};save();openSettings();")
                with page.expect_download() as download_info:page.get_by_role('button',name='Сохранить копию v2',exact=True).click()
                backup=json.loads(Path(download_info.value.path()).read_text());before_state=page.evaluate('JSON.stringify(state)')
                page.evaluate("state={week:1,answers:{},vocab:{},favorites:{},session:{}};save()")
                page.locator('#mi11-backup').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(backup,ensure_ascii=False).encode()})
                page.wait_for_function("state.week===3")
                record(name,'backup_ui_roundtrip_progress',json.loads(before_state)==page.evaluate('JSON.parse(JSON.stringify(state))'),{'format':backup['format'],'checksum_algorithm':backup['checksum'].split(':')[0]})
                round1=page.evaluate('JSON.stringify(state)');page.locator('#mi11-backup').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(backup).encode()});page.wait_for_timeout(100)
                record(name,'backup_repeated_same_file_idempotent',json.loads(round1)==page.evaluate('JSON.parse(JSON.stringify(state))'))
                malformed=page.evaluate("(()=>{let b=mi11MakeBackup({week:1,answers:{},vocab:{}});b.state.week=2;try{mi11ValidateBackup(b);return false}catch(e){return true}})()")
                record(name,'backup_checksum_rejects_tampering',malformed)
                proto=page.evaluate("(()=>{try{mi11Clean(JSON.parse('{\"__proto__\":{\"polluted\":true}}'));return false}catch(e){return true}})()")
                record(name,'backup_rejects_prototype_keys',proto)
                invalid=page.evaluate("(()=>{try{mi11ValidateBackup(mi11MakeBackup({week:99,answers:[]}));return false}catch(e){return true}})()")
                record(name,'backup_rejects_invalid_state_schema',invalid,{'invalid_input':{'week':99,'answers':[]}})
                older=page.evaluate("(()=>{const a={answers:{'0':{n:5,correct:true,due:999999}}},b={answers:{'0':{n:0,correct:false,due:1}}};return mi11Merge(mi11Clean(a),mi11Clean(b)).answers['0'].n===5})()")
                record(name,'backup_preserves_newer_progress',older,{'merge_policy':'incoming values overwrite current values; no timestamp ordering'})
                record(name,'backup_includes_separate_settings',all(k in backup['state'] for k in ['theme','audioRate']),{'state_keys':list(backup['state']),'separate_keys':['mi-espanol-theme-v1','mi-espanol-recovery11-settings-v1'],'scope':'full state+settings requirement not met'})
                # Frozen clock: one overdue item and unseen items. Expected overdue first.
                due=page.evaluate("(()=>{const old=Date.now;Date.now=()=>2000;state.miRecall11={};const r=mi11RecallRecords();state.miRecall11[mi11RecallId(r[1])]={next:1000,steps:1};mi11RecallChoose();const selected=mi11RecallIndex;Date.now=old;return selected})()")
                record(name,'active_recall_due_before_unseen',due==1,{'due_index':1,'selected_index':due,'frozen_now':2000})
                page.evaluate("state.miRecall11={};mi11RecallChoose();navTo('words')");before_grade=page.evaluate('JSON.stringify(state.miRecall11)');page.evaluate('mi11RecallRate(true)')
                record(name,'active_recall_grade_requires_reveal',before_grade==page.evaluate('JSON.stringify(state.miRecall11)'))
                page.evaluate('mi11RecallReveal();mi11RecallRate(false)')
                rec=page.evaluate('Object.values(state.miRecall11)[0]');record(name,'active_recall_failure_delays_one_minute',rec['steps']==0 and 59000<rec['next']-rec['last']<61000,rec)
            else:
                # Actual legacy backup UI still exercised separately.
                page.evaluate("state={week:2,answers:{},vocab:{},favorites:{},session:{}};navTo('progress')")
                with page.expect_download() as download_info:page.get_by_role('button',name='Экспорт JSON',exact=True).click()
                data=Path(download_info.value.path()).read_bytes();page.evaluate('state.week=1')
                page.locator('input[type=file]').set_input_files({'name':'v1.json','mimeType':'application/json','buffer':data})
                page.wait_for_function('state.week===2');record(name,'backup_v1_ui_roundtrip_progress',True,{'checksum':'ABSENT','settings':'NOT_INCLUDED'})
            refs=page.evaluate("DB.schemes.map(s=>({name:s.name,source:s.source,matches:DB.images.filter(i=>i.group==='notes'&&i.id===Number(s.source)).length}))")
            record(name,'scheme_source_references_resolve',all(x['matches']==1 for x in refs),refs)
            if inventory['hasRecall']:
                page.evaluate("state.miRecall11={};navTo('words');mi11RecallBegin();mi11RecallReveal()")
                before_audio=page.evaluate('__audioCalls.length');page.get_by_role('button',name='Озвучить испанский',exact=True).click()
                record(name,'active_recall_audio_click',page.evaluate('__audioCalls.length')==before_audio+1,{'handler':page.get_by_role('button',name='Озвучить испанский',exact=True).get_attribute('onclick')})
            page.evaluate("delete window.speechSynthesis;openSettings();speak('hola')")
            record(name,'missing_TTS_reports_unavailable',any('не поддерживает' in a for a in page.evaluate('__alerts')),{'alerts':page.evaluate('__alerts[-1]') if False else page.evaluate('__alerts.at(-1)')})
            # No remote requests during all scenarios; output audio mocked, no cloud claims.
            remote=[r for r in requests if not r.startswith(f'http://127.0.0.1:{server.server_port}/') and not r.startswith(('data:','blob:'))]
            record(name,'no_remote_asset_requests_during_test',not remote,remote)
            record(name,'physical_iPhone_audio_pinch_persistence',False,'Not available in this environment',status='NOT_TESTED')
            record(name,'local_file_open',False,'Managed Chromium policy returned ERR_BLOCKED_BY_ADMINISTRATOR on file:// in prior direct attempt; HTTP used for evidence',status='BLOCKED')
            context.close()
        version=browser.version;browser.close()
    server.shutdown()
    summary=dict(collections.Counter(r['status'] for r in RESULTS))
    write_json(ROOT/'audit/browser-results.json',{'run_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'browser':version,'playwright':importlib.metadata.version('playwright'),'target':'originals/starter/source_candidates ONLY; experimental draft EXCLUDED','audio':'speechSynthesis.speak mocked; no audibility claim','summary':summary,'results':RESULTS})
    print(json.dumps(summary));print('Failures:')
    for r in RESULTS:
        if r['status']=='FAIL':print(r['candidate'],r['test'])
    if summary.get('FAIL'):raise SystemExit(1)
if __name__=='__main__':main()
