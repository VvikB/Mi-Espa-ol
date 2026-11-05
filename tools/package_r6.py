#!/usr/bin/env python3
"""Deliver six authored lessons only when the exact integrated HTML has passing QA."""
import json,shutil,zipfile
from pathlib import Path
from audit import ROOT,sha,write_json
from build import build

def main():
 source,manifest=build(revision='R6')
 if manifest['course_counts']['lessons']!=6:raise ValueError('Six complete lessons required')
 reports=['lesson-tests.json','regression-tests.json','backup-tests.json','journey-tests.json']
 for name in reports:
  r=json.loads((ROOT/'audit/restoration-r6'/name).read_text())
  if r['artifact_sha256']!=manifest['artifact_sha256'] or r['summary'].get('FAIL'):raise ValueError('Missing passing report for artifact: '+name)
 content=json.loads((ROOT/'audit/restoration-r6/content-methodology-review.json').read_text())
 if content['structural_errors'] or len(content['lessons'])!=6:raise ValueError('Content gate not met')
 html=ROOT/'pilot/Mi_Espanol_Pilot_R6.html';shutil.copyfile(source,html)
 note=ROOT/'downloads/OPEN_R6_RU.txt';note.write_text('''Mi Español R6 — шесть авторских уроков A1. Проверочный пакет, не финальный выпуск.

Перед переходом экспортируйте прогресс прежней версии и сохраните копию отдельно.
Распакуйте ZIP в «Файлах», откройте HTML тем способом, которым работал R2.
При необходимости импортируйте JSON через «Прогресс». Старый файл не удаляйте.

Сегодня → Открыть уроки A1 → A1-01 → Начать / продолжить.
В уроке есть объяснение, алфавит/лексика, диалог, чтение, отдельное аудирование,
ввод ответа, новая ситуация, письмо, устная самооценка и контроль без подсказок.
Остальные уроки: представление себя, день, покупки/еда, город/время, планы.

Что проверить на iPhone 13 Pro Max:
1. Шаги, прокрутку, кнопки и русские/испанские знаки.
2. Пример произношения, слово/реплику диалога и отдельное аудирование.
3. Пока аудио не завершилось, ответ недоступен. Показ текста считается чтением.
4. Введите cafe вместо café и ano вместо año: различия должны учитываться.
5. Сохраните часть письменной работы, закройте HTML и откройте снова.
   На «Сегодня» нажмите «Продолжить занятие»; проверьте место и черновик.
6. Откройте прежний словарь, таблицы, конспекты и резервное копирование.
7. Сообщите версию iOS, способ открытия HTML и точные шаги любой проблемы.

Письмо/речь — честная самооценка; приложение не выставляет им объективную оценку.
TTS использует голос устройства, это не аудиозапись диктора.
Независимая методическая/ELE-проверка и реальная проверка iPhone/Safari не выполнены.
Соотнесение PCIC/CEFR предварительное: официальные документы не удалось получить.
Полные PDF книг в текущей среде отсутствуют; коммерческие упражнения не копировались.
Полный курс A1–B2 не завершён; 12 недель не обещают B2 за 84 дня.
''')
 files=[(html,html.name),(note,'OPEN_ME_RU.txt'),(ROOT/'audit/restoration-r6/build.json','build.json')]
 sums=''.join(sha(p.read_bytes())+'  '+n+'\n' for p,n in files)
 zip_path=ROOT/'downloads/Mi_Espanol_Pilot_R6.zip'
 with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for data,name in [(p.read_bytes(),n) for p,n in files]+[(sums.encode(),'SHA256SUMS')]:
   info=zipfile.ZipInfo(name,(2026,11,6,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data,compresslevel=9)
 with zipfile.ZipFile(zip_path) as z:
  assert z.testzip() is None and sha(z.read(html.name))==manifest['artifact_sha256']
 delivery={'classification':'R6_SIX_AUTHORED_A1_LESSONS_REVIEW_BUILD_NOT_FINAL','source_branch':'r6-a1-lessons','html_sha256':sha(html.read_bytes()),'zip_sha256':sha(zip_path.read_bytes()),'html_bytes':html.stat().st_size,'zip_bytes':zip_path.stat().st_size,'lessons':6,'independent_methodical_acceptance':'PENDING','PCIC_CEFR_direct_source_verification':'BLOCKED_HTTP_403','physical_iPhone_Safari':'UNTESTED','reports':reports}
 write_json(ROOT/'downloads/manifest-R6.json',delivery)
 for p in [html,zip_path]:shutil.copyfile(p,Path('/workspace/artifacts')/p.name)
 print('R6 package ready',delivery['zip_bytes'],'bytes',delivery['html_sha256'])
if __name__=='__main__':main()
