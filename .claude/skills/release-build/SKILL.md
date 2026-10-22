---
name: release-build
description: Prepare a signed Compressly release AAB for a Google Play track (internal, closed or production). Runs every gate check (analyze, tests, safety suite, quality check, size), bumps the version, builds with real ids from dart-defines, and drafts release notes in English and Hindi. Use when Vedant says "make a release", "upload a build" or before a gate.
argument-hint: "<internal|closed|production> [notes]"
---

# Release build

Input: `$ARGUMENTS`, the track plus optional notes.

1. **Checks (all must pass, stop at the first failure):**
   - `flutter analyze` clean, `flutter test` green, `./gradlew :app:testDebugUnitTest` green
   - `/safety-test full` green on at least 2 phones since the last engine change
   - `/quality-check balanced quick` with no hard fails
   - `/check-size` ≤ 25 MB
   - No `// TODO` without a session id in changed files; no debug hooks enabled in release (`kDebugMode` gates)
   - Remote Config defaults match DESIGN §5 and §7
2. **Signing:** confirm `android/key.properties` exists **without reading it**. If missing, stop and tell Vedant.
3. **Secrets:** confirm the env vars / dart-defines exist (`ADMOB_APP_ID`, `ADMOB_REWARDED_ID`, `RC_API_KEY`). Never print their values.
4. **Version:** bump `pubspec.yaml` (`x.y.z+build`, build +1). Show the old → new value.
5. **Build:** `flutter build appbundle --release --dart-define=ADMOB_REWARDED_ID=$ADMOB_REWARDED_ID --dart-define=RC_API_KEY=$RC_API_KEY`. Report the AAB path and size.
6. **Release notes:** draft ≤ 500 characters in English and Hindi, plain and honest (no "faster than ever!" claims without data).
7. **Production only:** run the `policy-checker` agent on the listing, Data safety answers and permission declarations; confirm the RISK_REGISTER §2 checklist is ticked; recommend a staged rollout (20% → 50% → 100%).
8. Tell Vedant exactly what to upload where in Play Console, and commit the version bump: `chore(release): v<x.y.z+build> <track>`.
