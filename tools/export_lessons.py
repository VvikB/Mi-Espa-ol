#!/usr/bin/env python3
"""Readable content/answer packet for the independent methodological review."""
import json
from audit import ROOT,sha,write_json
from lesson_data import elements

def main():
 lessons=[json.loads(p.read_text()) for p in sorted((ROOT/'data/lessons').glob('A1-*.json'))];out=['# R6 — шесть уроков для содержательной проверки','','Это пакет для методиста: в нём открыты сценарии аудирования и ключи. В учебном интерфейсе текст аудирования скрыт до перехода к чтению. Все материалы написаны заново; статус — редакторский проход помощника, независимая приёмка ожидается.',''];registry=[];coverage=[]
 for l in lessons:
  out+=['## '+l['id']+' — '+l['title'],'','Результат: '+l['objective'],'','Предварительные знания: '+l['prerequisites'],'','Ситуация: '+l['situation'],'','Оригиналы: '+', '.join(str(x) for x in l['originalMaterials'])+'. Таблицы разрешаются по ID при сборке.','']
  for e in l['explanations']:out+=['### '+e['title'],'',e['text'],'']
  if l.get('alphabet'):out+=['Алфавит: '+', '.join(a+' — '+n for a,n in l['alphabet'])+'.','']
  out+=['### Лексика и сочетания','','| Испанский | Русский | Контекст | Индекс старой карточки |','|---|---|---|---|']
  for w in l['lexicon']:out.append('| '+' | '.join(str(w[k]).replace('|','/') for k in ['es','ru','note','wordIndex'])+' |')
  out+=['','### Диалог','']
  for turn in l['dialogue']['turns']:out+=['- '+turn['speaker']+': '+turn['es']+' — '+turn['ru']]
  out+=['','### Чтение','',l['reading']['text'],'','Опоры: '+'; '.join(l['reading'].get('support',[]))+'.','','### Отдельный сценарий аудирования','',l['listening']['text'],'','Используется TTS устройства. Это не запись живого диктора и не проверка произношения ученика.','','### Практика и контроль','']
  for t in l['tasks']:
   out+=['- '+t['id']+' ['+t['type']+(' / контроль' if t.get('control') else '')+']: '+t['prompt']]
   if t.get('expected'):out+=['  - Ключ: '+t['expected']+('. Варианты: '+'; '.join(t['alternatives']) if t.get('alternatives') else ''), '  - Почему: '+t['explanation']]
   if t.get('options'):out+=['  - Варианты выбора: '+' / '.join(t['options'])]
   if t.get('rubric'):out+=['  - Самооценка: '+'; '.join(t['rubric'])+'. Автоматической оценки качества нет.']
  out+=['','### Типичные ошибки','']+[ '- '+e+' → '+f for e,f in l['typicalErrors']]+['','Повторение: 1/3/7/14/30 дней при успешном контроле; после ошибок — повтор на следующий день. Следующий урок: '+l['nextLesson']+'.','']
  p=ROOT/f'data/lessons/{l["id"]}.json';digest=sha(p.read_bytes())
  registry += [dict(id=e['id'],lessonId=l['id'],source_file=str(p.relative_to(ROOT)),source_sha256=digest,level=e['level'],origin=e['origin'],objective=e['objective'],pcic=e.get('pcic',l['pcic']),cefr=e.get('cefr',l['cefrOutcome']),languageReview=e['languageReview'],methodicalReview=e['methodicalReview']) for e in [l]+elements(l)]
  coverage.append(dict(lessonId=l['id'],outcome=l['objective'],pcicAreas=l['pcic'],cefrProjectOutcomes=l['cefrOutcome'],evidenceTaskIds=[t['id'] for t in l['tasks'] if not t.get('stage')],sourceVerification='PROVISIONAL; official documents returned HTTP 403',notClaimed=['Official PCIC section-level verification','CEFR level certification','Independent ELE approval']))
 (ROOT/'docs/r6/LESSONS_FOR_REVIEW.md').write_text('\n'.join(out).rstrip()+'\n')
 write_json(ROOT/'audit/restoration-r6/new-elements.json',{'count':len(registry),'newGlobalVocabularyRecords':0,'elements':registry})
 write_json(ROOT/'docs/r6/coverage.json',{'scope':'Preliminary alignment, not verified official descriptor quotations','lessons':coverage})
 rows=['# R6 — предварительная карта PCIC/CEFR','','Официальные документы в текущей среде не прочитаны: HTTP 403. Ниже проектное соотнесение с областями A1, без вымышленных номеров дескрипторов. Языковые результаты проверяются конкретными задачами, но не означают сертификацию уровня.','','| Урок | Коммуникативный результат | PCIC: область | Проверка |','|---|---|---|---|']
 for l,c in zip(lessons,coverage):rows.append('| '+l['id']+' | '+l['objective']+' | '+'; '.join(l['pcic'])+' | '+', '.join(t['id'] for t in l['tasks'] if t.get('control'))+'; письмо/речь — самооценка |')
 rows+=['','Все шесть целей соотносятся с проектными can-do A1: знакомая медленная речь, простое описание/взаимодействие с поддержкой, бытовая транзакция, место/время, приглашение. Присвоение уровня целому учащемуся и полное покрытие A1 этими уроками не заявляются. Следующие уроки A1 и уровни A2–B2 остаются в программе.']
 (ROOT/'docs/r6/PCIC_CEFR_COVERAGE.md').write_text('\n'.join(rows)+'\n')
 print('Readable review packet and registry exported',len(registry))
if __name__=='__main__':main()
