# Compressly: Tech Stack

Last updated: 22 Oct 2026 · Owner: Vedant Solanki · Source: DPR §8
**Rule:** a package or native library goes into this file, with a reason, **before** it goes into `pubspec.yaml` or `build.gradle.kts`. Pin exact versions at Phase 0 and record them here.

---

## 1. Decision record

| # | Decision | Why | Date |
| --- | --- | --- | --- |
| D1 | Flutter UI + native Kotlin engine (Swift on iOS later) | One UI codebase; compression must use hardware encoders, which only native APIs reach reliably | DPR |
| D2 | Pigeon for the bridge | Type-safe generated Dart ↔ Kotlin code instead of hand-written channel strings | DPR |
| D3 | Media3 Transformer for video | MediaCodec hardware HEVC, HDR support, MP4 output, no FFmpeg licence or size cost | DPR |
| D4 | **Native Room is the only engine database; Drift dropped** | Background jobs (WorkManager/FGS) run without a Flutter engine, so the queue must live natively. Two databases would need syncing and could disagree about whether an original is safe to delete. Flutter reads everything through Pigeon. UI-only prefs use `shared_preferences` | 22 Oct 2026 |
| D5 | SSIM in Kotlin first (luma plane, downscaled), NDK C++ only if too slow | Simpler to build and test; 10–20 frames at ≤ 960 px wide is cheap. Move to C++ if verification takes > 15% of encode time | 22 Oct 2026 |
| D6 | No state-management package; `ChangeNotifier` + `AppScope` | Same pattern as Doodle Rage; small app, fewer dependencies | 22 Oct 2026 |
| D7 | RevenueCat over raw Play Billing | One entitlement system for Android and iOS, receipt validation without our own server | DPR |
| D8 | No backend server for MVP | RevenueCat handles receipts; Firebase handles analytics and config | DPR |
| D9 | Remove the `flame` dependency that the template added | Not a game; saves size | 22 Oct 2026 |

Alternative considered: fully native Kotlin + Swift UI. Rejected for now because it doubles UI work for a founder + Claude Code team.

## 2. Toolchain (dev laptop, Windows 11)

| Tool | Version | Note |
| --- | --- | --- |
| Flutter | 3.47.x stable | Already installed |
| Dart | 3.13.x | Ships with Flutter |
| Android Studio + SDK, NDK | Latest stable | NDK for libjpeg-turbo JNI |
| JDK | 17 (bundled with Android Studio) | Gradle |
| Kotlin | Version bundled with the Flutter Android template | `android/settings.gradle.kts` |
| Git + GitHub (private repo) | — | |
| adb | Platform-tools | Device tests and safety scripts |
| Figma | Free tier | Designs and prototype |

## 3. Flutter packages (`pubspec.yaml`)

### App
| Package | Why |
| --- | --- |
| `flutter_localizations` + `intl` | English/Hindi, number and size formatting (gen-l10n from ARB) |
| `shared_preferences` | UI-only prefs (onboarding seen, language override). Never engine state |
| `url_launcher` | Privacy policy, battery settings deep links, store subscription management |
| `package_info_plus` | Version in About and analytics |

### Services
| Package | Why |
| --- | --- |
| `purchases_flutter` (RevenueCat) | Subscriptions, lifetime, restore |
| `purchases_ui_flutter` | **Not used**; we build our own paywall to match the design |
| `google_mobile_ads` | Rewarded ads + UMP consent |
| `firebase_core`, `firebase_analytics`, `firebase_crashlytics`, `firebase_remote_config` | Funnels, crash-free rate, presets and pricing tests without releases |

### Dev only
| Package | Why |
| --- | --- |
| `pigeon` | Generates the bridge from `pigeons/engine_api.dart` |
| `flutter_lints` (stricter set in `analysis_options.yaml`) | Code quality |
| `integration_test` | On-device UI flows |

## 4. Native Android libraries (`android/app/build.gradle.kts`)

| Library | Why |
| --- | --- |
| `androidx.media3:media3-transformer`, `media3-effect`, `media3-common`, `media3-muxer` | Hardware HEVC encode, MP4 muxing with metadata (location, creation time, orientation) |
| `androidx.work:work-runtime-ktx` | Content-URI trigger on new media, charging constraint, retries |
| `androidx.room:room-runtime`, `room-ktx` (+ KSP compiler) | Engine database (D4) |
| `androidx.heifwriter:heifwriter` | JPEG → HEIC |
| `androidx.exifinterface:exifinterface` | Read/write photo EXIF (date, GPS, orientation, camera model) |
| `androidx.core:core-ktx`, `androidx.lifecycle:lifecycle-service` | FGS, notifications |
| `org.jetbrains.kotlinx:kotlinx-coroutines-android` | Engine concurrency |
| libjpeg-turbo (source, built with CMake via NDK) | `jpegtran`-style lossless optimisation over JNI. Licence: IJG + BSD-3 + zlib; record in `LICENSES.md` |

Test: JUnit 4, `kotlinx-coroutines-test`, Robolectric (for MediaStore-free logic only), AndroidX Test + `androidx.test.ext:junit` for on-device tests, Room in-memory DB.

## 5. Platform targets

| Item | Value |
| --- | --- |
| Package id | `com.connectedinteractive.compressly` (permanent once uploaded) |
| App name | Compressly (store title "Compressly: Free Up Storage") |
| `minSdk` | 29 (Android 10) |
| `targetSdk` | Whatever Play currently requires; check before each upload |
| ABIs | arm64-v8a, armeabi-v7a |
| Orientation | Portrait (tablets: allow both) |
| FGS types | `mediaProcessing` (API 35+), `dataSync` (API 29–34) |
| Permissions | READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_MEDIA_VISUAL_USER_SELECTED, READ_EXTERNAL_STORAGE (maxSdk 32), ACCESS_MEDIA_LOCATION, POST_NOTIFICATIONS, FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PROCESSING, FOREGROUND_SERVICE_DATA_SYNC, INTERNET, ACCESS_NETWORK_STATE, `com.google.android.gms.permission.AD_ID` |
| Never | MANAGE_EXTERNAL_STORAGE, camera, microphone, contacts, location (fine/coarse) |
| iOS (v2) | 16+, Swift + AVFoundation + PhotoKit + ImageIO + BGTaskScheduler |

## 6. Build commands

```bash
flutter pub get
dart run pigeon --input pigeons/engine_api.dart       # after any bridge change
flutter analyze
flutter test
cd android && ./gradlew :app:testDebugUnitTest         # Kotlin JVM tests
cd android && ./gradlew :app:connectedDebugAndroidTest # on-device engine tests (phone connected)
flutter run -d <device-id>
flutter build apk --release --split-per-abi --target-platform android-arm64
flutter build appbundle --release                      # Play upload
dart run tool/check_size.dart
```

Release-only secrets come in through `--dart-define` (AdMob ids, RevenueCat public key) and Gradle properties from environment variables. Nothing secret is committed.

## 7. Accounts and services

| Service | Plan | Status |
| --- | --- | --- |
| Google Play Console | Existing Connected Interactive account (paid for Doodle Rage) | ✅ |
| Firebase project `compressly` | Spark (free) | Phase 0 |
| AdMob app | Free | Phase 3 |
| RevenueCat | Free up to $2.5k monthly tracked revenue | Phase 3 |
| Firebase Test Lab | Spark daily quota | Phase 1 |
| GitHub | Free private repo | Phase 0 |
| Domain + privacy page | GitHub Pages + domain (~₹1,000/yr) | Phase 3 |
| Apple Developer | $99/yr, **only at iOS go** | Feb 2027 |

## 8. Licences

All third-party code and test media are listed in `LICENSES.md` at repo root (name, licence, source, date). HEVC/HEIC encoding uses the phone's own hardware encoder (licensed by the device maker); we ship no codec implementation.
