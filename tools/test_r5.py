#!/usr/bin/env python3
"""R5 content, exact patch boundary, and R4 -> R5 user progress regression."""
import collections,copy,functools,http.server,json,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
from audit import ROOT,canonical,sha,write_json,parse_html
from build import build,load_data

def main():
    artifact,manifest=build(revision='R5');db=parse_html(artifact)[2]
    old=load_data();old['vocab']+=json.loads((ROOT/'data/recovered/vocabulary.json').read_text())['words']
    v=json.loads((ROOT/'data/reviewed/vocabulary-review.json').read_text());g=json.loads((ROOT/'data/reviewed/grammar-review.json').read_text());links=json.loads((ROOT/'data/reviewed/source-links.json').read_text());results=[]
    def check(name,ok,evidence=None):results.append(dict(test=name,status='PASS' if ok else 'FAIL',evidence=evidence))
    check('indices_and_counts_unchanged',len(db['vocab'])==len(old['vocab'])==483 and [len(x[1]) for x in db['atlas']]==[len(x[1]) for x in old['atlas']])
    # Independently restore every logged before-value in reverse; all R5 data must then equal R4.
    restored=copy.deepcopy(db)
    from r5_content import review
    original=copy.deepcopy(old);meta=review(original)
    patches=g['patches']+v['patches']+meta['schemePatches']
    for p in reversed(patches):
        value=restored;parts=p['pointer'].strip('/').split('/')
        for part in parts[:-1]:value=value[int(part)] if isinstance(value,list) else value[part]
        key=int(parts[-1]) if isinstance(value,list) else parts[-1]
        check('patch_before_after_'+p['pointer'],value[key]==p['after'])
        value[key]=p['before']
    check('only_explicit_editorial_changes',restored==old)
    check('no_original_examples_overwritten',all(w.get('ex','')==db['vocab'][i]['ex'] for i,w in enumerate(old['vocab']) if w.get('ex')))
    check('separate_origin_for_new_examples',all(r['example'] is None or r['example']['origin']=='NEWLY_AUTHORED_R5_NOT_RECOVERED' for r in v['records']))
    check('all_held_rows_excluded',len(v['heldDecisions'])==18 and all(not r['integrated'] for r in v['heldDecisions']))
    check('all_tables_row_inventory',len(g['tables'])==73 and sum(len(t['rows']) for t in g['tables'])==sum(len(t[2]) for sec in old['atlas'] for t in sec[1]))
    # Language checks with explicit expected meanings/forms, independent of patch producer.
    check('endosar_not_generic_signature','индоссировать' in db['vocab'][181]['ru'] and 'заверять' not in db['vocab'][181]['ru'])
    check('sentir_has_feeling_and_regret',all(x in db['vocab'][414]['ru'] for x in ['чувствовать','сожалеть']))
    check('article_gender_explained','женского' in str(db['atlas'][2][1][4][2]) and 'la fría agua' in str(db['atlas'][2][1][4][2]))
    check('cancion_stress_not_moved','сохраняется' in db['atlas'][1][1][2][2][3][1])
    check('joven_gender_not_consonant_generalization','Национальность' in db['atlas'][3][1][2][2][2][0])
    check('qu_and_uppercase_source_not_reintroduced','Сохраняются' in str(db['atlas'][0][1][2]) and 'без ударения' in str(db['atlas'][0][1][2]))
    expected=['hablé','comí','viví','hablaste','comiste','viviste','habló','comió','vivió','hablamos','comimos','vivimos','hablasteis','comisteis','vivisteis','hablaron','comieron','vivieron']
    check('regular_indefinido_all_accents',[x for r in db['atlas'][8][1][1][2] for x in r[1:]]==expected)
    for si,ti,ri,ci,answer in [(10,0,4,1,'sois'),(10,1,2,3,'hizo'),(10,3,5,3,'dijeron'),(11,0,4,2,'vayáis'),(11,3,3,3,'fuéramos'),(12,3,3,1,'id')]:
        check(f'irregular_form_{si}_{ti}_{ri}_{ci}',db['atlas'][si][1][ti][2][ri][ci]==answer)
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':428,'height':926},is_mobile=True,has_touch=True)
        context.add_init_script("window.__spoken=[];window.alert=()=>{};window.confirm=()=>true;window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};Object.defineProperty(speechSynthesis,'getVoices',{value:()=>[{lang:'es-ES',name:'test'}]});Object.defineProperty(speechSynthesis,'speak',{value:u=>{__spoken.push(u.text);u.onstart?.({});u.onend?.({})}})")
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        url=f'http://127.0.0.1:{server.server_port}/'
        page.goto(url+'pilot/Mi_Espanol_Pilot_R4.html')
        page.evaluate("""(()=>{state.vocab={};state.miRecall11={};for(let i=0;i<DB.vocab.length;i++){state.vocab[String(i)]={n:3,due:4102444800000};state.miRecall11[mi11RecallId(DB.vocab[i])]={steps:3,next:4102444800000,attempts:7,correct:6};}state.vocab['170'].due=1;state.miRecall11[mi11RecallId(DB.vocab[170])].next=1;state.personalNotes={text:'Мой личный конспект: mañana',keep:true};state.session['scheme-2']='Tengo ganas de practicar.';state.miJourney3={schema:1,events:[],completedDays:{},completedSessions:{},active:null};RouteUI.set('week',1);Journey.start();save();return true})()""")
        before=page.evaluate('({vocab:state.vocab,recall:state.miRecall11,personal:state.personalNotes,active:Journey.active()})')
        oldkeys=page.evaluate('DB.vocab.map(mi11RecallId)')
        oldids=page.evaluate('CATALOG.words.map(w=>w.id)')
        page.goto(url+str(artifact.relative_to(ROOT)))
        check('all_catalog_word_ids_preserved',page.evaluate('CATALOG.words.map(w=>w.id)')==oldids)
        check('all_old_recall_keys_preserved',page.evaluate('DB.vocab.map(mi11RecallId)')==oldkeys)
        check('all_numeric_word_progress_preserved',page.evaluate('state.vocab')==before['vocab'])
        check('all_term_review_progress_preserved',page.evaluate('state.miRecall11')==before['recall'])
        check('personal_unknown_fields_preserved',page.evaluate('state.personalNotes')==before['personal'])
        check('unfinished_r4_session_preserved',page.evaluate('Journey.active()')==before['active'])
        check('corrected_word_still_due',page.evaluate('mi11RecallDue().some(x=>x.w===DB.vocab[170])'))
        page.evaluate('Journey.leave();navTo("words")')
        for r in v['records']:
            if not r['example']:continue
            i=r['index'];example=r['example']
            page.evaluate('(i)=>{dictQuery=DB.vocab[i].es;navTo("words")}',i)
            page.evaluate('(i)=>{let d=[...document.querySelectorAll("#wordsList details")].find(d=>d.textContent.includes(REVIEW_DATA.words[i].example.es));if(!d)throw Error("Missing example");d.open=true;d.querySelector("[data-speech]").click()}',i)
            check('example_tts_'+str(i),page.evaluate('__spoken.at(-1)')==example['es'])
            check('example_origin_and_translation_'+str(i),'создано в R5' in page.locator('#wordsList').inner_text() and example['ru'] in page.locator('#wordsList').inner_text())
        # Every table source button goes to its registered image, not section+1.
        for t in g['tables']:
            si,ti=t['section'],t['table'];expected=t['sourcePages'][0]['id']
            page.evaluate('(x)=>{section=x[0];table=x[1];setLib("tables")}',[si,ti])
            check(f'no_old_wrong_page_button_{si}_{ti}',page.get_by_role('button',name='Открыть оригинал страницы',exact=False).count()==0)
            page.locator('[data-review-source]').first.click()
            check(f'table_source_{si}_{ti}',page.evaluate('DB.images.filter(x=>x.group===srcGroup)[srcIndex].id')==expected)
        for link in links['schemes']:
            i=link['legacyIndex'];page.evaluate('(i)=>{schemeIndex=i;setLib("schemes")}',i);page.locator('[data-scheme-source]').click()
            check('scheme_link_'+str(i),page.evaluate('DB.images.filter(x=>x.group===srcGroup)[srcIndex].id')==link['pageIds'][0] if link['pageIds'] else 'Источник схемы умений не найден' in page.locator('#app').inner_text())
        page.evaluate("dictQuery=DB.vocab[181].es;navTo('words')");page.locator('#wordsList details').first.click();page.screenshot(path=str(ROOT/'audit/restoration-r5/vocabulary-428.png'),full_page=True)
        page.evaluate('openSettings()');check('passport_version_and_counts','R5' in page.locator('#app').inner_text() and 'только 131' not in page.locator('#app').inner_text())
        check('no_browser_exceptions',not errors,errors);browser.close()
    server.shutdown();report={'artifact_sha256':manifest['artifact_sha256'],'scope':'Editorial patch gates and R4-to-R5 compatibility; no independent methodical or physical iPhone acceptance','summary':dict(collections.Counter(r['status'] for r in results)),'results':results}
    write_json(ROOT/'audit/restoration-r5/content-tests.json',report);print(report['summary'])
    if report['summary'].get('FAIL'):raise SystemExit(1)
if __name__=='__main__':main()
