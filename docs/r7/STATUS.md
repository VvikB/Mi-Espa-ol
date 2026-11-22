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
