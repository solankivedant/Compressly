# Compressly: System Requirements Specification (SRS)

Last updated: 22 Oct 2026 · Owner: Vedant Solanki · Source: DPR §6, §7, §11, §12
"Shall" = mandatory for the release marked. P0 = MVP v1.0 · P1 = v1.x · P2 = v2 (iOS).

IDs FR-01 … FR-19 and NFR-01 … NFR-12 are kept exactly as in the DPR so they trace back to it. New requirements continue the numbering. Put the id in test names and commit messages.

---

## 1. Introduction

### 1.1 Purpose
Defines what the Compressly Android MVP must do, in testable terms, so every requirement maps to at least one automated or scripted test (§6).

### 1.2 Definitions

| Term | Meaning |
| --- | --- |
| Original | The user's existing photo or video file in the gallery (MediaStore item) |
| Output | The compressed file Compressly produces |
| Job | One original → one output, tracked through the state machine (ARCHITECTURE §6) |
| Preset | High, Balanced or Max savings: target bitrate + SSIM threshold (DESIGN §5) |
| SSIM | Structural similarity, 0–1; ≥ 0.95 is visually very close |
| Allowance | Free tier bytes saved per calendar month (default 2 GB) plus ad bonus |
| Freed | Bytes actually released: original deleted after the output was saved |
| Pending | Bytes that will be freed once the user approves deleting originals |
| Golden set | 200 reference media files used for quality and metadata regression |
| FGS | Android foreground service |

### 1.3 References
DPR (`Compressly — Detailed Project Report.md`), PRD.md, DESIGN.md, ARCHITECTURE.md, TECH_STACK.md.

## 2. Overall description

### 2.1 Product perspective
Standalone, offline-capable Android app. A Flutter UI talks through a typed Pigeon bridge to a native Kotlin engine. No server of our own; RevenueCat, Firebase and AdMob are the only network services, and none receives media data.

### 2.2 User classes
Free users (manual, 2 GB/month), ad-unlocked free users, Pro users (unlimited, auto-compress). All are anonymous; there is no login.

### 2.3 Operating environment

| Item | Value |
| --- | --- |
| Android | 10+ (API 29+); `targetSdk` = what Play currently requires |
| Reference phones | Vedant's own phone + 2 used test phones (one MediaTek budget, one Snapdragon from an aggressive-OEM brand), plus Firebase Test Lab |
| CPU ABIs | arm64-v8a, armeabi-v7a |
| iOS (P2) | 16+ |

### 2.4 Constraints
- No `MANAGE_EXTERNAL_STORAGE`. MediaStore only.
- No bundled FFmpeg in MVP (size and licence).
- Hardware encoders only for video; no software HEVC encoder.
- No media, thumbnails or file names in any network call or log.

### 2.5 Assumptions and dependencies
See PRD §9.

## 3. Functional requirements

### 3.1 Permissions and onboarding

| ID | Pri | Requirement |
| --- | --- | --- |
| FR-01 | P0 | The system shall request only the media permissions it needs (READ_MEDIA_VIDEO, READ_MEDIA_IMAGES on API 33+; READ_EXTERNAL_STORAGE on API 29–32; POST_NOTIFICATIONS on API 33+) and explain each before asking. |
| FR-20 | P0 | The system shall request ACCESS_MEDIA_LOCATION so GPS metadata can be read and copied (FR-06). If denied, it shall warn that location may be lost and require an explicit opt-in before compressing photos or videos. |
| FR-21 | P0 | On Android 14+ partial access (READ_MEDIA_VISUAL_USER_SELECTED), the system shall work on the selected items only and offer a clear "Allow all" path. It shall never nag more than once per session. |

### 3.2 Scan and eligibility

| ID | Pri | Requirement |
| --- | --- | --- |
| FR-02 | P0 | The system shall scan the media library and list each eligible file with codec, resolution, bitrate, size and estimated saving. |
| FR-03 | P0 | The system shall skip files already in HEVC/HEIC at or below the target bitrate, and files under 5 MB. |
| FR-36 | P0 | The system shall skip items that are pending (`IS_PENDING=1`), trashed, modified within the last 60 s, owned by an excluded album (FR-19), or previously produced by Compressly. |
| FR-19 | P0 | The system shall let users exclude albums and folders. |

### 3.3 Encoding

| ID | Pri | Requirement |
| --- | --- | --- |
| FR-04 | P0 | The system shall re-encode video to HEVC in an MP4 container, preserving resolution, frame rate, duration, rotation and audio track. |
| FR-05 | P0 | The system shall fall back to H.264 at a lower bitrate if the device has no hardware HEVC encoder, or if the device is on the Remote Config deny list for HEVC (FR-35). |
| FR-06 | P0 | The system shall preserve metadata: capture date, GPS location (if present), camera model and orientation. |
| FR-07 | P0 | The system shall preserve HDR video as HDR on supported devices, or skip the file rather than tone-map it without user consent. |
| FR-08 | P0 | The system shall offer lossless JPEG optimisation and JPEG → HEIC conversion for photos. |
| FR-24 | P0 | The system shall offer High, Balanced and Max savings presets with the values in DESIGN §5. Free users get Balanced only. |
| FR-35 | P0 | The system shall read a device and chipset allow/deny list from Remote Config and apply it before choosing an encoder. |

### 3.4 Quality gate

| ID | Pri | Requirement |
| --- | --- | --- |
| FR-09 | P0 | The system shall compute an SSIM score on sampled frames and reject outputs below the preset's threshold (mean ≥ threshold and no frame below threshold − 0.05). On failure it shall retry once at 25% higher bitrate, then keep the original and mark it "not worth compressing". |
| FR-10 | P0 | The system shall reject outputs larger than 90% of the original size and keep the original. |
| FR-37 | P0 | The system shall verify width, height, frame rate (±1%), duration (±0.5 s or ±1%), rotation and audio track presence before accepting an output. |

### 3.5 Queue, scheduling and background

| ID | Pri | Requirement |
| --- | --- | --- |
| FR-11 | P0 | The system shall detect new media and queue it when auto-compress is on (Pro). |
| FR-12 | P0 | The system shall run queued jobs only under the user's chosen conditions (default: charging and battery above 30%). |
| FR-13 | P0 | The system shall show progress, pause, resume and cancel for every job. |
| FR-23 | P0 | The system shall let the user select files (including a one-tap "top 5 biggest") and compress them now, in the foreground, regardless of charging. |
| FR-30 | P0 | On OnePlus, Xiaomi/Redmi/POCO, Vivo/iQOO, Oppo and Realme, the system shall show a one-time guide to set battery usage to "Unrestricted" when the user turns on auto-compress. |
| FR-31 | P0 | The system shall show a progress notification while a job runs, a summary notification when a batch finishes, and a reminder when a holding period ends. Max 1 non-progress notification per day. |
| FR-38 | P0 | The system shall checkpoint after every file and stop cleanly when the FGS `onTimeout()` is called, then continue in the next allowed window. |

### 3.6 Originals and saving

| ID | Pri | Requirement |
| --- | --- | --- |
| FR-14 | P0 | The system shall never delete an original until the compressed file is written, verified and the user approves via the system dialog. |
| FR-15 | P0 | The system shall offer an app-level holding period (7, 14 or 30 days) for originals before deletion. |
| FR-27 | P0 | During the holding period both files stay in the gallery. The user can "Keep original instead", which deletes the output (via system dialog where required) and leaves the original untouched. |
| FR-39 | P0 | The system shall save outputs in the same album/folder as the original, with capture date preserved so gallery order does not change. |

### 3.7 Results and history

| ID | Pri | Requirement |
| --- | --- | --- |
| FR-16 | P0 | The system shall record each job's before size, after size and quality score in a local history. |
| FR-22 | P0 | The system shall show a results dashboard with GB saved per file and in total, and before/after sizes. |
| FR-28 | P0 | The system shall count bytes as "freed" only when the original has been deleted, and show not-yet-deleted savings as "pending". |
| FR-29 | P0 | The system shall show quality in plain words (DESIGN §5.3) alongside the numeric score in file detail. |

### 3.8 Monetisation

| ID | Pri | Requirement |
| --- | --- | --- |
| FR-17 | P0 | The system shall enforce the free-tier allowance and unlock Pro features after verified purchase. |
| FR-18 | P0 | The system shall restore purchases on reinstall or a new device. |
| FR-25 | P0 | A completed rewarded ad shall add 1 GB to this month's allowance; max 5 per day (both Remote Config). The bonus is granted only on the SDK reward callback. |
| FR-26 | P0 | The scan and savings estimate shall be free and shown before any paywall. The paywall appears only when the allowance is used up or a Pro feature is tapped. |
| FR-40 | P0 | The paywall shall show the store price, billing period, auto-renewal and how to cancel, and a working "Restore purchases". |

### 3.9 Settings, consent and language

| ID | Pri | Requirement |
| --- | --- | --- |
| FR-32 | P0 | The system shall provide English and Hindi, following the device language with an in-app override. |
| FR-33 | P0 | The system shall ask for analytics consent on first run, honour opt-out immediately, and offer it again in Settings. Crash reporting follows the same switch. |
| FR-34 | P0 | The system shall complete the UMP consent flow before any ad request and request non-personalised ads without consent. |
| FR-41 | P0 | Settings shall include: preset, run conditions, excluded albums, holding period, language, analytics consent, ad consent, restore purchases, privacy policy, licences, battery guide. |

### 3.10 v1.x and v2 (summary; detailed when scheduled)

| ID | Pri | Requirement |
| --- | --- | --- |
| FR-50 | P1 | Before/after frame comparison slider in file detail. |
| FR-51 | P1 | Share as JPEG/H.264: convert HEIC/HEVC to compatible formats when sharing from the app. |
| FR-52 | P1 | Duplicate and similar finder (exact hash + perceptual hash, bursts). |
| FR-53 | P1 | Large-file finder. |
| FR-54 | P1 | RAW/DNG → HEIC 10-bit with an explicit "RAW editing data will be lost" confirmation. |
| FR-60 | P2 | iOS: ProRes → HEVC, ProRAW → HEIC, Live Photo still-only, PhotoKit save and delete, BGProcessingTask. |
| FR-61 | P2 | Content-aware bitrate. FR-62 P2: optional downscale, clearly labelled. |

## 4. Non-functional requirements

### 4.1 From the DPR

| ID | Category | Requirement |
| --- | --- | --- |
| NFR-01 | Privacy | No media, thumbnails or file names leave the device. |
| NFR-02 | Reliability | Zero original files lost; crash-safe jobs that resume after app kill or reboot. |
| NFR-03 | Quality | Balanced preset: mean SSIM ≥ 0.95 on sampled frames; resolution identical to source. |
| NFR-04 | Performance | 1 minute of 4K30 video processed in about 1–2 minutes on a mid-range 2023+ phone with hardware encoding. |
| NFR-05 | Thermal | Pause jobs when the device reports moderate thermal status or higher; resume when cool. |
| NFR-06 | Battery | Background jobs use no more than 5% battery per night unless charging. |
| NFR-07 | Storage safety | Require free space of at least 1.2× the largest file in the queue before starting. |
| NFR-08 | Compatibility | Android 10+ (API 29+) at launch; iOS 16+ for the iOS version. |
| NFR-09 | App size | Install size under 30 MB (no bundled FFmpeg in MVP). Arm64 download ≤ 25 MB. |
| NFR-10 | Accessibility | Readable at large font sizes; screen-reader labels on all controls. |
| NFR-11 | Localisation | English and Hindi at launch; Gujarati, Tamil and Marathi in v1. |
| NFR-12 | Crash rate | Crash-free sessions above 99.5%. |

### 4.2 Added

| ID | Category | Requirement |
| --- | --- | --- |
| NFR-13 | Startup | Cold start to Home ≤ 2 s on the reference mid-range phone. |
| NFR-14 | Scan speed | Metadata scan of 10,000 items ≤ 30 s; UI stays responsive (no jank > 100 ms). |
| NFR-15 | Concurrency | One encoding job at a time. |
| NFR-16 | Temp files | Temp files live in app-private storage only and are deleted after each job and on startup recovery. |
| NFR-17 | Maintainability | `flutter analyze` and Kotlin lint clean; Dart domain logic and Kotlin engine logic ≥ 70% unit-test line coverage. |
| NFR-18 | Security | No exported components except the launcher activity; no secrets in git; release builds minified with R8. |
| NFR-19 | Accessibility | Touch targets ≥ 48 dp; contrast ≥ 4.5:1; motion respects reduce-motion. |

## 5. External interfaces

| Interface | Use | Notes |
| --- | --- | --- |
| MediaStore | Query, insert (`IS_PENDING`), delete/write requests | API 30+: `createDeleteRequest` / `createWriteRequest` batches. API 29: per-item `RecoverableSecurityException` flow |
| MediaCodec / Media3 Transformer | Hardware video encode | HEVC `video/hevc`, fallback `video/avc` |
| HeifWriter, libjpeg-turbo (JNI) | Photo output | HEIC requires an HEVC encoder |
| WorkManager | Content-URI trigger, charging constraint | Pro auto-compress |
| Foreground service | `mediaProcessing` (API 35+), `dataSync` (API 29–34) | Time-limited on Android 15+ |
| PowerManager | Thermal status listener | NFR-05 |
| RevenueCat → Play Billing | Purchases, entitlements, restore | Entitlement id `pro` |
| AdMob + UMP | Rewarded ads, consent | Test ids in git only |
| Firebase | Analytics, Crashlytics, Remote Config | No media data |

## 6. Acceptance and traceability

Every P0 row above maps to at least one test:

| Test kind | Covers |
| --- | --- |
| Dart unit tests (`test/`) | FR-17, FR-24, FR-25, FR-26, FR-28, formatting, allowance maths, paywall rules |
| Kotlin JVM tests (`android/app/src/test/`) | FR-03, FR-36 eligibility; preset/bitrate rules; job state machine; checkpoint and recovery (FR-38, NFR-02) |
| On-device engine tests (`androidTest/`) | FR-04 to FR-10, FR-37, FR-39 on the golden set |
| Scripted safety tests (`tool/safety/`) | FR-14, NFR-02, NFR-07, FR-38: kill, reboot, storage full, low battery, permission revoked |
| Manual device checklist | FR-01, FR-20, FR-21, FR-30, FR-31, NFR-04, NFR-05, NFR-06 |
| Billing sandbox checklist | FR-17, FR-18, FR-25, FR-40 |

The traceability table lives in IMPLEMENTATION_PLAN.md (the "Ref" column) and is checked at the Beta and Launch gates.
