---
paths:
  - "android/app/src/main/AndroidManifest.xml"
  - "android/app/src/main/res/xml/**"
  - "lib/core/services/analytics/**"
  - "lib/core/util/logger.dart"
  - "android/app/src/main/kotlin/**/util/Log*.kt"
  - "lib/ui/screens/permission*"
  - "lib/ui/screens/settings*"
---

# Privacy & permissions rules

## Permissions (TECH_STACK §5)
- Allowed: READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_MEDIA_VISUAL_USER_SELECTED, READ_EXTERNAL_STORAGE (`maxSdkVersion="32"`), ACCESS_MEDIA_LOCATION, POST_NOTIFICATIONS, FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PROCESSING, FOREGROUND_SERVICE_DATA_SYNC, INTERNET, ACCESS_NETWORK_STATE, AD_ID.
- **Never:** MANAGE_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE (beyond legacy maxSdk), camera, microphone, contacts, fine/coarse location, QUERY_ALL_PACKAGES.
- Explain every permission on our own screen before the system prompt (FR-01). Handle denial and partial access (FR-21) without loops or nagging.
- Adding a permission: update TECH_STACK §5 and the Data safety notes, then run the `policy-checker` agent.

## Components
- Only the launcher `MainActivity` is exported. Services, receivers and providers are `exported="false"`.
- Backup via `dataExtractionRules`: `shared_prefs` only; exclude databases and cache (ARCHITECTURE §13).

## Data that may leave the device
- Only: anonymous analytics events with **bucketed** values (ARCHITECTURE §11), crash stack traces, device model/OS, RevenueCat purchase data, ad SDK data under UMP consent.
- Never: media bytes, thumbnails, file names, paths, URIs, MediaStore ids, album names, dates taken, GPS, camera model.
- Analytics and Crashlytics collection are off until consent (FR-33) and switch off immediately on opt-out.

## Logging
- All logs go through the redacting helpers (`logger.dart`, `util/Log.kt`). They print media as `item#<id>` only, and only in debug builds.
