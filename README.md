# Compressly

Frees 40–60% of the space photos and videos take on a phone, **at the same resolution**, and everything happens on the phone itself.

Compressly re-encodes media more efficiently (H.264 → HEVC for video; JPEG → optimised JPEG or HEIC for photos). It checks every output against the original with SSIM, and only removes an original after you approve it in the system's own delete dialog. No media, thumbnails or file names ever leave the device.

Android first; iOS comes after the go/no-go decision on Mon 22 Feb 2027. Launch target: Tue 9 Feb 2027. Published by Connected Interactive (`com.connectedinteractive.compressly`).

## What's in this folder

| Folder | What it is | Status |
| --- | --- | --- |
| `lib/`, `android/`, `ios/` | The phone app: Flutter UI with a Kotlin native engine | Screens built on fake services; native engine not started |
| [`web/`](web/README.md) | A browser version with the same screens. Compresses on the device that opens it (WebCodecs + WebAssembly), nothing is uploaded | Working; used to check compression by hand on real phones |
| [`web-tester/`](web-tester/README.md) | A local test bench on a computer (FFmpeg + sharp) to compare presets side by side | Working; never ships |
| [`docs/`](docs/README.md) | Product, design, architecture, plan, risks, budget | Up to date (22 Oct 2026) |

## How the phone app works

- **UI:** Flutter 3.47 / Dart 3.13. Screens: Home, Compress, Media, Review, History, Settings.
- **Engine:** Kotlin, reached through a generated Pigeon bridge. Media3 Transformer for hardware HEVC, HeifWriter and libjpeg-turbo for photos, Room as the one database for jobs and history.
- **Background:** WorkManager plus a foreground service, so a batch keeps going after you switch apps or lock the screen, with a progress notification.
- **Business:** free scan and 2 GB a month free; Pro ₹49/mo · ₹399/yr · ₹999 lifetime (RevenueCat); rewarded ads add 200 MB (AdMob + UMP consent). Firebase Analytics, Crashlytics and Remote Config. No backend.

The full stack, and why each piece was picked, is in [docs/TECH_STACK.md](docs/TECH_STACK.md). Layers and the job flow are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Web version vs phone app

The web version follows the same presets and quality gate, but a browser can't do everything an app can:

| | Web (`web/`) | Phone app |
| --- | --- | --- |
| Replace and delete originals | Only on a computer, for files added with **Open a folder** | Yes, through the system delete dialog |
| Keep working in the background | No. iPhone pauses the page within seconds; Android Chrome freezes it after a few minutes | Yes, with a foreground service (Android) |
| Files at the same time | One video and up to two photos (the phone has one hardware encoder, so more videos at once isn't faster) | One job at a time (SRS NFR-15) |

## Run it

**Phone app**

```bash
flutter pub get
flutter run -d windows --dart-define=FAKE_SERVICES=true   # UI on the computer, no phone needed
flutter run -d <device-id>                                # on a phone (`flutter devices` to list)
flutter analyze && flutter test                           # must be clean and green before a commit
```

On Windows, turn on **Developer Mode** first, or Flutter plugins won't install.

**Web version**

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

To use it on a phone, deploy it and open the **https** address (e.g. Vercel, root directory `compressly/web`). See [web/README.md](web/README.md).

## Docs

| Need | Read |
| --- | --- |
| What to build next | [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) |
| Screens, copy, presets, free-tier rules | [DESIGN.md](docs/DESIGN.md) |
| Requirements (FR / NFR ids) | [SRS.md](docs/SRS.md) |
| Dates, gates, KPIs | [PROJECT_PLAN.md](docs/PROJECT_PLAN.md) |
| Risks | [RISK_REGISTER.md](docs/RISK_REGISTER.md) |
| Costs and resources | [BUDGET_AND_RESOURCES.md](docs/BUDGET_AND_RESOURCES.md) |

## The one rule

**Never lose an original.** Originals are opened read-only, and only deleted through the system dialog after the compressed copy has been checked again. Any change that touches encoding, saving or deleting media must keep the guarantees in [ARCHITECTURE.md §7](docs/ARCHITECTURE.md).
