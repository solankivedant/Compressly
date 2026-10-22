---
paths:
  - "android/app/src/main/kotlin/**"
  - "android/app/src/main/cpp/**"
  - "android/app/src/test/**"
  - "android/app/src/androidTest/**"
  - "android/app/build.gradle.kts"
---

# Native engine (Kotlin / NDK) rules

## Structure
- Packages under `com.connectedinteractive.compressly`: `bridge`, `scan`, `encode`, `quality`, `library`, `queue`, `schedule`, `entitlement`, `data`, `util` (ARCHITECTURE §3). New packages need a doc update first.
- `bridge/` only translates DTOs and delegates. No business logic there.
- Rules that don't need Android (eligibility, preset maths, state transitions, recovery decisions, allowance, SSIM maths) are **pure Kotlin classes** with JVM unit tests. Android-touching code (MediaStore, MediaCodec, WorkManager) is a thin adapter around them.

## Kotlin style
- Coroutines with an engine-owned `CoroutineScope` (SupervisorJob + `Dispatchers.Default`/`IO`). No `GlobalScope`, no `runBlocking` outside tests.
- No `!!` in engine code. Sealed classes for results (`EncodeResult`, `GateResult`, `DeleteOutcome`).
- Inject `Clock` and dependencies through constructors; no singletons except `EngineDatabase` and the WorkManager-provided context.
- Logging via `util/Log` only, which strips URIs to ids and never logs display names, paths, dates taken or locations.
- Always `close()`/`release()` MediaCodec, MediaExtractor, MediaMetadataRetriever, Transformer, file descriptors and Bitmaps (`use {}`).

## Media3 / encoding
- Video MIME `MimeTypes.VIDEO_H265`; fallback `VIDEO_H264` per FR-05 and the Remote Config deny list.
- Bitrates come from `PresetResolver` only. No literal bitrates outside it and its tests.
- Never add a scaling, frame-rate or crop effect. Keep HDR or skip (FR-07); never silently tone-map.
- Copy audio (passthrough). Keep rotation as metadata; don't rotate pixels.

## Background
- FGS type `mediaProcessing` on API 35+, `dataSync` on API 29–34, declared in the manifest with matching permissions.
- Implement `onTimeout()`: stop the current file safely, persist, reschedule (FR-38).
- Respect `RunConditions` (charging, battery, thermal, free space) at job start and while running.

## NDK
- libjpeg-turbo built from source with CMake; JNI surface is one small file. Check every JNI return; never throw across JNI without converting to a Kotlin exception.

## Database
- Room with exported schemas. Every schema change = new version + `Migration` + migration test. Never `fallbackToDestructiveMigration`.

## Tests
- JVM: `./gradlew :app:testDebugUnitTest`. On-device: `connectedDebugAndroidTest`. Name tests with FR ids: `fun FR_10_rejects_output_over_90_percent()`.
