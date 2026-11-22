# R7 — Expo speech defect / text-only bottom tabs / Web protection

Date: 2026-11-22. Source: user confirms both Web R7 and Expo R7 open on real devices. User reports no speech in Expo and likes text-only navigation.

## Product decision
Keep **five text-only bottom tabs**: Сегодня, Уроки, Слова, Грамматика, Прогресс. Not a bug and not an unfinished icon design. Future refinement: accessibility hit targets, dynamic type, one-line truncation. Icons only where they clarify actions (speaker, search, calendar), not in bottom navigation.

## Diagnosis / fix
Expo's official expo-speech documentation explicitly states that on **physical iOS devices speech does not produce sound in silent mode**. This is a plausible cause, not conclusively identified for the user's device. First on iPhone: switch off silent mode / raise media volume, test outside bluetooth headphones and AirPlay.

Prior mobile/App.js used `Speech.stop(); Speech.speak(...)` synchronously without awaiting the asynchronous stop. This can cause stop/play ordering issues. New code:
- `await Speech.stop()` before `Speech.speak`;
- track utterance tokens to ignore stale callbacks after navigation/stop;
- show status messages and a "🔊 Проверить испанский звук" diagnostic button on Today and Progress;
- query installed voices for diagnostics;
- distinguish speech synthesis completion from actual hearing. The learner must explicitly confirm hearing; otherwise listening tests are not scored as objective audio. Transcript fallback remains reading.

## Caution
Do not claim the fix is fully verified until the user hears the voice on an actual iPhone. The onDone callback cannot establish that sound was audible, particularly in iOS silent mode. Do not globally force audio in silent mode based on speculation; avoid new audio-session dependencies until checked on a native development build. Native voice is iOS TTS, not recorded native Spanish audio.

## Web
No HTML change needed for this particular native bug. R7 Web remains built from R6 original lessons, originals, content and existing audio service; do not replace Web with Expo or delete historical backups. The shared adaptive modules remain common to both.

## Acceptance
1. Disable iPhone silent mode, raise volume.
2. Today -> "Проверить испанский звук". Should hear "Hola. Buenos días. Estoy aprendiendo español."
3. Tap speaker on one dictionary word.
4. Open lesson listening step -> play, wait until completion, explicitly confirm audio; verify no audio scoring after opening transcript.
5. Navigate away during audio, replay a new word; confirm prior audio stops and new utterance is not cancelled by stale callback.
6. Run a browser R7 smoke check for independent HTML sound, lessons and backup.
7. Keep all original user data.
