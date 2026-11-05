#!/usr/bin/env python3
"""R4 additive content gates and browser regression; no physical-device claim."""
import collections,functools,http.server,json,threading
from playwright.sync_api import sync_playwright
from audit import ROOT,sha,canonical,write_json
from build import build,load_data,parse_html

def main():
    artifact,manifest=build(revision='R4');base=load_data();db=parse_html(artifact)[2]
    v=json.loads((ROOT/'data/recovered/vocabulary.json').read_text());checks=[]
    def check(name,value):
        checks.append({'test':name,'status':'PASS' if value else 'FAIL'})
    check('original_vocab_prefix_exact',db['vocab'][:len(base['vocab'])]==base['vocab'])
    check('all_other_original_content_exact',all(db[k]==base[k] for k in base if k!='vocab'))
    check('new_records_equal_transcription',db['vocab'][len(base['vocab']):]==v['words'])
    images={i['fields']['id']:i['sha256'] for i in json.loads((ROOT/'data/images.json').read_text())}
    check('all_rows_source_hashes',all(images[r['imageId']]==r['imageSha256'] for r in v['rows']))
    active={r for w in v['words'] for r in w['sourceRows']};held={r['id'] for r in v['rows'] if r['status'].startswith('HELD')}
    check('held_rows_not_integrated',not active.intersection(held))
    keys=[w['es'].strip().lower() for w in db['vocab']]
    check('no_duplicate_headwords',len(keys)==len(set(keys)))
    check('no_invented_examples',all(w['ex']=='' for w in v['words']))
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':428,'height':926},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script("window.alert=()=>{};window.__spoken=[];window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};Object.defineProperty(speechSynthesis,'getVoices',{value:()=>[{lang:'es-ES',name:'test'}]});Object.defineProperty(speechSynthesis,'speak',{value:u=>{__spoken.push(u.text);u.onstart?.({});u.onend?.({})}})")
        page.goto(f'http://127.0.0.1:{server.server_port}/'+str(artifact.relative_to(ROOT)))
        check('browser_vocabulary_count',page.evaluate('DB.vocab.length')==len(db['vocab']))
        for view in ['today','library','words','practice','progress']:
            page.evaluate('(v)=>navTo(v)',view);check('navigation_'+view,page.locator('#app').inner_text()!='')
        for i,w in enumerate(v['words']):
            page.evaluate('(s)=>{dictQuery=s;navTo("words")}',w['es'])
            control=page.locator('#wordsList [data-speech]').filter(has_text='🔊')
            # Exact attribute matching avoids punctuation and substring ambiguity.
            page.evaluate('(s)=>{const b=[...document.querySelectorAll("#wordsList [data-speech]")].find(b=>b.dataset.speech===s);if(!b)throw Error("Missing restored word");b.click()}',w['es'])
            check('restored_audio_'+str(i),page.evaluate('__spoken.at(-1)')==w['es'])
        check('no_browser_exceptions',not errors);browser.close()
    server.shutdown()
    report={'artifact_sha256':manifest['artifact_sha256'],'summary':dict(collections.Counter(c['status'] for c in checks)),'tests':checks,'physical_iPhone':'PENDING','audio_scope':'Mock Spanish voice dispatch; audibility on iOS not tested'}
    write_json(ROOT/'audit/restoration-r4/content-tests.json',report)
    print(report['summary'])
    if report['summary'].get('FAIL'):raise SystemExit(1)
if __name__=='__main__':main()
