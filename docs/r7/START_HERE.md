# Mi Español R7 — Adaptive Learning + migration bridge

Status: STARTED, NOT RELEASED. Branch: `r7-adaptive-learning` based on `r6-a1-lessons` (R6 Reviewed). This is an architecture checkpoint and testable independent learning kernel, **not** an integrated mobile application or a finished R7.

## Decision: Expo migration without a rewrite of learning content
- Target UI: React Native + Expo (as used in FORGE), supporting iPhone and Android. Web is a secondary target, not an instruction to throw away the HTML build.
- Maintain the existing working standalone HTML as recovery / comparison baseline until mobile parity is demonstrated and accepted.
- Migrate incrementally using a platform-agnostic learning domain. Do not embed the legacy HTML into WebView as the long-term solution.
- Preserve all original learning assets, 483 vocabulary entries, 73 tables, 858 historical IDs, 36 review additions, lesson/task IDs, user history and backup contracts. Never silently recalculate old assessments.
- Keep learner records on-device by default; no obligatory account, cloud upload or AI subscription.
- Review the current R6 Reviewed on real iPhone **before declaring migration readiness**. No previous acceptance is extended to the corrected build.

## R7 functional scope
1. Daily plan with adaptive choice of review vs new content, without fixed compulsory quotas.
2. Record actual minutes, words, attempted tasks, correct/incorrect, and their date without changing previous achievements.
3. Targeted review of due items by stable IDs; avoid interpreting mere page views as mastery.
4. Weekly report (minutes, practice, scheduled reviews, observed mistakes); transparent recommendation logic.
5. Learning profile for listening, reading, grammar, writing and speech: do not report automatic mastery when speech/writing are self-assessed.
6. Calendar of planned vs actual work, with missed tasks automatically re-proposed rather than marked as failure.
7. Compatible backup/export and regression suite; no invented user measurements.
8. Continue substantive A1 lessons on the existing R6 architecture, after validating existing six lessons.

## Architecture and safeguards
- `src/adaptive/core.js` is independent of DOM, localStorage, React and Expo, and **does not mutate or automatically migrate R6 data**.
- `tests/adaptive-core.test.cjs` verifies stable example behavior in Node.
- Adapter to Journey/StateStore: future task. Build only after checking the actual serialized state shape, providing an opt-in schema-versioned additive namespace and rollback.
- Expo scaffold: future task after proving data adapter and test fixtures. Check licensing and runtime consistency of any third-party dependencies.
- FORGE inspiration: adaptable workload and review analytics; **do not copy FORGE bugs, navigation or exports**.

## Release gates
A. Unit tests for core and adapters. B. Browser regression of R6 flows. C. Real-device migration test with exported backup and restored history. D. Native Expo iPhone smoke tests. E. Pedagogical review of lessons. F. Explicit user acceptance. Separate evidence for each.
No claims of CI PASS, device acceptance, course completion or historical 15-pass progress without evidence.

## Checkpoint
2026-11-22: R7 branch opened; implementation of standalone adaptive kernel begun. R6 Reviewed remains the last corrected candidate, not physically accepted by user. Follow-up: integrate kernel behind feature flag, test with R6 fixtures, and then start Expo shell. 
