# Compressly: Budget & Resources

Last updated: 22 Oct 2026 · Owner: Vedant Solanki · Source: DPR §15 (team and budget **superseded** by this file)
Line items: [budget_and_resources.csv](budget_and_resources.csv). Log every spend > ₹500 in §7.

All figures are planning estimates in INR. Replace them with real quotes as they arrive.

---

## 1. Model

**Plan A (chosen): founder + Claude Code.** Vedant directs, designs and tests. Claude Code writes all code. Spend goes on test phones, legal/tax, a Hindi reviewer and launch marketing. This is the DPR's "founder builds most of it" option (₹3–4 lakh), made cheaper because there are no salaries.

**Plan B (fallback): DPR hired team, ₹12.19 lakh.** Triggered only if the Engine gate fails twice and a native media engineer is needed (§6).

## 2. Plan A budget (Android MVP, Nov 2026 – Feb 2027)

| ID | Item | ₹ | When | Mandatory |
| --- | --- | --- | --- | --- |
| C1 | Claude subscription (4 months; shared with Doodle Rage, full cost shown) | 8,000 | Monthly, Nov–Feb | Yes |
| C2 | Test phone 1: used MediaTek budget phone (Android 12–14) | 8,000 | Week 2 | Yes |
| C3 | Test phone 2: used Snapdragon phone from an aggressive-OEM brand (Xiaomi/OnePlus/Vivo), Android 14–15 | 10,000 | Week 2 | Yes |
| C4 | Google Play developer account | 0 | Already paid (Connected Interactive) | — |
| C5 | Firebase, RevenueCat, AdMob, GitHub, Figma, Test Lab | 0 | Free tiers | — |
| C6 | Domain for privacy policy + app-ads.txt (GitHub Pages) | 1,000 | Week 10 | Yes |
| C7 | Hindi reviewer (UI strings + store listing) | 4,000 | Weeks 11 and 14 | Yes |
| C8 | Lawyer: privacy policy + DPDP review | 12,000 | Weeks 12–14 | Yes |
| C9 | CA: GST and payments setup | 8,000 | Weeks 12–14 | Yes |
| C10 | Prototype tester thank-yous (8 × ₹250) | 2,000 | Week 5 | No |
| C11 | Launch marketing: boosted Reels/Shorts | 15,000 | Week 15 | No |
| C12 | YouTuber outreach (lifetime codes, no cash) | 0 | Week 15 | — |
| | **Subtotal** | **68,000** | | |
| C13 | Contingency 15% | 10,200 | | |
| | **Total Plan A** | **78,200** | | |

Mandatory-only floor (C1–C3, C6–C9): **₹51,000**.

## 3. Spend plan by month

| Month | Items | ₹ |
| --- | --- | --- |
| Nov 2026 | C1 (2,000), C2, C3 | 20,000 |
| Dec 2026 | C1, C10 | 4,000 |
| Jan 2027 | C1, C6, C7 (half), C8, C9 | 25,000 |
| Feb 2027 | C1, C7 (half), C11 | 19,000 |
| Reserve | C13 | 10,200 |

After launch: Claude ~₹2,000/month; Apple Developer $99 (~₹8,500) only if iOS is a go on 22 Feb; RevenueCat stays free until $2.5k monthly tracked revenue.

## 4. Revenue and break-even

Assumptions (DPR §15.3): 100,000 installs in year 1; blended net ≈ ₹300 per paying user per year after the 15% store fee, before GST. Rewarded-ad income is kept out of these numbers.

| Scenario | Paying users | Net subscription revenue (₹/yr) | Plan A payback |
| --- | --- | --- | --- |
| Conservative (2% of 40,000 active) | 800 | 2,40,000 | ~4 months of revenue |
| Base (4% of 40,000 active) | 1,600 | 4,80,000 | ~2 months |
| Optimistic (5% of 80,000 active) | 4,000 | 12,00,000 | < 1 month |

**Break-even (Plan A):** ₹78,200 ÷ ₹300 ≈ **261 paying-user-years**, or about 0.3% of 100,000 installs paying for a year. Under Plan B (₹12.19 lakh) break-even needs ~4,060 paying-user-years, which is beyond the optimistic case. That is why Plan A was chosen.

Net per sale (DPR §5): ₹41.65/month, ₹339/year, ₹849 lifetime, before GST.

## 5. Resources

### 5.1 People
See PROJECT_PLAN.md §3.

### 5.2 Devices

| Device | Purpose |
| --- | --- |
| Vedant's own phone | Daily testing, reference mid-range |
| Test phone 1 (MediaTek, older Android) | Encoder quirks, API 29–32 paths (RecoverableSecurityException delete, READ_EXTERNAL_STORAGE) |
| Test phone 2 (aggressive OEM, Android 14–15) | Battery killers, FGS `mediaProcessing`/timeout, partial media access |
| Friends' phones (2–3, borrowed) | Engine gate's 5-phone requirement |
| Firebase Test Lab | Device matrix (Phase 4), within the free quota |
| Windows laptop | Dev; `flutter run -d windows` with fake services for UI-only work |

### 5.3 Golden media set
200 files by Phase 4 (30 by session 1.1): Vedant's own recordings (4K/1080p, 30/60, HDR, slo-mo, portrait/landscape, 10 s – 30 min), JPEG/HEIC/DNG photos, plus CC0 clips. Never real private family media in the repo; files stay on test phones and a private drive. Listed in `docs/golden_set.md`.

### 5.4 Time
Vedant: ~50% until Tue 1 Dec 2026 (Doodle Rage launch), ~100% after. Claude Code: one session per feature, about 2–4 sessions per working day.

### 5.5 App size budget (NFR-09)

| Group | Budget (arm64 download) |
| --- | --- |
| Flutter engine + Dart code | 8 MB |
| Native engine (Kotlin + Media3 + Room + WorkManager) | 3 MB |
| libjpeg-turbo JNI | 0.5 MB |
| Firebase (core, analytics, crashlytics, RC) | 3 MB |
| AdMob + UMP | 3 MB |
| RevenueCat | 1 MB |
| Fonts (Noto Sans Latin + Devanagari subsets) | 1 MB |
| Images and illustrations | 1.5 MB |
| **Target** | **≤ 21 MB** · warn > 22 · fail > 25 |

Install size is checked on the phone (Settings → Apps) before every release: must be < 30 MB.

## 6. Plan B (DPR hired team) for reference

| Item | ₹ |
| --- | --- |
| Flutter + Android developer (4 × 70,000) | 2,80,000 |
| Native media engineer (3 × 1,20,000) | 3,60,000 |
| UI/UX designer (2 × 35,000) | 70,000 |
| QA tester (1.5 × 40,000) | 60,000 |
| Test devices (6 used phones) | 90,000 |
| Accounts and tools | 20,000 |
| Legal and accounting | 30,000 |
| Launch marketing | 1,50,000 |
| Contingency 15% | 1,59,000 |
| **Total** | **12,19,000** |

Partial Plan B: a native media engineer on contract for 1 month (~₹1,20,000) is the most useful single hire if the Engine gate fails.

## 7. Spend log

| Date | ID | Item | ₹ | Note |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |
