#!/usr/bin/env python3
import json,shutil,zipfile
from pathlib import Path
from audit import ROOT,sha,write_json
from build import build

def main():
    source,manifest=build(revision='R4')
    reports=['content-tests.json','regression-tests.json','backup-tests.json','journey-tests.json']
    for name in reports:
        r=json.loads((ROOT/'audit/restoration-r4'/name).read_text())
        if r['artifact_sha256']!=manifest['artifact_sha256'] or r['summary'].get('FAIL',0):raise ValueError('Missing matching passing report: '+name)
    html=ROOT/'pilot/Mi_Espanol_Pilot_R4.html';shutil.copyfile(source,html)
    note=ROOT/'downloads/OPEN_R4_RU.txt';note.write_text('''Mi Español R4 — личная проверочная версия, не финальный выпуск.
Сначала экспортируйте прогресс прежней версии через Прогресс → Экспорт JSON.
Распакуйте ZIP в «Файлах» и откройте HTML тем же способом, которым работал R2.
При необходимости импортируйте сохранённый JSON.
Словарь: 131 исходная запись + 352 восстановленные записи/выражения из двух фото.
Новые значения требуют дальнейшей методической проверки и примеров употребления.
Проверьте поиск, звук новых слов, карточки и продолжение занятия после закрытия.
Сообщите версию iOS и конкретные кнопки, где нет звука.
Проверка R3 и R4 на физическом iPhone не подтверждена.
Полный курс A1–B2 ещё не готов; 84 плана не равны 84 полноценным урокам.
''')
    archive=ROOT/'downloads/Mi_Espanol_Pilot_R4.zip'
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for path,name in [(html,html.name),(note,'OPEN_ME_RU.txt')]:
            info=zipfile.ZipInfo(name,(2026,11,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,path.read_bytes(),compresslevel=9)
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None and sha(z.read(html.name))==manifest['artifact_sha256']
    write_json(ROOT/'downloads/manifest-R4.json',{'classification':'PERSONAL_CONTENT_RESTORATION_PILOT_NOT_FINAL','html_sha256':sha(html.read_bytes()),'zip_sha256':sha(archive.read_bytes()),'physical_iPhone':'PENDING','reports':reports})
    print('R4 package verified',archive.stat().st_size)
if __name__=='__main__':main()
