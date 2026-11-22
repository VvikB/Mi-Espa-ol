# Mi Español R7 — native technical preview

This is a first React Native + Expo screen for adaptive time settings and actual activity logging. **It does not include the R6 course, user backup import, vocabulary or lesson screens yet.** The SQLite KV-store uses a separate test key; it cannot overwrite the browser R6 profile.

On a machine with Node 22.13+:
```sh
cd mobile
npm install
npx expo install --fix
npx expo start
```
Scan the QR code using Expo Go if your SDK is supported. For ongoing native work prefer Expo development builds. No app store package or device acceptance claimed.

Expo SDK 58 is targeted for this scaffold; dependency versions must be confirmed by `npx expo install --check` after actual installation. Package lock, native compilation and launch have not yet been verified. The shared learning logic is imported from `../src/adaptive/` using Metro watchFolders. Test on actual iPhone before approval.
