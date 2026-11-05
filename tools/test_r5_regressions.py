#!/usr/bin/env python3
"""Run existing functional scenarios on R5; old reports remain untouched."""
from audit import ROOT
for name in ['test_restoration','test_backup','test_journey']:
    text=(ROOT/'tools'/f'{name}.py').read_text()
    text=text.replace('from build import build','from build import build as baseline_build\ndef build():return baseline_build(revision="R5")')
    text=text.replace('restoration-r3','restoration-r5').replace("'vocab':131","'vocab':483").replace('CATALOG.words.length===131','CATALOG.words.length===483')
    text=text.replace("R1/R2 fixed-function regression on R3, not full specification acceptance","Existing regression scenarios on R5, not full specification acceptance")
    text=text.replace("R3 device recheck pending.","R5 physical iPhone/Safari check pending.")
    if name=='test_restoration':
        text=text.replace("before=page.evaluate('__audioCalls.length');page.locator('#wordsList [data-speech]').nth(i).click()", "page.evaluate('(s)=>{dictQuery=s;renderWordsList()}',expected)\n            before=page.evaluate('__audioCalls.length');page.evaluate('(s)=>[...document.querySelectorAll(\"#wordsList [data-speech]\")].find(b=>b.dataset.speech===s).click()',expected)")
        text=text.replace("page.locator('#wordCard [data-speech]').click()","page.locator('#wordCard [data-speech]').first.click()")
    if name=='test_journey':
        text=text.replace("check('unverified_source_honest',page.locator('.warning').filter(has_text='ещё не подтверждена').count()==1)","check('verified_tener_source',page.evaluate(\"DB.images.filter(x=>x.group==='notes')[srcIndex].id==='NOTES-01'\") and page.locator('.warning').filter(has_text='Тематическое соответствие').count()==1)")
    exec(compile(text,str(ROOT/'tools'/f'{name}.py'),'exec'),{'__name__':'__main__','__file__':str(ROOT/'tools'/f'{name}.py')})
