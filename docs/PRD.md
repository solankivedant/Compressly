# Compressly: Product Requirements Document (PRD)

Last updated: 22 Oct 2026 · Owner: Vedant Solanki · Source: DPR §1–5
Requirements detail: SRS.md. UX: DESIGN.md. Dates: PROJECT_PLAN.md.

---

## 1. Summary

Compressly is an on-device Android app (iOS later) that frees 40–60% of a phone's photo and video storage. It re-encodes media into modern codecs (H.264 → HEVC, JPEG → optimised JPEG or HEIC) **at the same resolution**, checks quality with a measured score (SSIM), and removes originals only after the user approves. No media ever leaves the phone.

**Vision:** "Free up half your phone storage without losing a single pixel."

## 2. Problem and opportunity

- Many Android camera apps record 4K in H.264 at very high bitrates (about 1 GB per minute on a OnePlus 11R). HEVC gives similar quality at roughly half the size.
- 50 MP JPEGs at max quality run 15–40 MB each.
- Users don't know about codec settings, and changing them doesn't shrink files they've already recorded.
- Today's options fall short: deleting loses memories; cloud plans cost money and upload private media; Google Photos "Storage saver" only shrinks the cloud copy; generic compressor apps work one file at a time, downscale 4K and are full of ads.
- India: mobile-first and price-sensitive, with 128–256 GB phones the norm. No mainstream app combines automatic background re-encoding, full resolution, measured quality and on-device privacy.

Open question (Q1): validate market size with a 100–200 user survey and Play Store keyword data before launch.

## 3. Goals and non-goals

### Goals (v1.0 MVP, Android, launch Tue 9 Feb 2027)

| Goal | Target |
| --- | --- |
| A user sees "You can free up N GB" within 60 s of first launch | Scan result shown for ≥ 95% of users who grant permission |
| Full resolution kept | 100% of outputs: same width, height, frame rate, duration, rotation |
| Quality | Balanced preset mean SSIM ≥ 0.95 on the golden set |
| Safety | **Zero originals lost** in safety tests, beta and production |
| Real savings | Median ≥ 10 GB freed per active user |

### Year-1 goals (12 months after launch; reset after 8 weeks of live data)

| Goal | Target |
| --- | --- |
| Installs | 100,000 |
| Free scans completed | 60% of installs |
| Free-to-paid conversion | 3–5% of active users |
| Storage freed (all users) | 500 TB cumulative |
| Play Store rating | ≥ 4.4 |
| Originals lost due to app error | 0 |

### Non-goals (v1.0)

- Cloud backup or sync of any kind; any server of our own.
- Compressing app data, documents or WhatsApp's internal database.
- AV1 output (hardware encoders still rare).
- Downscaling (v2, explicit opt-in only).
- iOS (v2, after the Feb 2027 go/no-go).

## 4. Target users

| Persona | Profile | Main pain | Pays for |
| --- | --- | --- | --- |
| Riya, college student | 128 GB Android, records events and reels | "Storage full" warnings weekly | Cheap monthly plan or ads |
| Amit, young parent | 256 GB phone, years of 4K videos of his child | Won't delete memories, hates cloud bills | Yearly or lifetime |
| Sana, content creator | Shoots 4K/60 daily, edits on phone | Raw clips fill storage mid-shoot | Pro, speed, quality control |
| Karan, iPhone Pro owner (v2) | 256 GB iPhone, ProRes and ProRAW | ProRes eats tens of GB per shoot | Premium iOS plan |

Primary MVP target: anyone with **> 20 GB of camera media on Android 10+**.

## 5. Scope: features by priority

P0 = MVP (v1.0) · P1 = v1.x (within ~8 weeks of launch) · P2 = v2.

### 5.1 Core (P0)

| Feature | Description | SRS |
| --- | --- | --- |
| Permission onboarding | 3-card intro, explain each permission before the system prompt; handles partial access | FR-01, FR-20, FR-21 |
| Storage scan | Lists eligible files with codec, resolution, bitrate, size and estimated saving; total "GB you can free" | FR-02, FR-03 |
| Video re-encode | H.264 → HEVC in MP4, same resolution, fps, duration, rotation, audio copied | FR-04, FR-05, FR-06, FR-07 |
| Photo optimisation | Safe: lossless JPEG optimisation. Max savings: JPEG → HEIC | FR-08 |
| Quality presets | High, Balanced (default), Max savings | FR-24 |
| Quality gate | SSIM on sampled frames; reject below threshold or > 90% of original size | FR-09, FR-10 |
| Compress now | Select files (or "top 5 biggest") and compress immediately | FR-23 |
| Auto-compress (Pro) | New media queued and processed while charging | FR-11, FR-12 |
| Queue control | Progress, ETA, pause, resume, cancel; background with notification | FR-13, FR-31 |
| Safe originals | Review screen; delete in batches via system dialog; or keep both for 7/14/30 days, then reminder | FR-14, FR-15, FR-27 |
| Results and history | Before/after sizes, quality in plain words, "GB freed" vs "GB pending" | FR-16, FR-22, FR-28, FR-29 |
| Device safety | Charging/battery/thermal/free-space conditions; OEM battery guide | FR-12, FR-30, NFR-05, NFR-07 |
| Hindi + English | Full UI in both | NFR-11, FR-32 |

### 5.2 Monetisation (P0)

| Plan | Price (India) | Includes |
| --- | --- | --- |
| Free | ₹0 | Unlimited scans; up to 2 GB saved per month; Balanced preset; manual compression only |
| Free + ads | ₹0 | Each rewarded ad adds 1 GB to this month's allowance; max 5 ads/day |
| Pro monthly | ₹49/month | Unlimited, auto-compress, all presets, no ads |
| Pro yearly | ₹399/year | Same; **default highlighted** |
| Lifetime | ₹999 one-time | Same, forever |
| International (P1) | $1.99/mo · $14.99/yr · $29.99 lifetime | Same |

Rules: the scan is always free and shown before any paywall. Paywall appears only when the free allowance is used up or a Pro feature is tapped. Rewarded ads only: no banners, no interstitials, never during a running compression. Billing through RevenueCat on top of Play Billing. SRS FR-17, FR-18, FR-25, FR-26.

> Decision (22 Oct 2026): the DPR said an ad unlocks "3 extra files (or about 1 GB)". We use **+1 GB** so the free tier has a single unit (GB). Tunable by Remote Config.

### 5.3 Settings and compliance (P0)

Preset, run conditions (charging, battery %), excluded albums (FR-19, P0 minimal list), holding period, language, analytics consent (FR-33), ad consent via UMP (FR-34), restore purchases, privacy policy link, open-source licences.

### 5.4 v1.x (P1)

Before/after frame slider · share as JPEG/H.264 · duplicate and similar finder · large-file finder · RAW/DNG → HEIC with confirm · Gujarati, Tamil, Marathi · international pricing · "I freed 42 GB" share card with referral.

### 5.5 v2 (P2)

iOS app (ProRes → HEVC, ProRAW → HEIC, Live Photo stripping, duplicates) · content-aware bitrate · optional downscale · family plan.

## 6. User journeys

1. **First run:** Welcome (3 cards) → permission explainer → system prompt → scan (< 30 s) → "You can free up 38 GB" with videos/photos split and top 5 files → "Compress now".
2. **First compression (free):** select top 5 → queue runs → Review: "Saved 3.1 GB · Looks identical" → "Remove originals" → system dialog → Home shows "3.1 GB freed".
3. **Hits the limit:** free 2 GB used → paywall: yearly highlighted, "Watch an ad for +1 GB", "Not now".
4. **Pro auto mode:** turns on "Auto-compress while charging" → OEM battery guide (on OnePlus/Xiaomi/Vivo/Oppo/Realme) → overnight jobs → morning notification "Ready to free 6.4 GB. Review".
5. **Cautious user:** chooses "Keep both for 14 days" → after 14 days a notification asks for the delete approval; until then savings show as "pending".

## 7. Success metrics

Funnel KPIs and targets are in PROJECT_PLAN.md §6 (from DPR §17.2). North-star metric: **median GB freed per active user**. Safety metric: **originals lost = 0**.

## 8. Release criteria for v1.0

- All P0 features done and every P0 FR/NFR has a passing test or scripted check (SRS §6).
- Safety suite (kill mid-job, reboot, storage full, low battery, permission revoked, FGS timeout) passes on 5 phones with originals intact.
- Golden set: Balanced mean SSIM ≥ 0.95, resolution identical, metadata identical (date, GPS, orientation) on 5 phones.
- Beta: 3 weeks closed testing, ≥ 12 testers continuously for 14 days (Play requirement for new personal accounts), no visible quality complaints, crash-free sessions ≥ 99%.
- Billing: purchase, renewal, cancel, refund, restore and ad reward verified in Play sandbox.
- Play Data safety form, photo/video permission declaration and FGS declaration (with demo video) submitted.
- Arm64 download ≤ 25 MB and install < 30 MB (NFR-09).

## 9. Dependencies and assumptions

- Media3 Transformer on device hardware HEVC encoders works across the target chipsets (Engine gate, Mon 7 Dec 2026).
- Play approves READ_MEDIA_IMAGES/VIDEO for a storage-management core use, and the `mediaProcessing` FGS type.
- RevenueCat free tier (up to $2.5k monthly tracked revenue) covers year 1.
- Vedant's time is split with Doodle Rage until its launch on Tue 1 Dec 2026 (RISK_REGISTER R14).

## 10. Open questions

| # | Question | Owner | Needed by |
| --- | --- | --- | --- |
| Q1 | Market survey (100–200 users) and keyword volumes | Vedant | Beta gate (18 Jan) |
| Q2 | Final app name check: Play search, trademark (IP India) and domain availability for "Compressly" | Vedant | Phase 0 (6 Nov) |
| Q3 | GST and payment rules for digital services (CA) | Vedant + CA | Launch gate (5 Feb) |
| Q4 | DPDP Act privacy notice and grievance contact (lawyer) | Vedant + lawyer | Launch gate |
| Q5 | Pricing tests after launch: ₹49 vs ₹79 monthly; ₹399 vs ₹499 yearly; lifetime on/off; free 1 vs 2 GB | Vedant | 8 weeks after launch |
