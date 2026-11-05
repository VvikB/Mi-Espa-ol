# R4: реестр прочитанных HTML и архивов

Срез до интеграции R4: 74 файла, 6 ZIP-копий, 7 уникальных HTML по байтам. Два HTML содержат предоставленные исходные данные; остальные — наши производные сборки/оболочки. Все физически доступные ZIP прочитаны по членам с CRC и SHA-256. Недоступный расширенный архив сюда не входит. Три служебных каталога /tmp недоступны; их ошибки перечислены в JSON.

## HTML: что именно проверено

- SHA-256: d5980f6d480abcc7a586c2c51cc1406ac144069eb1e8c3a988635b053e6f7c89
  - Представитель: /tmp/mi-espanol-R3-delivery.zip!/Mi_Espanol_Pilot_R3.html
  - Проверено: полный текст HTML; разбор DB, хэши записей, таблиц и заданий; сравнение с R3. Это не методическая проверка каждой фразы.
- SHA-256: beed3e9287fa93e516425a60be804f383796badba297de670180e95c700347c0
  - Представитель: /tmp/mi-espanol-delivery.zip!/Mi_Espanol_Pilot_R2.html
  - Проверено: полный текст HTML; разбор DB, хэши записей, таблиц и заданий; сравнение с R3. Это не методическая проверка каждой фразы.
- SHA-256: 19846bc31dd50bcb6bc780709d2206a5f9f0540e65a716f2148306ed00aaf018
  - Представитель: /workspace/Mi-Espa-ol/.audit/reconstruction/Mi_Espanol_LAST_TESTABLE/reconstructed-audit-only.html
  - Проверено: полный текст HTML; разбор DB, хэши записей, таблиц и заданий; сравнение с R3. Это не методическая проверка каждой фразы.
- SHA-256: 54cb7d8ed3ff97c1f90a385ee9cf552e936fb028dafea08613541ba86e0e543a
  - Представитель: /workspace/Mi-Espa-ol/.audit/reconstruction/Mi_Espanol_Recovery_Contrast_Audio(1)/reconstructed-audit-only.html
  - Проверено: полный текст HTML; разбор DB, хэши записей, таблиц и заданий; сравнение с R3. Это не методическая проверка каждой фразы.
- SHA-256: 568c718e0ad111fd6c4236b5401bd34890c2118206d70f5ff34b8ea8f27a2f77
  - Представитель: /workspace/Mi-Espa-ol/.audit/repair-extraction/src/shell.html
  - Проверено: полный текст HTML; оболочка без константы DB; отдельного учебного массива не обнаружено.
- SHA-256: e090fb785cb6c99bab4ecf19d3e18b0cb86a47c1eff960ca52c06ae2731d642e
  - Представитель: /workspace/Mi-Espa-ol/.audit/working/Mi_Espanol_R1_INTERNAL.html
  - Проверено: полный текст HTML; разбор DB, хэши записей, таблиц и заданий; сравнение с R3. Это не методическая проверка каждой фразы.
- SHA-256: 980eeaf61022b98810d11d1b6a6338e03b6c9d9d20015fcae9c39c2c95a2847f
  - Представитель: /workspace/Mi-Espa-ol/experimental/pre-audit-draft/src/shell.html
  - Проверено: полный текст HTML; оболочка без константы DB; отдельного учебного массива не обнаружено.

## Недоступные источники

- source_candidates/Mi_Espanol_4_4_REBUILT_iPhone.html; ожидаемый SHA-256 02696b413cfbfbf82509b7a3049ca5c831aadbc77717282ff20656d62b5433c4
- source_candidates/Mi_Espanol_Integrated_Review_2026-11-02.html; ожидаемый SHA-256 2841c65f0df98a0608eddc9415ca389474bf48b6348b1baa69d510b061f03ebe
- source_candidates/Mi_Espanol_Personal_Complete_Review.html; ожидаемый SHA-256 09c69a5c130e14f1f58b31bd23e80c6fbe8ef547e4e250e09c29a71f745a16ac

Расширенный ZIP отклонён инструментом скачивания из-за предела 32 МиБ. Содержимое не прочитано; это не доказательство потери файлов. Если архив сохранился, передать через Git (ветка incoming-sources; для файлов >100 МБ — Git LFS/Release) либо разбить ZIP на части до 20 МиБ с SHA-256 каждой части. В проекте есть tools/transfer_parts.py и docs/TRANSFER.md. Если файлов больше нет, не требуется их создавать заново под видом оригиналов.

Полный машинный реестр с абсолютными местоположениями, членами архивов, контрольными суммами и различиями: audit/restoration-r4/available-sources.json. В GitHub найдена только ветка main (R3 перед публикацией R4).
