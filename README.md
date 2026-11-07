# Mi Español — исправленный R6

[Скачать исправленный ZIP](https://github.com/VvikB/Mi-Espa-ol/raw/refs/heads/r6-a1-lessons/downloads/Mi_Espanol_R6_Reviewed.zip) · [HTML](https://github.com/VvikB/Mi-Espa-ol/raw/refs/heads/r6-a1-lessons/pilot/Mi_Espanol_R6_Reviewed.html)

Ветка r6-a1-lessons. Завершена сохранённая содержательная проверка шести уроков, R7 не начинался. Прежние ID, 483 словарные записи, 73 таблицы и прогресс сохранены. Перед переходом экспортируйте копию прогресса. Исходный R6 закреплён тегом r6-checkpoint-2026-11-06; прежний HTML/ZIP остаются в репозитории.

Уточнены обязательное ядро/справка, опоры, варианты ответов и контроль целей. Ошибки понимания учитываются отдельно, повтор привязан к конкретным заданиям и виден в Прогрессе. Старый результат не получает автоматически зачёт обновлённой проверки. Пользователь подтвердил запуск и работу исходного R6; исправленный пакет требует отдельной проверки на устройстве. Независимая ELE-приёмка и прямая сверка PCIC/CEFR не заявляются.

[Отчёт исправлений](docs/r6-quality-review/REPORT.md) · [Матрица замечаний](docs/r6-quality-review/REVIEW_MATRIX.md) · [Исправленные уроки и ключи](docs/r6-quality-review/LESSONS_FOR_REVIEW.md) · [Контрольные суммы](audit/r6-quality-review/SHA256SUMS)

Воспроизведение: make r6-reviewed-internal; make r6-reviewed-test; make r6-reviewed-package. Новый прогон создаёт отдельную папку verification-…; если код изменился, укажите её через VERIFY_DIR при пакетировании. Для одной документационной правки тесты заново не нужны. Полный курс A1–B2 не завершён.

---

# Mi Español — R6: первые шесть авторских уроков A1

[Скачать ZIP R6](https://github.com/VvikB/Mi-Espa-ol/raw/refs/heads/r6-a1-lessons/downloads/Mi_Espanol_Pilot_R6.zip) · [Отдельный HTML](https://github.com/VvikB/Mi-Espa-ol/raw/refs/heads/r6-a1-lessons/pilot/Mi_Espanol_Pilot_R6.html)

Ветка r6-a1-lessons основана на R5 53f42e0. R5 закреплён тегом r5-checkpoint-2026-11-06; main не подменён. Перед переходом экспортируйте прежний прогресс.

Сегодня → Открыть уроки A1. Темы: звуки/чтение; кто я и где я; мой день; покупки/еда; город/время; ближайшие планы. Уроки содержат оригинальные диалоги, чтение, отдельные TTS-сценарии, объяснения, разнообразную практику, контроль и повторение. Место и черновики сохраняются в прежнем Journey; старые данные и карточки доступны.

Это проверочный учебный блок. Независимая методическая/ELE-проверка и физическая приёмка iPhone/Safari ожидаются. Полные книги недоступны; официальные PCIC/CEFR вернули HTTP 403, карта предварительная. Полный курс A1–B2 не завершён.

## Состояние и доказательства

- [Постоянные инструкции](AGENTS.md), [статус](docs/CURRENT_STATUS.md), [решения](docs/DECISIONS.md), [следующие действия](docs/NEXT_ACTIONS.md)
- [Отчёт R6](docs/r6/REPORT.md), [все шесть уроков с ключами для методиста](docs/r6/LESSONS_FOR_REVIEW.md)
- [Источники](docs/methodology/SOURCE_REGISTER.md), [стандарт урока](docs/methodology/LESSON_STANDARD.md), [предварительная карта PCIC/CEFR](docs/r6/PCIC_CEFR_COVERAGE.md)
- [Непроверенное](docs/r6/UNVERIFIED.md), [QA и реестр новых элементов](audit/restoration-r6/), [SHA-256](audit/restoration-r6/SHA256SUMS)

## Воспроизведение

Python 3, Node.js, Playwright/Chromium — зависимости прежние, версия Playwright в requirements-audit.txt.

    make r6-internal
    make r6-test
    python tools/export_lessons.py
    make r6-package

Пакетирование требует совпадения HTML с успешными итоговыми отчётами. Для документальных правок не повторять полный аудит/QA без причины. make internal/r4-internal/r5-internal воспроизводят прежние внутренние артефакты; сборщик исключает API-добавки R6 из старых ревизий.

originals/, assets/, data/core.json и data/recovered/ и data/reviewed/ сохраняются. data/lessons/ — новые источники уроков с происхождением и ID; src/lessons.js — представление на общей архитектуре Journey/StateStore/BackupService/TTS; audit/ — доказательства. Исторические и новые материалы не смешиваются.
