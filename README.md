# Mi Español — проверочная редакторская версия R5

[Скачать ZIP R5](https://github.com/VvikB/Mi-Espa-ol/raw/refs/heads/r5-content-review/downloads/Mi_Espanol_Pilot_R5.zip) · [Отдельный HTML](https://github.com/VvikB/Mi-Espa-ol/raw/refs/heads/r5-content-review/pilot/Mi_Espanol_Pilot_R5.html)

R5 находится в ветке r5-content-review. Функциональный код main остаётся на R4; контрольная точка R4 — r4-checkpoint-2026-11-05. Перед открытием новой версии экспортируйте прогресс прежней.

Сверены 364 строки 73 цифровых таблиц по 16 изображениям. Вычитаны 483 словарные записи, добавлены 103 новых контекстных примера с переводом и явным происхождением. Исходники, прежние ID и прогресс сохранены. Это не законченный курс A1–B2, не независимая методическая приёмка и не физически проверенный выпуск iPhone.

## Контекст и доказательства

- [Обязательные инструкции](AGENTS.md)
- [Текущий статус](docs/CURRENT_STATUS.md), [решения](docs/DECISIONS.md), [следующие действия](docs/NEXT_ACTIONS.md)
- [Отчёт R5](docs/r5/RESTORATION_R5.md), [грамматика](docs/r5/GRAMMAR_REVIEW.md), [словарь](docs/r5/VOCABULARY_REVIEW.md)
- [Непроверенные материалы](docs/r5/UNVERIFIED.md), [приём трёх недоступных HTML](docs/r5/INCOMING_SOURCES.md)
- [Результаты QA и сохранность](audit/restoration-r5/), [контрольные суммы](audit/restoration-r5/SHA256SUMS)

## Воспроизведение

Python 3, Node.js, Playwright/Chromium; существующая версия Playwright указана в requirements-audit.txt. Новых зависимостей R5 нет.

    python tools/review_content.py
    make test
    make r5-test
    make r5-package

make internal воспроизводит R3; make r4-internal — R4; make r5-internal — R5. Пакетирование допускает только HTML, связанный с успешными отчётами. Для одних документальных правок эти проверки повторять не нужно.

originals/ и assets/ сохраняются неизменными; data/recovered/ — слой восстановления R4; data/reviewed/ — явные исправления и новые примеры R5; src/ — модули; tools/tests — сборка и проверки. Исторические и новые материалы не смешиваются.
