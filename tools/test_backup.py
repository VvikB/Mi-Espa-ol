#!/usr/bin/env python3
"""R2: actual export/import UI with synthetic progress, not user data."""
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
        context=browser.new_context(viewport={'width':390,'height':844})
        context.add_init_script("window.__alerts=[];window.alert=x=>__alerts.push(String(x));window.confirm=()=>window.__confirm!==false;")
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        url=f'http://127.0.0.1:{server.server_port}/'+str(artifact.relative_to(ROOT))
        page.goto(url)
        initial={'week':3,'answers':{'0':{'n':2,'correct':True,'due':123456}},'vocab':{'1':{'n':1,'due':99999}},'favorites':{'x':True},'session':{'note':'España ñ á'},'unknownNamespace':{'keep':['original',1]}}
        legacy=json.dumps(initial,ensure_ascii=False)
        page.evaluate("(s)=>{localStorage.clear();localStorage.setItem('mi-espanol-personal-v1',s);localStorage.setItem('mi-espanol-theme-v1','dark');localStorage.setItem('mi-espanol-recovery11-settings-v1',JSON.stringify({fontScale:'large',audioRate:1,reducedMotion:true}))}",legacy)
        page.reload();check('legacy_progress_load',page.evaluate('state.week')==3)
        check('legacy_unknown_namespace_load',page.evaluate('state.unknownNamespace.keep[0]')=='original')
        check('legacy_settings_load',page.evaluate("getThemePreference()==='dark'&&audioRate===1&&mi11Settings.fontScale==='large'&&mi11Settings.reducedMotion"))
        page.evaluate('save();openSettings()')
        check('legacy_key_untouched_after_save',page.evaluate("localStorage.getItem(STORE)")==legacy)
        check('new_snapshot_has_progress_and_settings',page.evaluate("(()=>{const s=JSON.parse(localStorage.getItem(StateStore.key));return s.progress.week===3&&s.settings.theme==='dark'&&s.settings.accessibility.audioRate===1})()"))
        with page.expect_download() as info:page.get_by_role('button',name='Сохранить копию v3',exact=True).click()
        backup=json.loads(Path(info.value.path()).read_text())
        check('ui_export_v3_sha256',backup['format']=='mi-espanol-progress-3' and backup['checksum'].startswith('sha256:') and len(backup['checksum'])==71)
        check('export_includes_all_settings',backup['payload']['settings']=={'theme':'dark','accessibility':{'fontScale':'large','reducedMotion':True,'audioRate':1}})
        check('export_includes_unknown_fields',backup['payload']['progress']['unknownNamespace']==initial['unknownNamespace'])
        def upload(obj,expected_alert=True):
            before=page.evaluate('__alerts.length')
            page.locator('#mi11-backup').set_input_files({'name':'synthetic-backup.json','mimeType':'application/json','buffer':json.dumps(obj,ensure_ascii=False).encode()})
            if expected_alert:page.wait_for_function('(n)=>__alerts.length>n',arg=before)
        # Fresh browser storage -> full restoration including unknown fields and settings.
        page.evaluate('localStorage.clear()');page.reload();page.evaluate('openSettings()');upload(backup)
        check('ui_restore_progress_exact',page.evaluate('JSON.parse(JSON.stringify(state))')==backup['payload']['progress'])
        check('ui_restore_settings_exact',page.evaluate('JSON.parse(JSON.stringify(StateStore.snapshot().settings))')==backup['payload']['settings'])
        page.reload();check('full_snapshot_survives_http_reload',page.evaluate("state.week===3&&getThemePreference()==='dark'&&audioRate===1"))
        page.evaluate('openSettings()');before=page.evaluate('StateStore.canonical(StateStore.snapshot())');upload(backup)
        check('repeat_ui_import_idempotent',before==page.evaluate('StateStore.canonical(StateStore.snapshot())'))
        # Cancellation must not mutate current snapshot.
        page.evaluate('window.__confirm=false');before=page.evaluate('localStorage.getItem(StateStore.key)');upload(backup,False);page.wait_for_timeout(100)
        check('cancel_import_no_write',before==page.evaluate('localStorage.getItem(StateStore.key)'))
        page.evaluate('window.__confirm=true')
        damaged=json.loads(json.dumps(backup));damaged['payload']['progress']['week']=4;before=page.evaluate('localStorage.getItem(StateStore.key)');upload(damaged)
        check('tampered_v3_rejected',before==page.evaluate('localStorage.getItem(StateStore.key)') and 'сумма' in page.evaluate('__alerts.at(-1)'))
        invalid=page.evaluate("(()=>{const s={week:99,answers:[]};return {format:'mi-espanol-progress-2',schema:2,state:s,checksum:'fnv1a32:'+mi11Hash(mi11Canonical(s))}})()");upload(invalid)
        check('valid_legacy_checksum_invalid_schema_rejected',before==page.evaluate('localStorage.getItem(StateStore.key)') and 'недел' in page.evaluate('__alerts.at(-1)'))
        unknown={**backup,'format':'mi-espanol-progress-4','schema':4};upload(unknown)
        check('unknown_future_version_no_write',before==page.evaluate('localStorage.getItem(StateStore.key)'))
        # Newer success is not overwritten by incoming old failure.
        page.evaluate("state.answers['0']={n:5,correct:true,due:123456,last:1000};save()")
        v1={'format':'mi-espanol-progress-1','state':{'week':3,'answers':{'0':{'n':0,'correct':False,'due':1,'last':1}},'customImported':{'note':'keep me'}}}
        upload(v1)
        check('old_v1_does_not_overwrite_new_result',page.evaluate("state.answers['0'].n===5&&state.answers['0'].correct"))
        check('old_v1_unknown_fields_preserved',page.evaluate('state.customImported.note')=='keep me')
        # Unknown event order -> preserve current + store alternate, repeated imports deduplicate.
        page.evaluate("localStorage.clear();localStorage.setItem(STORE,JSON.stringify({week:2,answers:{u:{n:5,correct:true}}}))")
        page.reload();page.evaluate('openSettings()')
        ambiguous={'format':'mi-espanol-progress-1','state':{'week':2,'answers':{'u':{'n':0,'correct':False}}}}
        upload(ambiguous);count=page.evaluate('StateStore.snapshot().conflicts.length')
        check('ambiguous_values_archived',page.evaluate("state.answers.u.n===5&&StateStore.snapshot().conflicts.some(c=>c.other?.n===0)"))
        upload(ambiguous);check('ui_conflict_archive_idempotent',page.evaluate('StateStore.snapshot().conflicts.length')==count)
        # Real v2 migration still works.
        v2=page.evaluate("mi11MakeBackup({week:2,answers:{},vocab:{'8':{n:1,due:10}},futureModule:{note:'v2'}})")
        upload(v2);check('v2_migration_preserves_data',page.evaluate("state.vocab['8'].n===1&&state.futureModule.note==='v2'"))
        # Failure during commit is reported; authoritative state remains intact.
        before=page.evaluate('localStorage.getItem(StateStore.key)')
        page.evaluate("(()=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===StateStore.key)throw Error('QuotaExceeded');return window.__setItem.call(this,k,v)};return true})()")
        upload(v2)
        check('quota_failure_no_snapshot_loss',before==page.evaluate('localStorage.getItem(StateStore.key)') and 'отменён' in page.evaluate('__alerts.at(-1)'))
        page.evaluate('(()=>{Storage.prototype.setItem=window.__setItem;return true})()')
        # Malformed local snapshot is never silently reset; raw export remains possible.
        page.evaluate("localStorage.setItem(StateStore.key,'{broken')")
        page.reload();check('malformed_storage_starts_without_crash',page.evaluate('StateStore.locked()') and page.locator('#recovery-storage-status').is_visible())
        page.evaluate('save()');check('malformed_storage_not_overwritten',page.evaluate('localStorage.getItem(StateStore.key)')=='{broken')
        page.evaluate('openSettings()')
        with page.expect_download() as info:page.get_by_role('button',name='Сохранить исходные данные без изменений',exact=True).click()
        raw=json.loads(Path(info.value.path()).read_text())
        check('raw_export_preserves_corrupt_and_legacy_bytes',raw['raw'][page.evaluate('StateStore.key')]=='{broken' and raw['raw']['mi-espanol-personal-v1'] is not None)
        check('no_javascript_errors',not errors,errors)
        page.screenshot(path=str(ROOT/'audit/restoration-r2/corrupt-storage-390.png'),full_page=True)
        version=browser.version;context.close();browser.close()
    server.shutdown()
    summary=dict(collections.Counter(r['status'] for r in RESULTS))
    write_json(ROOT/'audit/restoration-r2/backup-tests.json',{'run_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'artifact_sha256':manifest['artifact_sha256'],'browser':version,'scope':'R2 backup/current-browser storage; physical Safari persistence NOT TESTED','summary':summary,'results':RESULTS})
    print(summary)
    for r in RESULTS:
        if r['status']=='FAIL':print(r)
    if summary.get('FAIL'):raise SystemExit(1)
if __name__=='__main__':main()
