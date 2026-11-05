#!/usr/bin/env python3
"""Structural gates and a transparent authored-content review record, not ELE certification."""
import json
from audit import ROOT,sha,write_json
from lesson_data import elements
FINDINGS={
'A1-01':['Уточнены современный алфавит, ñ, региональные c/z/s и r/rr.','Убрано ошибочное требование «сохранить тильду» там, где в вопросе нет слова с тильдой.','Интонация вопроса не сведена к единственному восходящему контуру; отрицание описано синтаксически.'],
'A1-02':['SER/ESTAR не объясняются только постоянством/временностью.','Различены профессия без артикля и допустимый артикль при характеристике.','Для свободного переноса состояния приняты оба порядка Hoy estoy cansada / Estoy cansada hoy.'],
'A1-03':['В возвратной форме меняются и местоимение, и личная форма.','Отрицание стоит перед местоимением; al не заменяется a el.','Задание с Ana задаёт начальное слово, чтобы не отвергать разрешённое опущение подлежащего в свободной речи.'],
'A1-04':['Проверена арифметика: 2×2+3=7 в диалоге; 2+1=3 в чтении; 2×1,50+4=7 в аудировании.','В заказе воды разрешён por favor в начале и в конце.','Hay не меняется по числу; café→cafés и dieciséis проверяются с акцентами.'],
'A1-05':['Разведены время отправления и более раннее время встречи.','Для преобразования 15:30 явно задана 12-часовая модель с tres/media.','Формулы sigue/gira даются с переводом как навигационные выражения, не как полный урок императива.'],
'A1-06':['Устранено лишнее Hoy в разговоре о субботнем плане.','Gustar согласуется с предметом/инфинитивом; не выдается за обычное переходное «я люблю».','В заданиях разграничены ir + место и ir a + infinitivo.']}

def main():
 lessons=[json.loads(p.read_text()) for p in sorted((ROOT/'data/lessons').glob('A1-*.json'))];ids=set();records=[];problems=[]
 for l in lessons:
  for e in [l]+elements(l):
   if e['id'] in ids:problems.append('duplicate '+e['id'])
   ids.add(e['id'])
   for field in ['level','objective','origin','languageReview','methodicalReview']:
    if not e.get(field):problems.append(e['id']+' missing '+field)
   if e['origin']!='NEWLY_AUTHORED_R6_NOT_HISTORICAL':problems.append('wrong provenance')
  for t in l['tasks']:
   if not t.get('stage') and t['type'] not in ['writing','speaking']:
    if not t.get('expected') or not t.get('explanation'):problems.append('missing key '+t['id'])
    if t.get('options') and (len(set(t['options']))!=len(t['options']) or t['options'].count(t['expected'])!=1):problems.append('ambiguous options '+t['id'])
  records.append({'id':l['id'],'source_sha256':sha((ROOT/f'data/lessons/{l["id"]}.json').read_bytes()),'language':{'status':'ASSISTANT_EDITORIAL_PASS','findings':FINDINGS[l['id']],'limits':'No independent teacher or exhaustive dictionary validation'},'methodology':{'status':'PROJECT_STANDARD_CHECKED','objective':l['objective'],'closed_control':sum(bool(t.get('control')) for t in l['tasks']),'reading_words':len(l['reading']['text'].split()),'listening_words':len(l['listening']['text'].split()),'sequence':'Explanation and model → recognition/controlled production → comprehension → transfer → own writing/speech → no-hint control','limits':'External methodist review and ELE expertise pending'},'device':'REAL_IPHONE_SAFARI_UNTESTED'})
 write_json(ROOT/'audit/restoration-r6/content-methodology-review.json',{'scope':'Assistant language pass and project-methodology check; independent acceptance pending','source_access':'PCIC and CEFR official requests returned HTTP 403; no commercial textbook PDFs available','new_content_registry_count':len(ids),'lessons':records,'structural_errors':problems})
 print('Authored content registry',len(ids),'errors',len(problems))
 if problems:raise SystemExit(1)
if __name__=='__main__':main()
