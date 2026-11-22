# R7 — checkpoint 2026-11-22

## Verified in repository
- Baseline: r6-a1-lessons, R6 Reviewed. No existing lesson, source scan, catalog record or old export was overwritten.
- Shared pure JS adaptive kernel: src/adaptive/core.js.
- Non-mutating R6 progress bridge: src/adaptive/bridge.js. Stores R7 records in additive miAdaptive7 namespace.
- R7 browser cockpit: src/adaptive/web.js, included by tools/build_r7_preview.py in a **separate** HTML preview, not the historical R6 package. Screen offers adjustable daily time, real manual session logs, weekly summary, and due lesson review IDs.
- Native Expo technical preview: mobile/, supports daily time and manual activity records; separate local SQLite KV storage, **not** R6 import and **not** course/lesson playback.
- Tests: tests/adaptive-core.test.cjs and tests/adaptive-bridge.test.cjs.
- GitHub Actions workflow: .github/workflows/r7-preview.yml to run Node tests, build preview and attach HTML artifact (once CI succeeds).

## Verification actually performed
- GitHub connector confirmed created files and commit history.
- In isolated JavaScript runtime: syntax PASS for core.js, bridge.js, web.js; smoke PASS for no-mutation adapter, objective report, due lesson selection.
- GitHub Actions execution and result **NOT confirmed at this checkpoint**; use Actions tab.
- Full R6 browser regression NOT run; production Safari/iPhone runtime NOT tested; Expo npm install, bundling, on-device runtime NOT tested.

## Scope / non-claims
- Manual practice activity is not automatic learning success. Legacy R6 lesson/journey events are intentionally *not* auto-converted into weekly R7 stats.
- R6 legacy notes and completion results are not retroactively modified.
- No cross-device synchronization. Browser and native preview records are independent until migration and synchronization contracts are accepted.
- Native preview lacks R6 lessons, tables, photos, audio, import/export. It is infrastructure, not a replacement for Web.
- The historical 15 product passes are not counted off based on R7 commits. Full A1–B2 completion is not claimed.
- Web feature is a separate preview layer, not an accepted integration into the standard R6 distribution.

## How to check
Web: open the Actions workflow **R7 preview and adaptive tests** on branch `r7-adaptive-learning`. When green, download `Mi-Espanol-R7-Web-Preview` workflow artifact and open HTML; test on desktop before Safari. Or locally run `python tools/build_r7_preview.py`.
Native: see mobile/README.md. Requires Node 22.13+ and real package installation. The native sandbox has separate local sample storage: it does not read a user's R6 state.
Never replace existing user data with the preview. Export R6 backup first.

## Next required implementation
1. Run GitHub Actions and fix failures; verify R6 browser regression before distributing web preview as accepted.
2. Export sample R6 v3 backup; build one-way validated preview importer to mobile with explicit user confirmation and rollback.
3. Create native Lesson/Library screens with original source assets rather than blank substitutes.
4. Add real measured task attempts to R7 without double-counting R6 event journal.
5. Verify Safari and Expo on a real iPhone; resolve mobile build issues; add review and report content.


## Major native content package (2026-11-22; subsequent checkpoint)

**Files committed**
- `mobile/content/course.json`: derived without substituting titles or demo filler from the six original R6 A1 lesson JSONs and original/recovered vocabulary/grammar. Includes 6 lessons × 20 tasks (120), 483 vocabulary entries, 16 grammar sections and 73 tables. This view omits embedded original page images, which remain untouched in `assets/pages`.
- `mobile/learning.js`: resume, answer checking with exact Spanish accents, self-assessment with no objective credit, listening distinction, latest result per task, spaced word review, immutable state updates.
- `mobile/App.js`: five-tab academy (Today, Lessons, Words, Grammar, Progress); explanation/dialogue with translation and TTS, reading/listening, six A1 lessons with checks, search/flashcards, grammar tables and manual actual-work reporting.
- `mobile/package.json`: expo-speech dependency; `mobile/metro.config.js`: corrected configuration export.
- `tests/mobile-course.test.cjs`: real content and assessment regression tests.
- GitHub Actions: extends Node verification to native module and adds Expo iOS JS bundle job.
- `mobile/README.md`: update commands and current caveats.

**Verification actually performed**
- GitHub files are saved, the compact course bundle parsed and enumerated in tool context: 6 lessons, 120 tasks, 483 vocabulary items, 16 atlas sections, 73 tables.
- Pure JS portable mobile-learning module evaluated with original extracted course JSON: complete 20-task A1-01 sample cycle finished, 7/7 objective controls counted; zero missing expected answers and zero multiple-choice options without expected answers across all 120 tasks.
- Not yet demonstrated: workflow PASS, actual Expo bundling on local user's machine, screenshot/visual inspection on device, completed QA on iPhone, R6 backup import or sync. Do not imply completed device testing.

**Known limitations**
- Native speech uses installed device TTS, not professionally recorded dialogues; listening tests require confirmed TTS completion to count as objective audio tasks; opening transcript does not qualify.
- Full original scans and image-based vocabulary not yet embedded in native UI. They remain available in original Web R6.
- New native results are separate from browser R6. No automatic transfer, cloud sync or native export/import yet, so avoid deleting app data.
- Manual logs can accurately record user-entered work but cannot prove knowledge. Time inside lessons is not automatically metered yet. Objective statistics count only scored tasks.
- R7 is not a finished release. Independent ELE review, iPhone acceptance, and historical 15-pass reconciliations remain open.

**Next**: obtain green CI including mobile bundle; fix native dependencies/runtime errors; native backup and safe R6 import; add original scanned grammar sheets with zoom, audio reliability and review scheduling; then expand beyond A1-06.


## Dual-platform increment — 2026-11-22
See [DUAL_PLATFORM_CHECKPOINT.md](DUAL_PLATFORM_CHECKPOINT.md) for the authoritative Web/Expo parity matrix and QA evidence.

- **Shared** `src/adaptive/core.js`: added 28-day `activityCalendar` and conservative `skillEvidence` methods. No global data migration.
- **Web** `src/adaptive/web.js`: 28-day calendar, six-skill breakdown and shortcut to R6 native error-review area. Existing R6 full page content, original scans, and browser backup remain intact; access via the separate R7 Web preview.
- **Mobile** `mobile/App.js`: same activity calendar and six-skill evidence in Progress tab, retaining earlier five-tab native UI and SQLite state key.
- Tests extended in `tests/adaptive-core.test.cjs` with missing-days and speaking self-assessment safety checks.
- Isolated-JS syntax smoke checks of Web modules and sample shared reports PASS. Full Actions, HTML browser UX, Expo bundling and today's iPhone acceptance NOT yet verified.
- The user's earlier screenshots verified that the previous mobile five-tab screen rendered; they do not prove that this newly added increment renders.
- No claims of course-completion, two-way sync, Web/native data migration, or additional user-accepted passes.


## iOS speech repair + navigation acceptance (2026-11-22)
- User confirmed both Web and Expo opened after the last dual-platform package, but reports Expo sound missing.
- Expo docs: on a physical iPhone, `expo-speech` does not produce audible speech while iOS is in silent mode. This cause is plausible but not confirmed for this user's phone.
- Native code changed to await asynchronous `Speech.stop()` before speaking, ignore stale utterance callbacks, display voice diagnostics, and require explicit "I heard" confirmation before allowing an audio task to be objectively credited. Text fallback remains reading only.
- Bottom menu: intentionally text-only, five tabs; do not add icons simply to fill space. Documented in [AUDIO_AND_NAVIGATION.md](AUDIO_AND_NAVIGATION.md).
- Web R7 unchanged for this specific native audio issue. HTML remains first-class and its browser audio engine is not replaced.
- GitHub commits verified; audible speech, Expo bundle and real-device acceptance of the fix **not verified yet**. Test after updating and disabling iPhone silent mode.
