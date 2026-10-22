---
paths:
  - "android/**"
  - "ios/**"
  - "pubspec.yaml"
---

# Platform & release rules

- Package id `com.connectedinteractive.compressly` (permanent once uploaded). Never ship `com.example.*`. Published under Connected Interactive; no personal name in the app or listing.
- `minSdk 29`. `targetSdk` = whatever Google Play currently requires; check before each upload.
- Portrait on phones.
- Release: AAB with Play App Signing; `arm64-v8a` and `armeabi-v7a` only; R8 minify + resource shrinking on; keep rules for Pigeon, Room and RevenueCat checked.
- Signing: `android/key.properties` + upload keystore are **git-ignored and never read or printed**. If they're missing, tell Vedant and stop; don't generate a replacement key without asking.
- Version: bump `version:` in `pubspec.yaml` (`x.y.z+build`); build number +1 for every Play upload.
- AdMob App ID in the manifest is Google's test id in debug; release value from a Gradle manifest placeholder fed by an environment variable.
- Every new dependency is listed in `docs/TECH_STACK.md` with a reason **before** it goes into `pubspec.yaml` or `build.gradle.kts`, and gets a `LICENSES.md` row. Run `/check-size` after.
- iOS work starts only after the iOS go decision (Mon 22 Feb 2027). Don't modify `ios/` before then unless asked.
