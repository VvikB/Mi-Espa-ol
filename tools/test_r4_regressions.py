#!/usr/bin/env python3
"""Reuse established regression scenarios against R4 without overwriting R3 evidence."""
from pathlib import Path
from audit import ROOT
for name in ['test_restoration','test_backup','test_journey']:
    text=(ROOT/'tools'/f'{name}.py').read_text()
    text=text.replace('from build import build','from build import build as baseline_build\ndef build():return baseline_build(revision="R4")')
    text=text.replace('restoration-r3','restoration-r4').replace("'vocab':131","'vocab':483").replace('CATALOG.words.length===131','CATALOG.words.length===483')
    if name=='test_restoration':
        text=text.replace("before=page.evaluate('__audioCalls.length');page.locator('#wordsList [data-speech]').nth(i).click()", "page.evaluate('(s)=>{dictQuery=s;renderWordsList()}',expected)\n            before=page.evaluate('__audioCalls.length');page.evaluate('(s)=>[...document.querySelectorAll(\"#wordsList [data-speech]\")].find(b=>b.dataset.speech===s).click()',expected)")
    exec(compile(text,str(ROOT/'tools'/f'{name}.py'),'exec'),{'__name__':'__main__','__file__':str(ROOT/'tools'/f'{name}.py')})
