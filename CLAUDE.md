# Compressly

On-device Android app (iOS later) that frees 40–60% of photo and video storage. It re-encodes media at **the same resolution** (H.264 → HEVC in MP4; JPEG → lossless-optimised JPEG or HEIC), checks every output with SSIM, and removes originals only after the user approves the system dialog. **No media, thumbnails or file names ever leave the phone.** Freemium: free scan, 2 GB/month free, Pro ₹49/mo · ₹399/yr · ₹999 lifetime, rewarded ads +200 MB. Launch target: Tue 9 Feb 2027.

**Stack:** Flutter 3.47 · Dart 3.13 (UI) · Pigeon bridge · Kotlin native engine: Media3 Transformer (hardware HEVC), HeifWriter, libjpeg-turbo (JNI), Room, WorkManager, foreground service · RevenueCat · AdMob rewarded + UMP · Firebase (Analytics, Crashlytics, Remote Config). No backend.
The native **Room DB is the single source of truth** for jobs and history; the DPR's Drift layer is dropped (TECH_STACK §1 D4). Don't add Drift, a state-management package or FFmpeg unless asked.

## Who you're working with

Vedant is the founder, designer and tester and does not hand-code. You are the programmer, Dart and Kotlin both. So:
- Explain what changed and **exactly what to check on the phone** in plain words, not code-speak.
- Make decisions that have a sensible default yourself and say what you chose. Ask only when the answer changes the product or touches safety of originals.
- When something fails, show the real error and what you'll try next.

## Docs (read the relevant one before building)

| Need | Read |
| --- | --- |
| What to build next | `docs/IMPLEMENTATION_PLAN.md` (first unticked session) and `docs/DESIGN.md` §12 |
| Screens, copy, presets, tokens, free-tier rules | `docs/DESIGN.md` |
| Layers, folders, Pigeon contract, job states, safety design, DB | `docs/ARCHITECTURE.md` |
| Requirement ids (FR-xx / NFR-xx) | `docs/SRS.md` |
| Allowed packages and native libs | `docs/TECH_STACK.md` (add there first, with a reason) |
| Dates, gates, KPIs, status log | `docs/PROJECT_PLAN.md` |
| Risks | `docs/RISK_REGISTER.md` |

## Commands

```bash
flutter pub get
dart run pigeon --input pigeons/engine_api.dart        # after any bridge change
flutter analyze                                        # must be clean
flutter test                                           # must pass
cd android && ./gradlew :app:testDebugUnitTest          # Kotlin JVM tests, must pass
cd android && ./gradlew :app:connectedDebugAndroidTest  # on-device engine tests (phone connected)
flutter run -d <device-id>                             # `flutter devices` to list
flutter run -d windows --dart-define=FAKE_SERVICES=true # UI work without a phone
flutter build apk --release --split-per-abi --target-platform android-arm64
dart run tool/check_size.dart                          # warn > 22 MB, fail > 25 MB
```

## Hard rules

1. **Never lose an original.** Originals are opened read-only, deleted only through the system dialog, and only for READY jobs whose output is re-verified (ARCHITECTURE §7). Any change under `scan/`, `encode/`, `quality/`, `library/`, `queue/` or `schedule/` needs `/safety-test` green before commit. If a rule here and a deadline conflict, the rule wins.
2. **One feature per session.** Finish it, verify it, commit it. Don't start the next one unasked.
3. **Before every commit:** `flutter analyze` clean, `flutter test` green, Kotlin unit tests green. Never commit a broken build. Never use `--no-verify`.
4. **Same resolution, measured quality.** Never change width, height, frame rate, duration or rotation. Every output passes the quality gate (FR-09, FR-10, FR-37). No downscaling code in MVP.
5. **Privacy.** No media, thumbnails, file names, paths, dates taken or locations in analytics, logs, Crashlytics keys or error messages. Bucket numbers in analytics.
6. **Minimal permissions.** No MANAGE_EXTERNAL_STORAGE, camera, mic, contacts or location. A new permission needs a TECH_STACK §5 update and a `policy-checker` review.
7. **Tunables are data.** Preset bitrates, SSIM thresholds, allowance, ad caps and deny lists come from bundled defaults mirrored as Remote Config keys (ARCHITECTURE §9). Never hard-code them in screens or engine logic.
8. **Layering.** UI never calls Pigeon or SDKs directly; every SDK sits behind an interface in `lib/core/services/` with a `Fake`. Business rules live in pure Dart (`lib/core/domain/`) or pure Kotlin classes, not in widgets, Activities or Workers.
9. **Bridge is generated.** Edit `pigeons/engine_api.dart`, regenerate, then update both sides. Never hand-edit `*.g.dart` / `*.g.kt`.
10. **Secrets.** Test ad ids and RevenueCat sandbox keys only in git. Real ids come from `--dart-define` and env-fed Gradle properties. Never read, print or commit `key.properties`, `*.jks`, `.env*`.
11. **Size budget.** ≤ 21 MB arm64 download target, warn > 22, fail > 25; install < 30 MB. Check after adding any SDK or native lib.
12. **Licences.** Every third-party library and every golden-set file gets a row in `LICENSES.md`.
13. **Requirement traceability.** Put the FR/NFR id in test names and commit messages when you implement or verify one.
14. **iOS** (`ios/`) is untouched until the iOS go decision (Mon 22 Feb 2027) unless asked.

## Workflow per session

1. Read the session row in `IMPLEMENTATION_PLAN.md` and the matching parts of DESIGN, SRS and ARCHITECTURE.
2. Say in 2–4 lines what you'll build and how Vedant will check it.
3. Build it with tests (Dart domain and Kotlin engine logic get unit tests; encoder, metadata and MediaStore behaviour get on-device tests or a phone checklist).
4. Run analyze, Dart tests and Kotlin tests. Run `/safety-test` if the engine changed, `/quality-check` if encoding or presets changed, `/check-size` if dependencies changed.
5. Tell Vedant what to check on the phone. Once Vedant confirms it works, tick the box in `IMPLEMENTATION_PLAN.md` and commit:
   `feat(<area>): <what> [FR-xx]`, with the attribution trailer required by the environment.

## Code style (summary; details in `.claude/rules/`)

- Dart 3 features (records, patterns, sealed classes) where they make code clearer. `final` by default, `const` constructors.
- Kotlin: coroutines with structured scopes, no `GlobalScope`, no `!!` in engine code, sealed classes for results.
- Files `snake_case.dart`, Kotlin `PascalCase.kt`; one public class per file in services and engine packages.
- No `print` / `println` / raw `Log.d`; use the `log` helpers, which strip media identifiers.
- Time through an injectable `Clock` on both sides so logic is testable.
- Comments explain *why*, not *what*. Match the surrounding code.

## Project-specific tooling

- Rules: `.claude/rules/` (scoped by path).
- Skills: `/next-session`, `/device-test`, `/safety-test`, `/quality-check`, `/tune-preset`, `/bridge-change`, `/check-size`, `/release-build`.
- Agents: `code-reviewer`, `media-safety-auditor`, `media-engine-expert`, `test-writer`, `policy-checker`, `performance-auditor`.
