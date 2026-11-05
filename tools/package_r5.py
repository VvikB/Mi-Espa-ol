#!/usr/bin/env python3
"""Package the exact tested R5 HTML; keep R3/R4 deliveries immutable."""
import json,shutil,zipfile
from pathlib import Path
from audit import ROOT,sha,write_json
from build import build

def main():
    source,manifest=build(revision='R5');reports=['content-tests.json','regression-tests.json','backup-tests.json','journey-tests.json']
    for name in reports:
        r=json.loads((ROOT/'audit/restoration-r5'/name).read_text())
        if r['artifact_sha256']!=manifest['artifact_sha256'] or r['summary'].get('FAIL',0):raise ValueError('Missing passing test for this artifact: '+name)
    html=ROOT/'pilot/Mi_Espanol_Pilot_R5.html';shutil.copyfile(source,html)
    note=ROOT/'downloads/OPEN_R5_RU.txt';note.write_text('''Mi Español R5 — редакторская проверочная версия. Не финальный выпуск.

Сначала в прежней версии: Прогресс → Экспорт JSON. Сохраните копию отдельно.
Распакуйте архив в «Файлах» и откройте HTML тем же способом, которым работал R2.
При необходимости импортируйте сохранённый JSON. Исходный файл прогресса не удаляйте.

Что проверить на iPhone 13 Pro Max:
1. Словарь: endosar, sentir, carrera — перевод и «Употребление и источник».
2. Прослушать слово и новый испанский пример (не русский перевод).
3. Карточки: раскрыть ответ, прочитать пояснения и пример.
4. Библиотека → речевые схемы → TENER → конспект (страница 01).
   Умения: источник не найден, отображается осторожная пометка.
5. Библиотека → грамматика → Употребление артиклей →
   Артикль перед существительным и прилагательным: el agua fría, la fría agua.
6. Открыть прежний прогресс/незавершённое занятие; проверить продолжение после закрытия.
7. Сообщить версию iOS, способ открытия HTML, конкретные кнопки без звука.

483 записи/выражения вычитаны помощником; 103 новых примера помечены как созданные в R5.
Это не независимая методическая приёмка и не готовый полный курс A1–B2.
Исходные материалы и индексы сохранены. На физическом iPhone/Safari R5 ещё не проверен.
Все результаты браузера относятся к Chromium через локальный HTTP, голос имитировался.
''')
    buildfile=ROOT/'audit/restoration-r5/build.json'
    payload=[(html,html.name),(note,'OPEN_ME_RU.txt'),(buildfile,'build.json')]
    checksums=''.join(sha(path.read_bytes())+'  '+name+'\n' for path,name in payload)
    archive=ROOT/'downloads/Mi_Espanol_Pilot_R5.zip'
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for raw,name in [(p.read_bytes(),n) for p,n in payload]+[(checksums.encode(),'SHA256SUMS')]:
            info=zipfile.ZipInfo(name,(2026,11,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,raw,compresslevel=9)
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        for path,name in payload:assert sha(z.read(name))==sha(path.read_bytes())
    delivery={'classification':'PERSONAL_EDITORIAL_PILOT_R5_NOT_FINAL_RELEASE','source_branch':'r5-content-review','html_sha256':sha(html.read_bytes()),'zip_sha256':sha(archive.read_bytes()),'html_bytes':html.stat().st_size,'zip_bytes':archive.stat().st_size,'physical_iPhone_Safari':'PENDING','independent_methodical_acceptance':'PENDING','reports':reports,'archive_integrity':'PASS'}
    write_json(ROOT/'downloads/manifest-R5.json',delivery)
    for path in [html,archive]:shutil.copyfile(path,Path('/workspace/artifacts')/path.name)
    print('R5 package verified',delivery['zip_bytes'],'bytes',delivery['html_sha256'])
if __name__=='__main__':main()
