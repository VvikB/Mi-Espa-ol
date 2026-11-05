#!/usr/bin/env python3
"""Compile explicit R5 editorial decisions; preserve immutable R3/R4 datasets."""
import json,unicodedata,urllib.parse
from pathlib import Path
from audit import ROOT,sha,canonical,write_json

def rows(path):
    return [line.split('|') for line in path.read_text().splitlines() if line and not line.startswith('#')]
def part_of_speech(i):
    if i<=16:return {0:'междометие',1:'речевая формула',2:'речевая формула',3:'речевая формула',4:'речевая формула',5:'речевая формула',6:'речевая формула',7:'речевая формула',8:'вопросительная формула',9:'глагольная фраза',10:'вопросительная формула',11:'наречная фраза',12:'личная форма necesitar',13:'личная форма querer',14:'глагольная формула',15:'вопросительная формула',16:'вопросительный шаблон'}[i]
    if i in [45,46]:return 'предлог'
    if 47<=i<=58:return 'наречие / существительное' if i==49 else 'наречие / наречная фраза'
    if 59<=i<=61:return 'прилагательное'
    if 64<=i<=90:return 'глагол'
    if 91<=i<=97:return 'союз / связка'
    if i in [131,132,170,171,172,173,204,205,206,207,208,240,241,274,275,276]:return 'речевая формула / предложение'
    if i in [135,136,229] or 156<=i<=169 or i>=458:return 'прилагательное'
    if i in [174,175,176,177,181,186,190,203,242,243,244] or 334<=i<=448:return 'глагол / глагольная конструкция'
    if i in [191] or 449<=i<=457:return 'наречие / наречная конструкция'
    return 'существительное / именная группа'
def old_key(w):
    enc=lambda t:urllib.parse.quote(unicodedata.normalize('NFC',t).strip().lower(),safe="~!*'()-._")
    return 'term:'+enc(w['es'])+'|'+enc(w['ru'])
def compile_review():
    base=json.loads((ROOT/'data/core.json').read_text())['vocab']+json.loads((ROOT/'data/recovered/vocabulary.json').read_text())['words']
    decisions={}
    for fields in rows(ROOT/'data/reviewed/vocabulary-decisions.tsv'):
        i=int(fields[0]);record=decisions.setdefault(i,{'es':'','ru':'','notes':[],'region':''})
        for k,v in zip(['es','ru'],fields[1:3]):
            if v:record[k]=v
        if fields[3]:record['notes'].append(fields[3])
        if fields[4]:record['region']=fields[4]
    examples={int(i):dict(es=es,ru=ru,level=level,origin='NEWLY_AUTHORED_R5_NOT_RECOVERED',review='ASSISTANT_EDITED; independent methodical acceptance pending') for i,es,ru,level in rows(ROOT/'data/reviewed/context-examples.tsv')}
    if len(examples)!=len(rows(ROOT/'data/reviewed/context-examples.tsv')):raise ValueError('Duplicate example index')
    records=[];patches=[]
    for i,w in enumerate(base):
        d=decisions.get(i,{});changes=[]
        for field in ['es','ru']:
            if d.get(field) and d[field]!=w[field]:changes.append({'field':field,'before':w[field],'after':d[field]})
        if i in examples:
            if w.get('ex'):raise ValueError('Do not overwrite a source example')
            changes.append({'field':'ex','before':w.get('ex',''),'after':examples[i]['es']})
        for change in changes:patches.append({'id':f'word-{i}-{change["field"]}','pointer':f'/vocab/{i}/{change["field"]}','before':change['before'],'after':change['after'],'reason':'; '.join(d.get('notes',[])) or 'Добавлен новый контекстный пример R5','origin':'R5_EDITORIAL_LAYER'})
        records.append({'index':i,'original':w,'originalHash':sha(canonical(w).encode()),'originalRecallKey':old_key(w),'partOfSpeech':part_of_speech(i),'spellingAndAccents':'ASSISTANT_EDITORIAL_PASS','translation':'CORRECTED' if any(c['field']=='ru' for c in changes) else 'REVIEWED_IN_GIVEN_SENSE','usageNotes':d.get('notes',[]),'regionalStatus':d.get('region') or 'NO_SPECIFIC_VARIANT_FLAGGED_NOT_EXHAUSTIVE','example':examples.get(i),'existingExampleOrigin':'PRESERVED_FROM_BASE_HTML' if w.get('ex') else None,'status':'CONTEXT_EXAMPLE_EDITED_R5' if i in examples else 'LEXICAL_PASS_CONTEXT_ACCEPTANCE_PENDING','independentAcceptance':'PENDING'})
    held=json.loads((ROOT/'data/recovered/vocabulary.json').read_text())['rows'];held=[r for r in held if r['status'].startswith('HELD')]
    # No count-driven additions: these remain excluded from runtime, with a concrete decision per row.
    resolutions=[
      'Не добавлять: вероятно бизнес-образование, но предпочтительный термин зависит от курса; не исправлять молча на estudios empresariales.',
      'Значение установлено: неполное время, не вечернее. Не добавлять дубль: trabajo a tiempo parcial уже под индексом 269.',
      'Не добавлять: для полного времени ожидается a tiempo completo; исходное periodo completo не доказывает это значение.',
      'Отклонить пару campo/кампус. Поле/сельская местность — другое значение; campus был бы новым словом, не восстановлением этой пары.',
      'Оставить вне активного словаря: в Испании bachiller — уровень среднего образования; конкретная система страны неизвестна.',
      'Отклонить: anworten не испанская форма. Не создавать responder/contestar под видом прочитанного оригинала.',
      'Разобрано как дубль ser/estar: существующие индексы 87/86; выбор по идентификации/состоянию/месту, не один перевод.',
      'Разобрано как два уже существующих глагола 83/82; личное a и saber + infinitivo отражены в редакторских заметках.',
      'Оставить вне активного словаря: meter algo en и poner algo en различаются; нужна отдельная авторская пара контекстов.',
      'Отклонить sedir: ненормативная форма; sentarse/estar sentado не выводятся из этой строки с достаточной уверенностью.',
      'Отклонить ошибочную пару bueno/хорошо в разделе наречий. bueno уже 465, bien уже 56; пример R5 разводит формы.',
      'Не добавлять составную карточку: también — тоже, tampoco — тоже не; нужны две самостоятельные новые карточки с происхождением.',
      'Не добавлять без нового контекста: juntos — вместе, junto a — рядом с; одна строка не заменяет эти конструкции.',
      'Установлена опечатка comfortable; испанское confortable нормативно, но удобство также cómodo; не добавлять без выбранного значения.',
      'Не объединять: agradable — приятный, amable — любезный/доброжелательный; в текущем наборе нет отдельных контекстов.',
      'Не объединять: corto — короткий, bajo — низкий; будущие отдельные карточки должны иметь разные примеры.',
      'Не объединять: grande — большой (уже 459), alto — высокий; нет основания создавать синонимическую пару.',
      'Отклонить основной перевод bueno/здоровый; в отдельных разговорных конструкциях возможно estar bueno, но базовое sano и контекст не восстановлены.'
    ]
    assert len(held)==len(resolutions)
    result={'scope':'483 records read in editorial pass; no external dictionary or independent teacher acceptance claimed','records':records,'patches':patches,'heldDecisions':[{'sourceRow':r['id'],'source_es':r['source_es'],'source_ru':r['source_ru'],'decision':d,'integrated':False} for r,d in zip(held,resolutions)],'summary':{'records_reviewed':len(records),'changed_headwords':sum(p['pointer'].endswith('/es') for p in patches),'changed_translations':sum(p['pointer'].endswith('/ru') for p in patches),'new_context_examples':len(examples),'held_rows_reviewed':len(held),'new_vocabulary_indices':0}}
    write_json(ROOT/'data/reviewed/vocabulary-review.json',result);print(result['summary']);return result
if __name__=='__main__':compile_review()
