# Compressly: Product & Experience Design

Last updated: 22 Oct 2026 · Owner: Vedant Solanki · Source: DPR §7, §10
Numbers here are defaults. Tunable values are mirrored as Remote Config keys (ARCHITECTURE §9).

---

## 1. Design pillars

1. **One number.** The whole app is built around "GB you can free up". Shown on first launch, updated after every job.
2. **Never lose a pixel.** Resolution, frame rate, duration and orientation are always kept. Downscaling is never on by default.
3. **Never lose a memory.** Originals go only after verification and the user's tap on the system dialog.
4. **Show, don't claim.** Every result shows GB saved and a quality score in plain words.
5. **Calm and trustworthy.** Not a "phone booster". No fake urgency, no red warnings, no countdowns, no scare copy.
6. **Respect the phone.** Heavy work runs while charging and cool, by default.

## 2. Core flow (first run)

| Step | Screen | What happens | Exit |
| --- | --- | --- | --- |
| 1 | Welcome | 3 swipe cards: "Same resolution" · "Stays on your phone" · "You approve every deletion" | "Get started" |
| 2 | Permission | Explains media access (and location, for keeping GPS), then the system prompt | Granted → 3; denied → explainer + Settings link |
| 3 | Scan | Animated progress ring, items counted live; usually < 30 s | Auto → 4 |
| 4 | Savings result | Big number "You can free up 38 GB"; split videos / photos; top 5 largest files | 5 |
| 5 | Choose | "Compress top 5 now" (primary) · "Auto-compress while charging" (Pro badge) · "Choose files" | → 7, or paywall |
| 6 | Paywall | Only when the free 2 GB is used or a Pro feature is tapped | Plan, ad, or "Not now" |
| 7 | Processing | Queue with per-file progress, pause, cancel; background notification | Batch done → 8 |
| 8 | Review | Before/after, quality words; "Remove originals" or "Keep both for 30 days" | → 9 |
| 9 | Home | Storage ring, GB freed, GB pending, queue status, auto-compress switch | — |

Analytics consent (FR-33) is a small bottom sheet after step 4, not a blocker before the user has seen any value.

## 3. Screens

| Screen | Key elements |
| --- | --- |
| Home | Storage ring (used vs freeable), "GB freed" (green), "GB pending" (neutral) with "Review" button, auto-compress switch, "Scan again", queue status chip |
| Scan results | Tabs: Videos / Photos / Large files. Row: thumbnail, "1.8 GB → 0.7 GB", saving %, checkbox. Sticky footer: "Compress 12 files · save 9.4 GB" |
| File detail | Codec, resolution, fps, bitrate, size, estimate; after compression: SSIM + words. Before/after slider in v1 |
| Queue | Active job: %, ETA, state words ("Compressing", "Checking quality", "Saving"); status chips: charging, temperature, free space; Pause all |
| Review originals | Batch list with before/after and quality words; holding period selector; "Remove originals" primary; "Keep original instead" per row |
| History | Every job: date, file, before → after, quality, outcome (saved / not worth it / skipped and why) |
| Paywall | Yearly (highlighted, "Best value"), Monthly, Lifetime; "Watch an ad for +200 MB"; Restore; terms (price, period, renewal, how to cancel) |
| Settings | Preset, run conditions, excluded albums, holding period, language, privacy and consent, restore, battery guide, licences, about |
| Battery guide | Brand-specific steps with screenshots-as-illustrations; "Open battery settings" deep link where available |

## 4. Copy and tone

- Plain, short, warm. Second person. No jargon on main screens ("HEVC", "SSIM", "bitrate" only in File detail and Settings → Advanced).
- Numbers formatted with locale; sizes in GB with 1 decimal ≥ 1 GB, MB with 0 decimals below.
- Never say "deleted" for something that's only pending. "Ready to free" ≠ "freed".
- Trust badge on every result: "Processed on your phone".
- All strings in ARB files (`lib/l10n/app_en.arb`, `app_hi.arb`). Hindi is written by a native speaker, not machine-only (BUDGET B7).

Example strings:

| Key | English | Notes |
| --- | --- | --- |
| `savingsHeadline` | You can free up {gb} GB | `{gb}` formatted |
| `qualityIdentical` | Looks identical | SSIM ≥ 0.97 |
| `qualityVeryClose` | Very close | 0.95–0.97 |
| `qualityClose` | Close | 0.92–0.95 (Max savings only) |
| `notWorthIt` | Not worth compressing, kept as is | gate rejected |
| `removeOriginals` | Remove originals | opens system dialog |
| `keepBoth` | Keep both for {days} days | holding period |

## 5. Compression presets

### 5.1 Video (HEVC, same resolution and frame rate)

Starting values from the DPR, tuned with the golden set (IMPLEMENTATION_PLAN Phase 1).

| Source | High | Balanced (default) | Max savings |
| --- | --- | --- | --- |
| 4K 30 fps | 40 Mbps | 28 Mbps | 18 Mbps |
| 4K 60 fps | 60 Mbps | 42 Mbps | 28 Mbps |
| 1080p 30 fps | 12 Mbps | 8 Mbps | 5 Mbps |
| 1080p 60 fps | 18 Mbps | 12 Mbps | 8 Mbps |
| Minimum mean SSIM | 0.97 | 0.95 | 0.92 |

Rules:
- Target bitrate = min(preset value, 60% of source bitrate).
- Other resolutions: scale the 1080p value by pixel count (linear), clamp to [2, 60] Mbps. Frame rates other than 30/60: interpolate linearly.
- H.264 fallback (FR-05): bitrate × 1.4, same SSIM threshold.
- Audio copied; if passthrough fails, AAC 192 kbps stereo.
- Keyframe interval 1–2 s; VBR where supported.
- Retry once at +25% bitrate if the gate fails.

### 5.2 Photos

| Mode | Method | Typical saving | Quality change |
| --- | --- | --- | --- |
| Safe (default) | Lossless JPEG optimisation (optimal Huffman, progressive) | 5–15% | None, pixel-identical |
| Max savings | JPEG → HEIC, quality 85–90 | 40–50% | Very small |
| RAW/DNG (v1) | DNG → HEIC 10-bit | ~90% | RAW editing lost; must confirm |

### 5.3 Quality words

| Mean SSIM | Words | Colour |
| --- | --- | --- |
| ≥ 0.97 | Looks identical | Green |
| 0.95–0.97 | Very close | Green |
| 0.92–0.95 | Close | Neutral |
| < threshold | (rejected; original kept) | — |

## 6. Run conditions (defaults)

| Condition | Default | Options |
| --- | --- | --- |
| Charging required (auto mode) | On | On / Off |
| Minimum battery | 30% | 20 / 30 / 50% |
| Thermal | Pause at "moderate" | fixed |
| Free space | ≥ 1.2× the largest queued file | fixed |
| Holding period | Ask each time | 0 (remove now) / 7 / 14 / 30 days |
| Wi-Fi | Not needed (shown as reassurance) | — |

## 7. Free tier and paywall rules

- Allowance: 2 GB of savings per calendar month (device local time), counted when a job reaches **ready**.
- The job that crosses the limit is allowed to finish; the next one shows the paywall.
- Ad bonus: +200 MB per completed rewarded ad, max 5 ads/day, valid until month end.
- Pro features: auto-compress, High and Max savings presets, unlimited savings, no ads.
- Paywall never interrupts a running job and never appears before the first scan result.

## 8. Visual design system

### 8.1 Tokens (`lib/app/theme.dart`)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `primary` | #0F766E (deep teal) | #2DD4BF | Buttons, ring "freeable" arc |
| `success` | #15803D | #4ADE80 | **Confirmed** savings only |
| `warning` | #B45309 (amber) | #FBBF24 | Thermal, low space, permission issues |
| `surface` | #FFFFFF | #0B1215 | Cards |
| `background` | #F6F8F8 | #050A0C | Screens |
| `onSurfaceMuted` | #5B6B70 | #9AA9AD | Secondary text |
| Radius | 16 cards · 12 buttons · 24 sheets | same | |
| Spacing | 4-pt grid: 4, 8, 12, 16, 24, 32 | same | |

No red anywhere except system-level errors (and even then prefer amber).

### 8.2 Type
One family: **Noto Sans** (covers Devanagari; Gujarati/Tamil in v1). Three roles: Body 16, Label 14, Display numbers 48/36 tabular figures. Must hold at 200% font scale without clipping.

### 8.3 Components
Storage ring · savings card · file row · progress row · plan card · confirm bottom sheet · status chip · trust badge.

### 8.4 Motion
Progress ring sweep; "GB saved" count-up ≤ 1.2 s; screen transitions 200–250 ms. Respect `MediaQuery.disableAnimations`.

## 9. Notifications

| Notification | When | Example |
| --- | --- | --- |
| Progress (ongoing) | While a job runs (FGS) | "Compressing 3 of 12 · 1.4 GB saved so far" |
| Batch summary | Batch done | "Ready to free 6.4 GB. Tap to review." |
| Holding period over | Day N at 10:00 local | "Your 14 days are up. Free 3.2 GB now?" |
| Paused | Thermal or battery pause > 10 min | "Paused to keep your phone cool. We'll continue later." |

Max one non-progress notification per day; none 21:00–09:00.

## 10. Accessibility
Screen-reader labels on every control and on the ring ("38 gigabytes can be freed"). 48 dp targets. Contrast ≥ 4.5:1 both themes. No information by colour alone (savings also have icons/words).

## 11. Design deliverables (from DPR §10.4)

| Deliverable | Due |
| --- | --- |
| Low-fidelity wireframes for the 9-step flow | Fri 13 Nov 2026 |
| High-fidelity Figma, light and dark | Fri 27 Nov 2026 |
| Clickable prototype tested with 5–8 users | Fri 4 Dec 2026 (Design gate) |

Vedant designs in Figma (free tier). Claude Code builds from screenshots or the Figma file.

## 12. Feature notes (daily workflow)

Vedant writes the next feature idea or change here in plain words. A note under **Next** overrides or refines the IMPLEMENTATION_PLAN row. Claude Code moves it to **Done** with the date and commit when finished.

### Next

_(empty)_

### Done

_(empty)_

## 13. Claude Design prototype (23 Oct 2026)

The Flutter UI follows the Claude Design project "Compressly mobile app prototype" (`Compressly App.dc.html`) and its design system (colour v2: cobalt action, lime freed, coral still-to-free; dark theme default). Tokens live in `lib/app/theme.dart`, shared widgets in `lib/ui/widgets/`.

- Bottom nav: Home · Compress · Media · Settings. The prototype's **Camera** tab (record straight to HEVC) is left out until the CAMERA permission is approved in TECH_STACK §5 with a `policy-checker` review.
- Rewarded ad: +200 MB (design value, see PRD §5 decision).
- Screens run on fake services until the engine sessions land; numbers on screen come from `FakeEngineService`.
