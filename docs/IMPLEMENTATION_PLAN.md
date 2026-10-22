# Compressly: Phase-wise Implementation Plan

Last updated: 22 Oct 2026 · Owner: Vedant Solanki (founder, designer, tester) · Builder: Claude Code
Stack: Flutter 3.47 UI + Kotlin native engine (TECH_STACK.md). Dates and gates: PROJECT_PLAN.md.

**Status marks:** ✅ done · 🔶 built, waiting for the phone check · ⬜ not started.

**How to use this plan:** each phase is a list of **sessions**. One session builds one feature (CLAUDE.md rule). Tick it when it's built, checked on the phone and committed. Requirement IDs point to SRS.md.

```
Phase 0  Foundation              2–6 Nov      █
Phase 1  Engine spike            9 Nov–4 Dec    ████            ◆ Engine gate + Design gate (Mon 7 Dec)
Phase 2  Core app                7 Dec–1 Jan        ████
Phase 3  Background + monetise   4–15 Jan               ██      ◆ Beta gate (Mon 18 Jan)
Phase 4  Beta + hardening        18 Jan–5 Feb             ███   ◆ Launch gate (Fri 5 Feb)
Phase 5  Launch + live ops       Tue 9 Feb →                 ►  ◆ iOS go/no-go (Mon 22 Feb)
```

Design work (DESIGN §11) runs alongside Phase 1: wireframes by 13 Nov, Figma by 27 Nov, prototype tests by 4 Dec.

---

## Phase 0: Foundation (Mon 2 – Fri 6 Nov)

**Goal:** a clean project with the right ids, layers, bridge skeleton and tooling.

| # | Session | Done when | Ref |
| --- | --- | --- | --- |
| 0.1 ⬜ | Git: make `compressly/` its own repo (like `doodle_rage/`) or confirm the monorepo plan; `.gitignore` adds `key.properties`, `*.jks`, `.env*`; first commit | Repo pushed (private) | NFR-18 |
| 0.2 ⬜ | Rename to `com.connectedinteractive.compressly` (applicationId, namespace, Kotlin path); app label "Compressly"; `minSdk 29`; portrait; remove `flame` | App launches on phone with new id | TECH_STACK §5, D9 |
| 0.3 ⬜ | Folder skeleton (ARCHITECTURE §3): `bootstrap()` → `AppScope` → theme tokens → empty Home; `FakeEngineService` | Analyze clean; Home shows on phone and Windows | ARCH §4 |
| 0.4 ⬜ | Stricter lints; Kotlin lint config; `tool/check_size.dart` (warn > 22 MB, fail > 25 MB arm64) | Baseline size recorded in PROJECT_PLAN §7 | NFR-09 |
| 0.5 ⬜ | Pigeon: `pigeons/engine_api.dart` with `getCapabilities()` only; generated Dart + Kotlin; `EngineApiImpl` returns real caps (HEVC encoder present? HDR? HEIC?) | Home shows "HEVC hardware: yes" on the phone | ARCH §5 |
| 0.6 ⬜ | Room `EngineDatabase` v1 with all tables (ARCH §9) + schema export + first migration test scaffold | Kotlin tests green | ARCH §9 |
| 0.7 ⬜ | Firebase project, Crashlytics + Analytics wired behind consent flag (off by default) | Test crash appears in console | FR-33 |
| 0.8 ⬜ | Name check (Q2) and start recruiting beta testers (target 50 sign-ups by Phase 3) | Q2 answered; sheet started | PRD §10 |

**Exit:** builds on phone with real id; bridge works end to end; DB exists; baseline size known.

---

## Phase 1: Engine spike (Mon 9 Nov – Fri 4 Dec)

**Goal:** prove the riskiest part. 4K H.264 → HEVC works on 5 phones with SSIM ≥ 0.95 and correct metadata. Minimal debug UI only.

| # | Session | Done when | Ref |
| --- | --- | --- | --- |
| 1.1 ⬜ | Golden set v0: 30 files (4K/1080p, 30/60, portrait/landscape, HDR, slo-mo, 10 s and 10 min, JPEGs) recorded by Vedant + CC0 clips; list in `docs/golden_set.md` and `LICENSES.md` | Files on phone in `Android/data/<pkg>/files/golden/` | DPR §13 |
| 1.2 ⬜ | Permissions flow (debug UI): media read (API split), ACCESS_MEDIA_LOCATION, notifications | Granted on API 33+ phone; denial handled | FR-01, FR-20 |
| 1.3 ⬜ | `LibraryScanner` + `MediaProbe` + `EligibilityRules` (JVM-tested) → `scanLibrary` + `listItems` | Debug list shows codec/bitrate/size for real gallery | FR-02, FR-03, FR-36 |
| 1.4 ⬜ | `PresetResolver` (DESIGN §5.1, JVM-tested) + `SavingsEstimator` | Unit tests cover table, 60% rule, interpolation, H.264 fallback | FR-24, FR-05 |
| 1.5 ⬜ | `VideoEncoder` (Media3 → temp MP4) for one file from debug UI; progress events | 1 min 4K30 file encodes; time logged | FR-04, NFR-04 |
| 1.6 ⬜ | `OutputProbe` + `QualityGate` + `Ssim` (JVM tests on synthetic frames) | Gate accepts/rejects correctly on test pairs | FR-09, FR-10, FR-37 |
| 1.7 ⬜ | Metadata: creation time, location, orientation into MP4; EXIF for photos; comparison test | Metadata test passes on golden subset | FR-06 |
| 1.8 ⬜ | `LibraryWriter` (IS_PENDING flow, same folder, our marker) | Output appears in Google Photos at the original's date position | FR-39, FR-36 |
| 1.9 ⬜ | HDR: detect, keep HDR when supported, else skip | HDR file is kept HDR or skipped, never tone-mapped | FR-07 |
| 1.10 ⬜ | Photo Safe mode: libjpeg-turbo JNI lossless optimise + pixel-identity test | 5–15% saving, pixels identical | FR-08 |
| 1.11 ⬜ | Photo Max savings: HeifWriter + EXIF copy | HEIC opens in Google Photos with date and GPS | FR-08, FR-06 |
| 1.12 ⬜ | Golden runner: `androidTest` that runs all presets on the golden set → CSV; `tool/golden_report.dart` | Report: SSIM, saving %, time, metadata pass per file | NFR-03 |
| 1.13 ⬜ | Run on 5 phones (own + 2 test phones + 2 friends' phones or Test Lab); tune presets; seed device deny list | **Engine gate evidence** in PROJECT_PLAN status log | Gate 1 |

**Engine gate (Mon 7 Dec):** 4K H.264 → HEVC on 5 phones, mean SSIM ≥ 0.95 Balanced, resolution identical, metadata identical, median saving ≥ 40% on Android H.264 sources. If not met: re-plan (H.264-lower-bitrate-only MVP, or narrower device list) before Phase 2.
**Design gate (Mon 7 Dec):** 5–8 prototype users understand the savings screen and trust the delete flow.

---

## Phase 2: Core app (Mon 7 Dec – Fri 1 Jan)

**Goal:** the full manual flow with real UI, safe originals and history.

| # | Session | Done when | Ref |
| --- | --- | --- | --- |
| 2.1 ⬜ | `JobStateMachine` + Room DAO + recovery rules (JVM tests for every row of ARCH §6 recovery table) | All recovery tests green | NFR-02 |
| 2.2 ⬜ | `JobRunner` + `CompressionService` (FGS, type by API level) + `RunConditions` (space, thermal) | 5-file queue completes with screen off | FR-13, NFR-05, NFR-07 |
| 2.3 ⬜ | Bridge: enqueue/pause/resume/cancel/getQueue + events | Queue controllable from Dart | FR-13 |
| 2.4 ⬜ | Welcome + Permission screens (EN) | First run on a fresh install feels clear | DESIGN §2 |
| 2.5 ⬜ | Scan screen + Savings result (big number, split, top 5) | "You can free up N GB" in < 60 s | FR-02, DESIGN §3 |
| 2.6 ⬜ | Scan results tabs + selection + "Compress N files" footer + File detail | Select and enqueue from list | FR-23 |
| 2.7 ⬜ | Queue screen + progress notification | Matches DESIGN §3/§9 | FR-13, FR-31 |
| 2.8 ⬜ | `OriginalsRequester` (API 30+ batch, API 29 per-item) + safety re-checks (ARCH §7.3) | Delete dialog appears; only READY items in batch | FR-14 |
| 2.9 ⬜ | Review screen + holding period + "Keep original instead" + reminder scheduling | Both paths work; reminder fires | FR-15, FR-27, FR-31 |
| 2.10 ⬜ | Home dashboard (ring, freed vs pending) + History | Numbers match Room totals | FR-16, FR-22, FR-28, FR-29 |
| 2.11 ⬜ | Settings (preset, conditions, exclusions, holding, language placeholder) | All settings reach the engine | FR-19, FR-41 |
| 2.12 ⬜ | Safety suite v1: `tool/safety/` kill mid-encode, kill mid-save, reboot, storage full, permission revoked | All pass on 2 phones; originals intact | NFR-02, RISK R1 |

---

## Phase 3: Background + monetise (Mon 4 – Fri 15 Jan)

| # | Session | Done when | Ref |
| --- | --- | --- | --- |
| 3.1 ⬜ | `NewMediaWorker` (content-URI trigger) + `QueueWorker` (charging, battery) | New video recorded while charging gets compressed | FR-11, FR-12 |
| 3.2 ⬜ | FGS `onTimeout()` checkpoint + reschedule; test with shortened timeout via adb | Clean stop, resumes next window | FR-38, RISK R5 |
| 3.3 ⬜ | OEM battery guide (brand detection, steps, deep links) | Shown once on OnePlus/Xiaomi/Vivo/Oppo/Realme | FR-30 |
| 3.4 ⬜ | RevenueCat + Play products (monthly, yearly, lifetime) + `BillingService` + entitlement push to native | Sandbox purchase unlocks Pro | FR-17, FR-18 |
| 3.5 ⬜ | `AllowanceGuard` (Kotlin) + `allowance.dart` / `paywall_policy.dart` (Dart), both unit-tested | Free user stops at 2 GB; paywall appears | FR-17, FR-26 |
| 3.6 ⬜ | Paywall screen (store prices, terms, restore) | Matches DESIGN §3 and FR-40 | FR-40 |
| 3.7 ⬜ | AdMob rewarded + UMP; +1 GB grant on reward callback; daily cap | Test ad grants bonus; cap enforced | FR-25, FR-34 |
| 3.8 ⬜ | Remote Config + `setRemoteTuning` + device deny list + kill switches | Changing a key changes behaviour next launch | FR-35, ARCH §7.7 |
| 3.9 ⬜ | Hindi: all strings to ARB, `app_hi.arb` from native speaker, language override | Whole app in Hindi at 200% font | FR-32, NFR-11 |
| 3.10 ⬜ | Analytics events + consent sheet + privacy policy page live | Events in DebugView with no media data | FR-33, ARCH §11 |
| 3.11 ⬜ | Release signing, R8, AAB, size check; Play closed-testing track upload | Build on closed track | NFR-09, NFR-18 |

**Beta gate (Mon 18 Jan):** zero lost originals in the safety suite; crash-free ≥ 99% on internal testers; billing works in sandbox.

---

## Phase 4: Beta + hardening (Mon 18 Jan – Fri 5 Feb)

| # | Session | Done when | Ref |
| --- | --- | --- | --- |
| 4.1 ⬜ | Closed test: 50–200 testers (≥ 12 active 14 days), feedback form in app (no media) | Running | PRD §8 |
| 4.2 ⬜ | Golden set to 200 files; device matrix 40 devices (Test Lab + physical) | Report in PROJECT_PLAN log | DPR §13 |
| 4.3 ⬜ | Accessibility pass (TalkBack, 200% font, contrast) | Checklist passes | NFR-10, NFR-19 |
| 4.4 ⬜ | Performance and battery pass (NFR-04, NFR-06, NFR-13, NFR-14) | Measured on reference phone | NFR-04..14 |
| 4.5 ⬜ | Fix sessions from beta feedback (one per issue) | — | — |
| 4.6 ⬜ | Store listing (EN + HI), screenshots, feature graphic, Data safety form, permissions declaration, FGS declaration + demo video | Submitted | RISK R7 |
| 4.7 ⬜ | Billing sandbox full checklist (purchase, renew, cancel, refund, restore, ad reward) | All pass | FR-17, FR-18, FR-25 |

**Launch gate (Fri 5 Feb):** beta users report no visible quality problems; billing and restore verified; legal (Q3, Q4) done.

---

## Phase 5: Launch + live ops (Tue 9 Feb 2027 →)

| # | Session | Done when |
| --- | --- | --- |
| 5.1 ⬜ | Production rollout 20% → 50% → 100% over 1 week, watching crash-free and "original lost" reports | 100% |
| 5.2 ⬜ | Launch content: Reels/Shorts before/after; 5–10 YouTubers with lifetime codes | Posted |
| 5.3 ⬜ | Weekly: Remote Config preset tuning from `job_result` buckets; deny-list updates | Ongoing |
| 5.4 ⬜ | v1.1 planning: P1 list (PRD §5.4) ordered by beta feedback | Ordered list |
| 5.5 ⬜ | **iOS go/no-go (Mon 22 Feb):** Android conversion and retention near PROJECT_PLAN §6 targets | Decision recorded |
