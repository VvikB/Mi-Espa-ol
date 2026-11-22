# Mi Español · R7 Native Academy (development preview)

## Real learning material now included
- 6 authored A1 lessons from original `data/lessons/A1-01.json` – `A1-06.json`, 20 tasks each (120).
- 483 vocabulary records (131 existing + 352 recovered) and 73 digital grammar tables across 16 sections.
- Lesson stages: explanation, dialogue with optional translation, lexicon, reading, listening using iPhone/Android installed speech synthesizer, multiple choice, typed answers, self-assessed writing and speaking.
- Five tabs: Today, Lessons, Words, Grammar, Progress.
- Local course resume and latest task results, spaced word cards, manual work log and 7-day R7 totals.

**Not included yet:** original page scans/images in native UI, R6 backup import, cross-device sync, independent Spanish pedagogical review, full A1–B2 content, objective automatic speech recognition, production release. All old web assets and IDs remain untouched in repository.

## Update an existing checkout
```sh
cd ~/Projects/Mi-Espanol-R7
git switch r7-adaptive-learning
git pull --ff-only
cd mobile
npm install --no-audit --no-fund
npx expo install --fix
npx expo start --clear
```
Open the QR code with Expo Go. If Wi-Fi networking fails, stop with Ctrl+C and run `npx expo start --tunnel`.

If Node reports dependency conflicts or bundling fails, capture the precise error output rather than erasing user data. The app retains the original key `mi-espanol-r7-native-preview-v1` so the previously tested R7 planning journal is preserved; the new `miMobileCourse7` namespace is additive. *Do not delete Expo Go / app data or clear storage* until an export/import bridge exists.

## Evidence and QA
Run `node --test tests/mobile-course.test.cjs tests/adaptive-core.test.cjs tests/adaptive-bridge.test.cjs` **from the repo root**. GitHub Actions has jobs for the R7 browser HTML preview and the Expo iOS JS bundle. These jobs must finish successfully before calling this build tested. QA on actual iPhone requires a separate user acceptance run.

## Dual platform policy
Existing browser R6 is preserved intact. Native and browser records are not synchronized. New native screens use a traceable compact view of original R6 course data; this does not claim all original source page assets are ported.
