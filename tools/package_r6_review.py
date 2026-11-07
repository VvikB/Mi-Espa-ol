#!/usr/bin/env python3
"""Package corrected R6 only; preserve the original user-tested R6 delivery."""
import argparse,json,shutil,zipfile
from pathlib import Path
from audit import ROOT,sha,write_json
from build import build

def package(verification):
 verification=verification.resolve()
 if not verification.is_relative_to((ROOT/'audit/r6-quality-review').resolve()):raise ValueError('Unexpected verification directory')
 source,manifest=build(output=ROOT/'.audit/working/Mi_Espanol_R6_REVIEW.html',revision='R6',audit_dir=verification)
 if manifest['counts']['vocab']!=483 or manifest['counts']['tables']!=73 or manifest['course_counts']['lessons']!=6:raise ValueError('Preservation/count gate failed')
 reports=['quality-tests.json','lesson-tests.json','regression-tests.json','backup-tests.json','journey-tests.json']
 summaries={}
 for name in reports:
  r=json.loads((verification/name).read_text())
  if r['artifact_sha256']!=manifest['artifact_sha256'] or r['summary'].get('FAIL',0):raise ValueError('No passing report for this HTML: '+name)
  summaries[name]=r['summary']
 target=ROOT/'pilot/Mi_Espanol_R6_Reviewed.html';archive=ROOT/'downloads/Mi_Espanol_R6_Reviewed.zip';note=ROOT/'downloads/OPEN_R6_REVIEWED_RU.txt'
 shutil.copyfile(source,target)
 note.write_text('''Mi Español — исправленный R6, не R7 и не финальный выпуск.

Перед переходом в прежнем R6: Прогресс → Экспорт JSON. Сохраните копию отдельно.
Исходный HTML/ZIP R6 не удаляйте. Распакуйте новый ZIP и откройте HTML прежним способом.
Если прежний прогресс не появился, импортируйте сохранённую копию через «Прогресс».

В R6 исправлены учебные пояснения, допустимые ответы, итоговый контроль и повторение.
Развёрнутая справка сохранена, но отделена от обязательного материала.
Уроков по-прежнему шесть, словарных записей 483, таблиц 73; прежние ID сохранены.

Что проверить:
1. Продолжение старого черновика и наличие записей. Старый результат не переименовывается
   автоматически в успешный результат обновлённого контроля.
2. В письменных вопросах, где это объявлено условием, нужны ¿ и ?; Enter и кнопка едины.
3. Ошибка чтения/аудио не скрывается за верными ответами грамматического контроля.
4. В «Прогрессе» и у урока видны конкретные ошибки. «Работа над ошибками» повторяет их,
   сохраняя остальные ответы; это не выдаётся за новое прохождение целого урока.
5. Ранний повтор не увеличивает интервальный шаг. После ошибки повтор назначается
   конкретному заданию; будущая дата показана отдельно.
6. Проверьте звук, прокрутку и продолжение после закрытия на iPhone.

Для исходного R6 пользователь подтвердил запуск и работу. Эта исправленная сборка
ещё требует новой пользовательской проверки. Автотесты выполнялись в Chromium,
с имитацией голоса; слышимость TTS, версия iOS и долговечность хранения не подтверждены.
Языковая проверка выполнена помощником. Независимой ELE-приёмки и прямой проверки
PCIC/CEFR нет. Полный курс A1–B2 не завершён.
''')
 files=[(target,target.name),(note,'OPEN_ME_RU.txt'),(verification/'build.json','build.json')]
 sums=''.join(sha(p.read_bytes())+'  '+name+'\n' for p,name in files)
 with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for data,name in [(p.read_bytes(),name) for p,name in files]+[(sums.encode(),'SHA256SUMS')]:
   info=zipfile.ZipInfo(name,(2026,11,7,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data,compresslevel=9)
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  assert sha(z.read(target.name))==manifest['artifact_sha256']
 delivery={'classification':'CORRECTED_R6_REVIEW_BUILD_NOT_R7_NOT_FINAL','base_commit':'a6ffd4f36c2ab89c4c94e470dc14e73e5a732f9b','branch':'r6-a1-lessons','html_sha256':sha(target.read_bytes()),'zip_sha256':sha(archive.read_bytes()),'html_bytes':target.stat().st_size,'zip_bytes':archive.stat().st_size,'verification_directory':str(verification.relative_to(ROOT)),'tests':summaries,'original_R6_user_functional_report':'POSITIVE_LAUNCH_AND_OPERATION','corrected_R6_device_acceptance':'PENDING','independent_ELE_acceptance':'NOT_PERFORMED','direct_PCIC_CEFR_comparison':'NOT_PERFORMED'}
 write_json(ROOT/'downloads/manifest-R6-reviewed.json',delivery)
 for p in [target,archive]:shutil.copyfile(p,Path('/workspace/artifacts')/p.name)
 print('Corrected R6 ZIP verified:',delivery['zip_bytes'],'bytes; HTML SHA-256',delivery['html_sha256'])
 return delivery
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--verification-dir',type=Path,default=ROOT/'audit/r6-quality-review/verification-2026-11-07');a=p.parse_args();package(a.verification_dir)
