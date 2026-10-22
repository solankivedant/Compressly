# Compressly — Detailed Project Report

Oct 19, 2026 · @Vedant Solanki

## 1. Executive summary

Compressly is an on-device mobile app that frees 40–60% of a phone's media storage by re-encoding photos and videos into modern codecs (HEVC/HEIC) at the same resolution, with no cloud upload.

- **Problem:** phones record 4K video at very high bitrates in older codecs (H.264). One minute of 4K can reach about 1 GB, so even 256–512 GB phones fill up.
- **Solution:** automatic, background, full-resolution re-encoding with user-controlled quality, safe handling of originals and a clear "GB saved" result.
- **Platforms:** Android first (largest savings, largest Indian market), then iOS focused on ProRes, ProRAW, Live Photos and duplicates.
- **Business model:** freemium. A free scan shows potential savings; a free tier covers 2 GB of savings a month; Pro is ₹49/month, ₹399/year or ₹999 lifetime; rewarded ads unlock extra free compressions.
- **Differentiator:** 100% on-device and private, original resolution always kept, quality measured (SSIM) rather than guessed.
- **Plan:** MVP on Android in about 14 weeks with a 2–3 person team; iOS version about 3 months after Android launch.

## 2. Problem and market opportunity

Phone cameras have outgrown phone storage: 4K/60 fps video, 50–200 MP photos and RAW modes fill even 512 GB devices within a year or two of heavy use.

**Why it happens**

- Many Android camera apps default to H.264 at high bitrates. Observed example: about 1 GB per minute of 4K on a OnePlus 11R. HEVC gives similar quality at roughly half the size.
- 50 MP JPEGs at maximum quality run 15–40 MB each.
- iPhone Pro models add ProRes video (several GB per minute) and ProRAW photos (25–75 MB each).
- Users don't know these settings exist, and changing them doesn't shrink files already recorded.

**What users do today and why it falls short**

| Current option | Limitation |
| --- | --- |
| Delete photos and videos | Loses memories; users avoid it until forced |
| Buy cloud storage (Google One, iCloud) | Recurring cost, uploads private media, needs data and Wi-Fi |
| Google Photos "Storage saver" | Compresses only the cloud copy, not the phone's local files |
| Turn on HEVC in camera settings | Only affects new recordings; not available on every phone |
| Generic "video compressor" apps | Manual, one file at a time, often downscale 4K to 1080p, heavy ads |
| iOS "cleaner" apps | Find duplicates but don't re-encode media |

**Opportunity**

- India is a mobile-first, price-sensitive market where 128–256 GB phones are the norm and storage upgrades are expensive at purchase time.
- No mainstream app combines automatic background re-encoding, full resolution, measured quality and on-device privacy.
- Target users: anyone with more than 20 GB of camera media, especially heavy video shooters, parents, travellers and content creators.

Open question: market size should be validated with a survey of 100–200 users and Play Store keyword data before launch.

## 3. Product vision and goals

**Vision:** "Free up half your phone storage without losing a single pixel." Compressly makes storage problems disappear quietly in the background, with the user always in control of their originals.

**Product principles**

1. **Never lose resolution.** Width, height, frame rate, duration and orientation are preserved by default. Downscaling is a separate, clearly labelled opt-in.
2. **Never lose memories.** Originals are only removed after the compressed copy is verified and the user approves.
3. **On-device only.** No media leaves the phone.
4. **Show, don't claim.** Every result shows GB saved and a quality score.
5. **Respect the phone.** Heavy work runs when charging and cool, by default.

**Year-1 goals**

| Goal | Target (12 months after Android launch) |
| --- | --- |
| Installs | 100,000 |
| Free scans completed | 60% of installs |
| Free-to-paid conversion | 3–5% of active users |
| Storage freed (all users) | 500 TB cumulative |
| Play Store rating | 4.4 or higher |
| Originals lost due to app error | Zero |

These are planning targets, to be re-set after the first 8 weeks of live data.

## 4. Product requirements (PRD)

The MVP must deliver one thing well: scan the gallery, show potential savings, and compress videos and photos at full resolution with safe deletion of originals.

### 4.1 Personas

| Persona | Profile | Main pain | What they pay for |
| --- | --- | --- | --- |
| Riya, college student | 128 GB Android, records events and reels | "Storage full" warnings weekly | Cheap monthly plan or ads |
| Amit, young parent | 256 GB phone, years of 4K videos of his child | Won't delete memories, hates cloud bills | Yearly or lifetime plan |
| Sana, content creator | Shoots 4K/60 daily, edits on phone | Raw clips fill storage mid-shoot | Pro plan, speed, quality control |
| Karan, iPhone Pro owner | 256 GB iPhone, shoots ProRes and ProRAW | ProRes eats tens of GB per shoot | Premium iOS plan |

### 4.2 Key user stories

1. As a user, I want to see how much space I can save before paying, so I trust the app.
2. As a user, I want new videos compressed automatically while my phone charges.
3. As a user, I want my videos to stay 4K and look the same.
4. As a user, I want to approve deleting originals in one tap, in batches.
5. As a user, I want to exclude albums (for example, WhatsApp or a work folder).
6. As a user, I want to compress one big video right now when I need space.
7. As a user, I want to undo: keep originals for a set time before they are removed.
8. As an iPhone user, I want to convert ProRes and ProRAW files and strip Live Photo videos selectively.

### 4.3 Feature list

| Feature | Description | Release |
| --- | --- | --- |
| Storage scan | Analyses gallery, estimates savings per file and in total | MVP |
| Video re-encode | H.264 → HEVC in MP4, same resolution, frame rate and audio | MVP |
| Photo optimisation | Lossless JPEG optimisation; JPEG → HEIC "max savings" mode | MVP |
| Quality presets | High (near-identical), Balanced (default), Max savings | MVP |
| Compress now | Manual one-tap compression of selected files | MVP |
| Auto-compress new media | Detects new photos and videos, queues them for charging time | MVP |
| Safe originals | Keep, move to app trash for 7–30 days, or delete with system approval | MVP |
| Results dashboard | GB saved per file and in total, before/after sizes | MVP |
| Quality check | SSIM score on sampled frames; blocks results below threshold | MVP |
| Paywall and billing | Free tier, subscriptions, lifetime, rewarded ads | MVP |
| Album exclusions | Skip chosen folders and already-compressed sources | v1 |
| Before/after viewer | Side-by-side or slider comparison of a frame | v1 |
| Share as JPEG/H.264 | Converts HEIC/HEVC to compatible formats when sharing | v1 |
| Duplicate and similar finder | Groups duplicates, bursts and near-identical shots | v1 |
| Large-file finder | Lists the biggest videos and files first | v1 |
| iOS app | ProRes → HEVC, ProRAW → HEIC, Live Photo stripping, duplicates | v2 |
| Smart bitrate (content-aware) | Picks bitrate per video from motion and detail | v2 |
| Optional downscale | 4K → 1080p only when the user explicitly asks | v2 |
| Family plan | Up to 4 devices | v2 |

### 4.4 Out of scope (MVP)

- Cloud backup or sync of any kind.
- Compressing app data, documents or WhatsApp's internal database.
- AV1 encoding (hardware encoders are still rare on phones).

## 5. Pricing and monetization

Freemium with a free scan as the hook: users see "You can free up 38 GB" before any paywall, then choose a plan, ads or the free monthly allowance.

| Plan | Price (India) | What's included |
| --- | --- | --- |
| Free | ₹0 | Unlimited scans; up to 2 GB saved per month; Balanced preset; manual compression only |
| Free + ads | ₹0 | Each rewarded ad unlocks 3 extra files (or about 1 GB); max 5 ads/day |
| Pro monthly | ₹49/month | Unlimited compression, auto-compress, all presets, quality check, no ads |
| Pro yearly | ₹399/year (32% off monthly) | Same as monthly; default highlighted plan |
| Lifetime | ₹999 one-time | Same as Pro, forever, one device family |
| International (later) | $1.99/month, $14.99/year, $29.99 lifetime | Same as Pro |

**Why a GB-based free tier instead of "5 files a month":** a single 4K video can save more than 500 photos, so a file count misrepresents value. A 2 GB allowance lets users feel a real result, then hit the limit when they want more.

**Ads policy**

- Rewarded video ads only (user chooses to watch). No banners on processing or result screens, no interstitials.
- Ads never interrupt a running compression.

**Store fees and net revenue**

- Google Play charges a 15% service fee on subscriptions from day one ([9to5Google](https://9to5google.com/2021/10/21/google-play-subscription-fee/)).
- Apple's App Store Small Business Program charges 15% for developers earning up to $1 million a year ([Apple newsroom via Business Wire](https://www.businesswire.com/news/home/20201118005376/en/Apple-Announces-App-Store-Small-Business-Program)).
- Net per paying user, before GST: about ₹41.65/month, ₹339/year, ₹849 lifetime.
- GST on digital services and payment rules should be confirmed with a CA before launch.

**Pricing experiments after launch:** ₹49 vs ₹79 monthly; ₹399 vs ₹499 yearly; lifetime on vs off; free tier 1 GB vs 2 GB.

## 6. Software requirements (SRS)

Requirements are numbered so they can be traced to tests (section 13). "Shall" = mandatory for MVP.

### 6.1 Functional requirements

| ID | Requirement |
| --- | --- |
| FR-01 | The system shall request only the media permissions it needs (READ\_MEDIA\_VIDEO, READ\_MEDIA\_IMAGES, notifications) and explain each before asking. |
| FR-02 | The system shall scan the media library and list each eligible file with codec, resolution, bitrate, size and estimated saving. |
| FR-03 | The system shall skip files already in HEVC/HEIC at or below the target bitrate, and files under 5 MB. |
| FR-04 | The system shall re-encode video to HEVC in an MP4 container, preserving resolution, frame rate, duration, rotation and audio track. |
| FR-05 | The system shall fall back to H.264 at a lower bitrate if the device has no hardware HEVC encoder. |
| FR-06 | The system shall preserve metadata: capture date, GPS location (if present), camera model and orientation. |
| FR-07 | The system shall preserve HDR video as HDR on supported devices, or skip the file rather than tone-map it without user consent. |
| FR-08 | The system shall offer lossless JPEG optimisation and JPEG → HEIC conversion for photos. |
| FR-09 | The system shall compute an SSIM score on sampled frames and reject outputs below the preset's threshold. |
| FR-10 | The system shall reject outputs larger than 90% of the original size and keep the original. |
| FR-11 | The system shall detect new media and queue it when auto-compress is on. |
| FR-12 | The system shall run queued jobs only under the user's chosen conditions (default: charging and battery above 30%). |
| FR-13 | The system shall show progress, pause, resume and cancel for every job. |
| FR-14 | The system shall never delete an original until the compressed file is written, verified and the user approves via the system dialog. |
| FR-15 | The system shall offer an app-level holding period (7, 14 or 30 days) for originals before deletion. |
| FR-16 | The system shall record each job's before size, after size and quality score in a local history. |
| FR-17 | The system shall enforce the free-tier allowance and unlock Pro features after verified purchase. |
| FR-18 | The system shall restore purchases on reinstall or a new device. |
| FR-19 | The system shall let users exclude albums and folders. |

### 6.2 Non-functional requirements

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
| NFR-09 | App size | Install size under 30 MB (no bundled FFmpeg in MVP). |
| NFR-10 | Accessibility | Readable at large font sizes; screen-reader labels on all controls. |
| NFR-11 | Localisation | English and Hindi at launch; Gujarati, Tamil and Marathi in v1. |
| NFR-12 | Crash rate | Crash-free sessions above 99.5%. |

## 7. Compression engine

The engine changes the codec and bitrate, never the pixel count: video goes H.264 → HEVC in MP4, photos go JPEG → optimised JPEG or HEIC, and every output is checked against the original before it can replace it.

### 7.1 Video presets (HEVC, same resolution and frame rate)

Starting values, to be tuned with the test set in section 13.

| Source | High | Balanced (default) | Max savings |
| --- | --- | --- | --- |
| 4K 30 fps | 40 Mbps | 28 Mbps | 18 Mbps |
| 4K 60 fps | 60 Mbps | 42 Mbps | 28 Mbps |
| 1080p 30 fps | 12 Mbps | 8 Mbps | 5 Mbps |
| 1080p 60 fps | 18 Mbps | 12 Mbps | 8 Mbps |
| Minimum SSIM to accept | 0.97 | 0.95 | 0.92 |

Rules:

- Target bitrate = min(preset value, 60% of the source bitrate), so already-efficient files are not made worse for little gain.
- Audio is copied as-is when possible (no re-encode).
- Keyframe interval about 1–2 seconds; rate control VBR where the device supports it.

### 7.2 Photo modes

| Mode | Method | Typical saving | Quality change |
| --- | --- | --- | --- |
| Safe | Lossless JPEG optimisation (optimal Huffman tables, progressive) | 5–15% | None (pixel-identical) |
| Max savings | JPEG → HEIC at quality about 85–90 | 40–50% | Very small (lossy) |
| RAW/DNG (v1) | DNG → HEIC 10-bit | About 90% | RAW editing data lost; user must confirm |

### 7.3 Quality verification

1. Decode 10–20 frames spread across the video (more in high-motion sections).
2. Compute SSIM (and PSNR for logs) against the same frames of the source.
3. Accept if the mean SSIM ≥ the preset threshold and no single frame falls below threshold − 0.05.
4. Otherwise retry once at a 25% higher bitrate; if it still fails, keep the original and mark it "not worth compressing".

### 7.4 Metadata and special cases

- Copy capture date, GPS, orientation and camera model into the new file and into MediaStore/PhotoKit.
- HDR (HDR10, HLG, Dolby Vision): keep HDR where the encoder supports it; otherwise skip by default.
- Slow-motion and high-frame-rate files: keep the original frame rate.
- Files currently being edited or synced by another app are skipped.

### 7.5 Expected savings (planning estimates)

| Media | Typical saving |
| --- | --- |
| Android 4K H.264 at high bitrate | 50–80% |
| Android 1080p H.264 | 40–60% |
| iPhone HEVC (normal video) | 20–40% |
| iPhone ProRes | 90%+ |
| JPEG → HEIC | 40–50% |
| JPEG lossless optimisation | 5–15% |

## 8. Tech stack

Flutter for the shared UI, with native engines on each platform: compression must use the phone's hardware encoders, which only native APIs reach reliably.

| Layer | Android | iOS | Why |
| --- | --- | --- | --- |
| UI | Flutter (Dart), Material 3 | Flutter (Dart), Cupertino touches | One codebase for screens, paywall and settings |
| Native bridge | Pigeon (typed platform channels) | Pigeon | Type-safe calls between Dart and native |
| Video engine | Kotlin + Media3 Transformer (MediaCodec hardware HEVC) | Swift + AVFoundation (AVAssetReader/Writer, HEVC) | Hardware encoding, HDR support, no FFmpeg licence or size cost |
| Photo engine | AndroidX HeifWriter; libjpeg-turbo jpegtran via NDK | ImageIO (HEIC), CoreImage | HEIC output and lossless JPEG optimisation |
| Quality metric | C++ SSIM on downscaled YUV frames (NDK) | Swift + Accelerate (vImage) | Fast, on-device frame comparison |
| Media access | MediaStore, createDeleteRequest / createWriteRequest | PhotoKit (PHAsset, PHAssetChangeRequest) | Official, permission-respecting library access |
| Background work | WorkManager (content-URI trigger, charging constraint) + foreground service type mediaProcessing on Android 15+ | BGTaskScheduler (BGProcessingTask) | Platform-approved long-running work |
| Local database | Drift (SQLite) in Flutter; Room inside the native job runner | Drift (SQLite) | Job queue, history, savings totals |
| Billing | Google Play Billing via RevenueCat SDK | StoreKit 2 via RevenueCat SDK | One entitlement system across platforms |
| Ads | Google AdMob rewarded ads | Google AdMob rewarded ads | Rewarded format, India fill rates |
| Analytics and crashes | Firebase Analytics + Crashlytics (no media data) | Same | Funnels, retention, crash-free rate |
| Remote config | Firebase Remote Config | Same | Tune presets and pricing tests without releases |
| CI/CD | GitHub Actions + Fastlane | GitHub Actions + Fastlane (Xcode Cloud optional) | Automated builds and store uploads |
| Testing | JUnit, Espresso, Flutter integration tests, Firebase Test Lab device matrix | XCTest | Real-device codec coverage |

**No backend server is needed for MVP.** RevenueCat handles receipts; Firebase handles analytics and config. A small backend can be added later for referrals or a web dashboard.

**Alternative considered:** fully native apps (Kotlin + Swift) give the best performance and platform feel, but double the UI work. Choose this if the team has strong native developers and no Flutter experience.

Reference: Media3 Transformer relies on MediaCodec for encoding and writes MP4 by default ([Android Developers](https://developer.android.com/media/media3/transformer/supported-formats)).

## 9. System architecture

A thin Flutter UI talks through a typed bridge to a native engine that does all scanning, encoding and verification on the phone; the cloud only handles billing, anonymous analytics and ads.

&#91;embedded content: system architecture · 3 layers on the phone, 3 cloud services\]

**Data flow for one video**

1. The scheduler (or a "Compress now" tap) adds new files found by the library scanner to the job queue.
2. The encoder re-encodes the file with the phone's hardware HEVC encoder into app-private temp storage.
3. The quality gate compares sampled frames with the original (SSIM) and rejects poor or too-large outputs.
4. The library writer saves the accepted file to the gallery with the original date, location and orientation.
5. The UI shows the saving; the original is deleted only after the user approves the system dialog.

## 10. UX/UI design

The whole app is built around one number, "GB you can free up", shown on first launch and updated after every job.

### 10.1 Core flow

1. **Welcome:** a three-card intro: same resolution, on-device, you approve deletions.
2. **Permission:** explains why media access is needed, then the system prompt.
3. **Scan:** an animated progress ring while the library is analysed (usually under 30 seconds for metadata).
4. **Savings result:** the big number, split by videos and photos, with the top 5 largest files.
5. **Choose:** "Compress now", "Auto-compress while charging" or "Choose files".
6. **Paywall** (only when the free 2 GB is used): plans plus "Watch an ad for 3 more".
7. **Processing:** a queue with per-file progress, pause and cancel; continues in the background with a notification.
8. **Review:** before/after sizes, quality score, then "Remove originals" (system dialog) or "Keep for 30 days".
9. **Home dashboard:** total GB saved, queue status, auto-compress toggle.

### 10.2 Screens

| Screen | Key elements |
| --- | --- |
| Home | Large storage ring (used vs freeable), total saved, auto-compress switch, "Scan again" |
| Scan results | Tabs for Videos / Photos / Large files; each row shows thumbnail, size now → size after, saving % |
| File detail | Codec, resolution, bitrate, estimate; before/after frame slider (v1) |
| Queue | Active job with %, ETA, thermal/charging status; pause all |
| Review originals | Batch list, holding-period selector, "Remove originals" button |
| Paywall | Plans side by side, yearly highlighted; rewarded-ad button; restore purchases |
| Settings | Preset, conditions (charging, Wi-Fi not needed, battery %), excluded albums, holding period, language |

### 10.3 Design system

- **Style:** clean, calm and trustworthy, not a "phone booster" look. No fake urgency or red warnings.
- **Colour:** deep teal primary (savings), neutral greys, green only for confirmed savings, amber for warnings. Full dark mode.
- **Type:** one sans family (for example Inter or Noto Sans for Indic scripts), 3 sizes for body, label and display numbers.
- **Components:** storage ring, savings card, file row, progress row, plan card, bottom sheet for confirmations.
- **Motion:** subtle progress and a short "GB saved" count-up; respect reduce-motion settings.
- **Trust cues:** "Processed on your phone" badge on every result; the quality score shown in plain words ("Looks identical", "Very close").

### 10.4 Design deliverables

- Low-fidelity wireframes for the 9-step flow (week 2).
- High-fidelity Figma screens, light and dark (week 4).
- Clickable prototype for 5–8 user tests before development of the UI (week 5).

## 11. Implementation details

Each compression is a crash-safe job with five states (queued → encoding → verifying → ready → done); the original is untouched until the user approves deletion.

### 11.1 Android

**Detecting new media**

- WorkManager job with a content-URI trigger on `MediaStore.Video` and `MediaStore.Images`, constraint `requiresCharging` (user-configurable).
- On each trigger, query MediaStore for items added since the last scan timestamp; insert new rows into the job queue.

**Running a job**

1. Check free space ≥ 1.2× the source size and thermal status below moderate.
2. Start a foreground service with type `mediaProcessing` on Android 15+ (`dataSync` fallback on older versions) and a progress notification.
3. Build a Media3 `Transformer` with video MIME `video/hevc`, target bitrate from the preset, and audio passthrough.
4. Write to a temp file in app-private storage; on completion, run the SSIM check (section 7.3).
5. If accepted, insert the output into MediaStore with `IS_PENDING=1`, copy metadata (DATE\_TAKEN, location, orientation), then set `IS_PENDING=0`.
6. Mark the job "ready"; add the original to the review list.
7. When the user taps "Remove originals", call `MediaStore.createDeleteRequest()` for the batch; the system dialog confirms.

**Platform limits to handle**

- Android 15's `mediaProcessing` foreground service has a time limit of about 6 hours in every 24, shared across the app ([Android Developers](https://developer.android.com/develop/background-work/services/fg-service-timeout)). The queue must checkpoint and stop cleanly when `onTimeout()` is called, then continue the next day.
- Some OEMs (OnePlus, Xiaomi, Vivo, Oppo) kill background work aggressively. Show a one-time guide to set battery usage to "Unrestricted", with device-specific steps.
- Devices without a hardware HEVC encoder fall back to H.264 at a lower bitrate (FR-05).

### 11.2 iOS (v2)

- **Library access:** PhotoKit with full or limited access; fetch PHAssets by media subtype (ProRes video, ProRAW, Live Photos, slo-mo).
- **Video:** `AVAssetReader` + `AVAssetWriter` with HEVC output settings and target bitrate; HDR/Dolby Vision metadata preserved where supported.
- **Photos:** ImageIO `CGImageDestination` writing HEIC; for Live Photos, save the still only (user opt-in).
- **Saving:** `PHAssetChangeRequest` creates the new asset with the original creation date and location; deletion uses `PHAssetChangeRequest.deleteAssets`, which always shows Apple's confirmation.
- **Background:** `BGProcessingTask` with `requiresExternalPower = true`; iOS decides when it runs, so the app also supports foreground "Compress now".
- **Recently Deleted:** space is only freed after it is emptied; show a clear post-delete prompt explaining this.
- **iCloud Photos:** download originals on demand with progress; skip if offline.

### 11.3 Flutter ↔ native contract (Pigeon)

| Call | Direction | Purpose |
| --- | --- | --- |
| `scanLibrary(since)` | Dart → native | Returns file list with codec, bitrate, size, estimate |
| `enqueue(ids, preset)` | Dart → native | Adds jobs to the native queue |
| `pause()` / `resume()` / `cancel(id)` | Dart → native | Queue control |
| `onJobProgress(id, pct, state)` | Native → Dart | Live progress stream |
| `onJobResult(id, before, after, ssim)` | Native → Dart | Final result for history |
| `requestDeleteOriginals(ids)` | Dart → native | Triggers the system delete dialog |

### 11.4 Data model (local SQLite)

| Table | Key columns |
| --- | --- |
| media\_item | id, uri, type, codec, width, height, fps, bitrate, size, date\_taken, excluded |
| job | id, media\_id, preset, state, attempts, temp\_path, output\_uri, created\_at, updated\_at |
| result | job\_id, size\_before, size\_after, ssim\_mean, ssim\_min, duration\_ms |
| settings | key, value |
| entitlement\_cache | plan, expires\_at, free\_bytes\_used\_this\_month |

## 12. Privacy, security and compliance

Compressly processes all media on the device and sends no media, thumbnails or file names anywhere; this is both a legal safeguard and the main marketing message.

- **Data collected:** anonymous usage events (screens viewed, job counts, bytes saved, crash logs), device model and OS version. No media content, no file names, no location.
- **India DPDP Act 2023:** publish a clear privacy notice, take consent for analytics, allow opt-out, and appoint a contact for grievances. Confirm current rules with a lawyer before launch.
- **Google Play:** complete the Data safety form accurately; justify media permissions in the review form; follow the foreground-service type declaration rules; comply with Families policy only if targeting children (not planned).
- **Apple App Store:** privacy nutrition label; explain photo library access in the permission string; use StoreKit for all digital purchases.
- **Ads:** AdMob with consent handling (UMP SDK) for regions that need it; no personalised ads without consent.
- **Security:** temp files stored in app-private storage and deleted after each job; no exported components; code obfuscation (R8) and certificate pinning are not needed since there is no custom backend.
- **Permissions minimised:** no camera, microphone, contacts or location permissions; no MANAGE\_EXTERNAL\_STORAGE (Play rarely approves it, and MediaStore is enough).

## 13. Testing and QA

The release gate is simple: zero lost originals and SSIM targets met on a 40-device matrix.

| Test type | What it covers | Tools |
| --- | --- | --- |
| Unit tests | Preset maths, bitrate rules, queue state machine, free-tier counter | JUnit, Dart test |
| Golden media set | 200 test files: 4K/1080p, 30/60 fps, HDR, slo-mo, portrait/landscape, short and 30-minute clips, JPEG/HEIC/DNG | Internal library |
| Quality regression | SSIM/PSNR per preset on the golden set after every engine change | Native SSIM tool in CI |
| Device matrix | 40 devices covering Snapdragon, MediaTek, Exynos, Tensor; OnePlus, Samsung, Xiaomi, Vivo, Realme, Pixel | Firebase Test Lab + 10 physical phones |
| Safety tests | Kill app mid-job, reboot, storage full, low battery, revoke permission; verify originals intact | Scripted adb tests |
| Metadata tests | Date, GPS and orientation identical after compression; gallery sorting unchanged | Automated comparison |
| Billing tests | Purchase, renewal, cancel, refund, restore, ad reward | Play and App Store sandboxes |
| Beta | 200–500 users on Play closed testing for 3–4 weeks | Play Console, feedback form |

Traceability: each FR and NFR in section 6 maps to at least one automated or scripted test.

## 14. Project plan and timeline

The Android MVP ships in about 14 weeks, with the riskiest part, the hardware encoding engine, proven in the first month before the full build starts.

&#91;embedded content: planning dates · kickoff assumed 2 Nov 2026\]

**Gates between phases**

1. **Engine gate (early Dec):** 4K H.264 → HEVC works on 5 test phones with SSIM ≥ 0.95 and correct metadata. If not, re-plan before building UI.
2. **Design gate (early Dec):** 5–8 prototype users understand the savings screen and trust the delete flow.
3. **Beta gate (mid-Jan):** zero lost originals in safety tests; crash-free sessions above 99%.
4. **Launch gate (early Feb):** beta users report no visible quality problems; billing and restore verified.
5. **iOS go/no-go (late Feb):** Android conversion and retention are at or near the section 17 targets.

## 15. Team, budget and financial projections

The Android MVP costs roughly ₹12 lakh with a small hired team, or about ₹3–4 lakh if the founder builds most of it; all figures below are planning estimates for Ahmedabad rates, to be replaced with real quotes.

### 15.1 Team

| Role | Commitment | Responsibilities |
| --- | --- | --- |
| Founder / product owner | Full time | PRD, design reviews, testing, marketing, store listings |
| Flutter + Android developer | Full time, 4 months | UI, billing, ads, analytics, Pigeon bridge |
| Native media engineer | Contract, 3 months | Media3/MediaCodec engine, SSIM, HEIC, device fixes |
| UI/UX designer | Part time, 2 months | Wireframes, Figma, prototype, store graphics |
| QA tester | Part time, 6 weeks | Device matrix, safety and billing tests |
| iOS developer (v2) | Contract, 3 months | AVFoundation engine, PhotoKit, StoreKit |

### 15.2 MVP budget (Android)

| Item | Estimate (₹) |
| --- | --- |
| Flutter + Android developer (4 × ₹70,000) | 2,80,000 |
| Native media engineer (3 × ₹1,20,000) | 3,60,000 |
| UI/UX designer (2 × ₹35,000) | 70,000 |
| QA tester (1.5 × ₹40,000) | 60,000 |
| Test devices (6 used phones) | 90,000 |
| Accounts and tools (Play $25 one-time, Apple $99/year, Figma) | 20,000 |
| Legal and accounting (privacy policy, GST setup) | 30,000 |
| Launch marketing | 1,50,000 |
| Contingency (15%) | 1,59,000 |
| **Total** | **12,19,000** |

### 15.3 Year-1 revenue scenarios

Assumes 100,000 installs, blended net revenue of about ₹300 per paying user per year after the 15% store fee, and rewarded-ad income kept separate because India ad rates vary widely.

| Scenario | Paying users | Subscription revenue (net, ₹) |
| --- | --- | --- |
| Conservative (2% of 40,000 active) | 800 | 2,40,000 |
| Base (4% of 40,000 active) | 1,600 | 4,80,000 |
| Optimistic (5% of 80,000 active) | 4,000 | 12,00,000 |

India-only pricing makes year-1 break-even hard with a hired team. Paths to improve it: launch internationally at USD pricing in month 3–4, lean on lifetime purchases for upfront cash, and keep the founder-built option for the MVP.

## 16. Risk register

The biggest risk is a single lost original: one viral review about deleted wedding videos can end the product, so every safety requirement in section 6 is non-negotiable.

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Original deleted or corrupted by a bug | Low | Critical | Never delete before verify + user approval; holding period; crash-safe jobs; safety test suite |
| R2 | Visible quality loss angers users | Medium | High | SSIM gate, conservative Balanced preset, before/after preview, easy restore during holding period |
| R3 | OEM battery killers stop background jobs (OnePlus, Xiaomi, Vivo) | High | Medium | Device-specific setup guide, WorkManager retries, "Compress now" fallback |
| R4 | Hardware encoder bugs on some chipsets (wrong colours, crashes) | Medium | High | Device allow/deny list via Remote Config, H.264 fallback, broad device testing |
| R5 | Android 15+ foreground-service time limit interrupts long queues | High | Low | Checkpoint per file; resume next window; process smallest-gain files last |
| R6 | Phone overheats or drains battery | Medium | Medium | Charging-only default, thermal pause, one job at a time |
| R7 | Play Store rejects media permission or FGS declaration | Medium | High | Minimal permissions, clear in-app justification, demo video for review |
| R8 | HEIC/HEVC files fail to open in other apps or when shared | Medium | Medium | MP4 container for video; share-as-JPEG/H.264 conversion; HEIC opt-in for photos |
| R9 | Low willingness to pay in India | High | High | Generous free tier, lifetime option, rewarded ads, international launch |
| R10 | Competitors or OEMs add the same feature (HEVC default, Google Photos local compression) | Medium | High | Speed to market, quality and safety brand, iOS ProRes niche, duplicates finder |
| R11 | Metadata lost, gallery order breaks | Medium | High | Metadata copy + automated comparison tests |
| R12 | Low storage leaves no room for temp files | Medium | Low | Free-space check; process smallest files first to create room |
| R13 | Legal or tax mistakes (DPDP, GST) | Low | Medium | Lawyer and CA review before launch |

## 17. Go-to-market and KPIs

Launch on the Play Store in India with search-driven acquisition ("storage full", "video compressor") and short-form before/after demos, then expand to USD markets.

### 17.1 Channels

- **App Store Optimisation:** title "Compressly: Free Up Storage"; keywords storage full, video compressor 4K, photo compressor, HEVC converter; screenshots led by "38 GB freed, same 4K".
- **Short video:** Instagram Reels and YouTube Shorts showing the before/after storage screen and side-by-side frames.
- **Tech YouTubers (India):** 5–10 mid-size reviewers focused on OnePlus, Samsung and Xiaomi phones; give lifetime codes.
- **Communities:** Reddit (r/oneplus, r/android, r/IndianGaming), Telegram phone groups, college groups.
- **In-app sharing:** "I freed 42 GB" share card with a referral link (1 free month for both users).
- **Seasonal pushes:** festival season and wedding season, when phones fill with video.

### 17.2 KPIs

| Stage | KPI | Target |
| --- | --- | --- |
| Acquisition | Store listing conversion (view → install) | 30% or higher |
| Activation | Install → completed scan | 60% |
| Activation | Scan → first compression | 40% |
| Revenue | Free → paid (active users, 30 days) | 3–5% |
| Revenue | Yearly share of new subscriptions | 50% or more |
| Retention | Day-30 retention | 20% |
| Value | Median GB freed per active user | 10 GB or more |
| Quality | Crash-free sessions | 99.5% |
| Safety | Originals lost due to app error | 0 |
| Satisfaction | Store rating | 4.4 or higher |

## 18. Future roadmap and appendix

After Android and iOS, growth comes from smarter compression and a full storage-health toolkit, not from more codecs.

**Roadmap after v2**

- Content-aware bitrate (scene complexity and motion) for higher savings at the same quality.
- AV1 output once hardware AV1 encoders are common on phones.
- JPEG XL for archive-grade lossless photo repacking when gallery support is wide enough.
- WhatsApp and Telegram media cleaner (duplicates, forwarded videos, old status downloads).
- Desktop companion (Windows/macOS) for compressing phone backups.
- Family plan and B2B offers (schools, field-work teams that record video).

**Appendix A: glossary**

| Term | Meaning |
| --- | --- |
| Codec | Method that compresses and decompresses media (H.264, HEVC, JPEG) |
| Container | File format holding the streams and metadata (MP4, MOV, HEIF) |
| HEVC / H.265 | Video codec about 50% more efficient than H.264 |
| HEIC | HEIF container holding HEVC-compressed images |
| Bitrate | Bits used per second of video; mainly sets file size |
| SSIM | Structural similarity index, 0–1; above 0.95 is visually very close |
| Re-mux | Moving streams to a new container without re-encoding |
| Generation loss | Extra quality loss when re-encoding already-lossy media |

**Appendix B: sources**

- [Android Developers: foreground service timeouts](https://developer.android.com/develop/background-work/services/fg-service-timeout)
- [Android Developers: Media3 Transformer supported formats](https://developer.android.com/media/media3/transformer/supported-formats)
- [Android Developers: Android 15 foreground service type changes](https://developer.android.com/about/versions/15/changes/foreground-service-types)
- [9to5Google: Play subscription fee cut to 15%](https://9to5google.com/2021/10/21/google-play-subscription-fee/)
- [Business Wire: Apple App Store Small Business Program](https://www.businesswire.com/news/home/20201118005376/en/Apple-Announces-App-Store-Small-Business-Program)
