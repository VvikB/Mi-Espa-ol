#!/usr/bin/env python3
"""R1 targeted repair/regression tests. Does not replace the immutable-source audit."""
import collections,datetime,functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from audit import ROOT,write_json
from build import build
RESULTS=[]
def check(name,ok,evidence=None):
    RESULTS.append({'test':name,'status':'PASS' if ok else 'FAIL','evidence':evidence})

def main():
    artifact,manifest=build()
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        context.add_init_script("""window.__audioCalls=[];window.__alerts=[];window.alert=x=>__alerts.push(String(x));window.confirm=()=>true;
        window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
        Object.defineProperty(speechSynthesis,'getVoices',{configurable:true,value:()=>[{lang:'es-ES',name:'test voice'}]});
        Object.defineProperty(speechSynthesis,'speak',{configurable:true,value:u=>{__audioCalls.push({text:u.text,rate:u.rate,lang:u.lang});u.onstart?.({});u.onend?.({})}});
        """)
        page=context.new_page();errors=[];remote=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:remote.append(r.url) if not r.url.startswith(('http://127.0.0.1:','data:','blob:')) else None)
        page.goto(f'http://127.0.0.1:{server.server_port}/'+str(artifact.relative_to(ROOT)))
        check('startup',not errors,errors[:])
        check('runtime_counts_preserved',page.evaluate('mi11Stage11Inventory()')=={'vocab':131,'quiz':10,'sections':16,'tables':73,'scenes':6,'sceneItems':55,'weeks':12},page.evaluate('mi11Stage11Inventory()'))
        # Click every actual dictionary audio control and compare exact Spanish text.
        page.evaluate("navTo('words')")
        words=page.evaluate('DB.vocab.map(w=>w.es)')
        for i,expected in enumerate(words):
            before=page.evaluate('__audioCalls.length');page.locator('#wordsList [data-speech]').nth(i).click()
            call=page.evaluate('__audioCalls.at(-1)')
            check(f'dictionary_audio_{i}',page.evaluate('__audioCalls.length')==before+1 and call['text']==expected,expected)
        page.evaluate('showWordCard()');before=page.evaluate('__audioCalls.length');expected=page.evaluate('DB.vocab[currentWord].es');page.locator('#wordCard [data-speech]').click()
        check('legacy_card_audio',page.evaluate('__audioCalls.length')==before+1 and page.evaluate('__audioCalls.at(-1).text')==expected)
        page.evaluate('mi11RecallBegin();mi11RecallReveal()');expected=page.evaluate('mi11RecallRecords()[mi11RecallIndex].es');before=page.evaluate('__audioCalls.length');page.get_by_role('button',name='Озвучить испанский',exact=True).click()
        check('active_recall_audio',page.evaluate('__audioCalls.length')==before+1 and page.evaluate('__audioCalls.at(-1).text')==expected)
        page.evaluate("schemeIndex=0;setLib('schemes')");before=page.evaluate('__audioCalls.length');page.locator('[data-speech]').first.click();check('scheme_audio',page.evaluate('__audioCalls.length')==before+1 and page.evaluate('__audioCalls.at(-1).text')==page.evaluate('SchemeUI.allSpeech(0)'))
        special=['¿Qué tal, señor? ¡España!','dijo: "sí", y después: \'mañana\'','</button><img src=x onerror="window.__injected=true">','á é í ó ú ü ñ & < >']
        for i,text in enumerate(special):
            page.evaluate('(s)=>{navTo("words");document.getElementById("wordsList").innerHTML=wordRows([{es:s,ru:"test"}])}',text)
            before=page.evaluate('__audioCalls.length');page.locator('#wordsList [data-speech]').click()
            check(f'audio_exact_special_text_{i}',page.evaluate('__audioCalls.length')==before+1 and page.evaluate('__audioCalls.at(-1).text')==text and page.evaluate('window.__injected!==true'))
        # Every trainable table creates valid data controls; use actual typed answers.
        targets=page.evaluate('DB.atlas.flatMap((s,si)=>s[1].map((t,ti)=>({si,ti,train:tableIsConjugation(t)}))).filter(x=>x.train)')
        cells_total=0
        for target in targets:
            page.evaluate('(t)=>{section=t.si;table=t.ti;studyHide=true;setLib("tables")}',target)
            tasks=page.locator('.form-task');count=tasks.count();cells_total+=count
            inline=page.evaluate("[...document.querySelectorAll('.form-task [onclick],.form-task [onkeydown]')].length")
            check(f'table_{target["si"]}_{target["ti"]}_safe_dom',count>0 and inline==0,{'cells':count})
            first=tasks.first;first.locator('xpath=..').locator('summary').click();expected=first.get_attribute('data-expected');id=first.get_attribute('data-cell-id')
            first.locator('input').fill(expected);first.locator('[data-form-action=check]').click()
            check(f'table_{target["si"]}_{target["ti"]}_typed_answer',page.evaluate('(id)=>state.answers[id]?.correct===true',id),{'expected':expected})
        # Wrong accent and hint must not award independent recall.
        accent=page.evaluate("DB.atlas.flatMap((s,si)=>s[1].flatMap((t,ti)=>tableIsConjugation(t)?t[2].flatMap((r,ri)=>r.map((v,ci)=>({si,ti,ri,ci,v})).filter(x=>x.ci>0&&/[áéíóúñ]/.test(x.v))):[]))[0]")
        page.evaluate('(t)=>{section=t.si;table=t.ti;studyHide=true;setLib("tables")}',accent)
        task=page.locator(f'.form-task[data-cell-id="gram:{accent["si"]}:{accent["ti"]}:{accent["ri"]}:{accent["ci"]}"]');task.locator('xpath=..').locator('summary').click()
        bad=''.join({'á':'a','é':'e','í':'i','ó':'o','ú':'u','ñ':'n'}.get(c,c) for c in accent['v']);task.locator('input').fill(bad);task.locator('[data-form-action=check]').click()
        key=f'gram:{accent["si"]}:{accent["ti"]}:{accent["ri"]}:{accent["ci"]}'
        check('table_wrong_accent_rejected',page.evaluate('(k)=>state.answers[k].correct===false',key),{'correct':accent['v'],'attempt':bad})
        page.evaluate('render()');task=page.locator(f'.form-task[data-cell-id="{key}"]');task.locator('xpath=..').locator('summary').click();task.locator('[data-form-action=reveal]').click();before=page.evaluate('(k)=>JSON.stringify(state.answers[k])',key);task.locator('input').fill(accent['v']);task.locator('[data-form-action=check]').click()
        check('table_hint_cannot_award_score',before==page.evaluate('(k)=>JSON.stringify(state.answers[k])',key))
        # Both queues and state guard.
        chosen=page.evaluate("(()=>{const old=Date.now;Date.now=()=>2000;state.miRecall11={};const words=mi11RecallRecords();state.miRecall11[mi11RecallId(words[1])]={next:1000,steps:1};mi11RecallChoose();const i=mi11RecallIndex;Date.now=old;return i})()")
        check('active_queue_overdue_before_unseen',chosen==1,{'selected':chosen})
        page.evaluate("state.vocab={'2':{n:1,due:0}}")
        check('legacy_queue_overdue_before_unseen',page.evaluate('chooseWord()')==2)
        page.evaluate("state.miRecall11={};mi11RecallChoose();navTo('words')");before=page.evaluate('JSON.stringify(state.miRecall11)');page.evaluate('mi11RecallRate(true)');check('recall_requires_reveal',before==page.evaluate('JSON.stringify(state.miRecall11)'))
        # All scenes and their pronunciation path.
        for scene in ['body','house','street','feel','kitchen','clothing']:
            page.evaluate('(k)=>{visualMode=k;visualChosen=null;setLib("visual")}',scene)
            check('scene_'+scene,page.locator('svg').count()==1)
            page.evaluate('(k)=>chooseVisual(VISUAL_DATA[k][0][0])',scene)
            data_audio=page.locator('[data-speech]');check('scene_audio_control_'+scene,data_audio.count()>=1)
            if data_audio.count():
                before=page.evaluate('__audioCalls.length');data_audio.first.click();check('scene_audio_'+scene,page.evaluate('__audioCalls.length')==before+1)
            page.get_by_role('button',name='Проверить знания',exact=True).click();page.evaluate('mi11Answer(0)');before=page.evaluate('__audioCalls.length');page.locator('[data-speech]').click();check('scene_quiz_audio_'+scene,page.evaluate('__audioCalls.length')==before+1)
        # Width/theme regression at all required mobile widths.
        for theme in ['light','dark']:
            for width in [320,375,390,430]:
                page.set_viewport_size({'width':width,'height':844});page.evaluate('(t)=>setTheme(t)',theme)
                for view in ['today','library','words','practice','progress']:
                    page.evaluate('(v)=>navTo(v)',view)
                    check(f'layout_{theme}_{width}_{view}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        page.evaluate('openSettings()');small=page.evaluate("[...document.querySelectorAll('button')].filter(x=>x.offsetWidth).filter(x=>x.getBoundingClientRect().width<44||x.getBoundingClientRect().height<44).map(x=>x.textContent)")
        check('settings_targets_44px',not small,small)
        # Missing Spanish voice: no fake playback or default English speech.
        before=page.evaluate('__audioCalls.length');result=page.evaluate("(()=>{Object.defineProperty(speechSynthesis,'getVoices',{configurable:true,value:()=>[{lang:'en-US'}]});return speak('hola')})()")
        check('no_spanish_voice_no_playback',result is False and before==page.evaluate('__audioCalls.length') and 'недоступен' in page.locator('#recovery-audio-status').inner_text())
        page.evaluate("Object.defineProperty(speechSynthesis,'getVoices',{configurable:true,value:()=>[{lang:'es-ES'}]})")
        page.evaluate("window.__serviceEvents=[];AudioService.subscribe(e=>__serviceEvents.push(e.type));audioRate=.7;speak('España')")
        check('audio_status_lifecycle',page.evaluate('__serviceEvents')==['queued','started','ended'],page.evaluate('__serviceEvents'))
        check('audio_rate_shared',page.evaluate('__audioCalls.at(-1).rate')==.7)
        images=page.evaluate("async()=>Promise.all(DB.images.map(async x=>{let i=new Image();i.src=x.src;await i.decode();return i.naturalWidth>0}))")
        check('all_images_decode',len(images)==25 and all(images))
        check('no_javascript_errors',not errors,errors)
        check('no_remote_assets',not remote,remote)
        page.set_viewport_size({'width':390,'height':844});page.evaluate("setTheme('light');navTo('words')")
        shots=ROOT/'audit/restoration-r3';page.screenshot(path=str(shots/'words-390.png'),full_page=True)
        version=browser.version;context.close();browser.close()
    server.shutdown()
    summary=dict(collections.Counter(x['status'] for x in RESULTS))
    write_json(ROOT/'audit/restoration-r3/regression-tests.json',{'run_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'browser':version,'artifact_sha256':manifest['artifact_sha256'],'scope':'R1/R2 fixed-function regression on R3, not full specification acceptance','audio':'Mocked device voices and output; physical iPhone NOT TESTED','trainable_tables':len(targets),'trainable_cells_rendered':cells_total,'summary':summary,'results':RESULTS})
    print(summary)
    for r in RESULTS:
        if r['status']=='FAIL':print('FAIL',r['test'],r['evidence'])
    if summary.get('FAIL'):raise SystemExit(1)
if __name__=='__main__':main()
