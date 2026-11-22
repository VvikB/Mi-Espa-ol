# Mi Español R7 — Web + Mobile shared milestone (2026-11-22)

## Non-negotiable architecture
ONE product, TWO user experiences: standalone HTML browser build and React Native + Expo native build. Both consume the same pure-JS adaptive calculations in `src/adaptive/core.js`. Content canonical master remains the original R6 data/lessons, vocabulary, atlas, original images. Expo carries an auditable extracted content bundle; do not edit it manually as if it were the master. No automatic cloud sync has been authorized or implemented.

## Package in this checkpoint
Shared logic:
- `activityCalendar(journal,endDay,28)`: 28 daily data points with zeroes for empty days, actual logged minutes and word practice.
- `skillEvidence(journal,endDay)`: independent 28-day per-skill evidence (minutes, active days, objective attempts/correct, self-assessment count), with a conservative low-score recommendation only after >=5 objective attempts and <70% correct.
- No fake streaks, mastery, CEFR certificates, or penalties for days missed.

Web R7 preview:
- `src/adaptive/web.js` adds a 28-day activity calendar, six-skill insight rows, and navigation to the existing R6 progress / targeted error review area.
- Keeps the underlying full R6 HTML lessons and original source sheets, images, backup v3, and unchanged StateStore key. R7 additions live under `miAdaptive7` and are included in snapshots because R6 keeps unknown progress keys.
- This cockpit is a separate R7-preview build overlay, not yet a polished Web main-screen integration. Full browser QA and actual Safari compatibility not yet established.

Expo R7 preview:
- Existing five tabs, original 6 A1 authored lessons, 483 vocab records, 73 digital tables and audio are retained.
- New 28-day activity calendar and skill evidence display in **Прогресс**, powered by the same `src/adaptive/core.js`.
- Existing local state remains under `mi-espanol-r7-native-preview-v1`; no deletion or reset.
- Progress in Expo is NOT auto-synced with Web. Repeated manual logging in both versions will be counted separately until a compatible safe synchronization mechanism exists.

## Verification distinctions
- Confirmed through GitHub read/write: all files saved on `r7-adaptive-learning`.
- JavaScript source syntax checks performed in isolated runtime for core/bridge/web. Shared calendar and low-score recommendation smoke tests were executed successfully.
- Test assertions added to `tests/adaptive-core.test.cjs`; GitHub Actions workflow already configured to run Node tests + separate HTML preview build and Expo iOS bundle. Workflow PASS not independently confirmed in this turn.
- Expo UI and HTML preview not executed or visually inspected on a device in this turn.
- User's previous iPhone screenshots confirm the earlier five-tab native UI was running, NOT that today's added calendar is accepted.

## Parity matrix
| Function | Web R6/R7 preview | Expo R7 preview | Remaining |
| --- | --- | --- | --- |
| 6 authored A1 lessons | Yes, original R6 | Yes, extracted content | Real-device lesson QA |
| 483 words | Yes | Yes | Integrated SRS comparison |
| 73 tables | Yes | Yes | Mobile original scanned pages |
| Original image sheets | Yes (R6) | No | Native pinch zoom and images |
| Daily actual entries | Yes (R7) | Yes (R7) | Cross-platform data exchange |
| 28-day activity calendar | Yes (R7) | Yes (R7) | UI acceptance |
| Evidence by six skills | Yes (R7) | Yes (R7) | Pedagogical review |
| R6 historical progress | Yes | No | Safe explicit import |
| Backup/restore | Existing Web R6 v3 | Not yet | Native verified backup, versioned import |
| Cross-device sync | No | No | Privacy-first design, conflicts and rollback |

## Next acceptance tasks
1. Confirm GitHub Actions Node tests and HTML preview build. Download the WEB artifact and inspect browser on Mac and Safari.
2. Launch updated Expo on iPhone and inspect new 28-day activity calendar, all six skills and existing lesson flows.
3. Implement native original image sheet display and zoom.
4. Design safe native backup/import with checksum, non-destructive merge and explicit user approval; never force migration.
5. Advance both Web and Expo with visual consistency and separate regression evidence.


## Next major increment: study flow, spaced review and native backup (2026-11-22)

### Shared contract
- Both Web/Expo call `src/adaptive/core.js` for a time-constrained daily plan; it recommends practice but does not mark planned minutes as completed.
- Actual results, manual logs and listening self-confirmation remain distinct. No fake language mastery.

### Web R7
- `src/adaptive/web.js`: daily recommendation opens the next real A1 lesson directly via the existing R6 `LessonUI`; error-review buttons use the R6 `LessonAssessment.candidates` queue and `LessonUI.start(id,true)`.
- The original R6 source scans, backup v3, glossary, grading and all legacy progress persist. No new Web import formats or destructive migration.
- This change affects the separate R7 Web preview, not immutable original R6 artifacts.

### Expo R7
- `mobile/learning.js`: per-task due review for previously graded text/reading; results of short reviews stored in `taskReviews`, **separately from full lesson results**. Due intervals 10 min on error, then 1 / 3 / 7 / 14 / 30 days for correctly repeated items. No unsupported audio auto-certification.
- `mobile/App.js`: actionable adaptive Today plan for due tasks, due words, next unfinished A1 lesson; targeted review cards in Progress.
- `mobile/backup.js`: export-only JSON envelope `mi-espanol-native-r7-progress-1`, with SHA-256 through `expo-crypto`; writing with `expo-file-system/legacy`, local file re-read and checksum verification, sharing via `expo-sharing` and iOS Save to Files menu. Opening the share menu is NOT proof user saved a copy. The exported profile contains personal learning history and should be stored privately. It is not encrypted or digitally signed.
- Dependencies added to mobile/package.json: expo-file-system, expo-sharing, expo-crypto. Users need `npm install` / `npx expo install --fix` when upgrading.
- No automatic import yet. A data restore/merge path requires separate verification; do not erase Expo Go local state based only on export.

### Tests / acceptance
- JS syntax checked with isolated execution for portable modules. Sample 20-task lesson tested with a wrong answer; due item present, short correction saved while **original complete-lesson grade remains intact**. Backup roundtrip tested in pure module with an injected test digest. Node regression tests exist for mobile course and native backup checksum but full GitHub Actions / iPhone runtime acceptance not confirmed for this increment.
- Real SHA-256 on iPhone, Files share sheet, user-selected file persistence, and re-import remain unverified.
- Existing user-confirmed Web and Expo operation refers to the PREVIOUS milestone, not this increment.
- Original scans still absent from Expo native UI.

### Acceptance on Mac + iPhone
1. `git pull --ff-only`; `cd mobile && npm install --no-audit --no-fund && npx expo install --fix && npx expo start --clear`.
2. Check Today plan with 0, 5, 15 minutes. Start and finish one lesson, deliberately answer one input incorrectly, then test targeted reviews after the interval.
3. Progress -> export JSON -> Save to Files; confirm file actually present. Do not delete app data yet.
4. Check HTML preview: `python3 tools/build_r7_preview.py` then open `.audit/working/Mi_Espanol_R7_WEB_PREVIEW.html`; use adaptive panel to open R6 lesson and targeted review. Export R6 v3 backup separately.
5. Run the Node suites; confirm no duplicate task IDs, backup tampering rejected and graded lesson score is preserved after a short review.
