# Compressly: Risk Register

Last updated: 22 Oct 2026 · Owner: Vedant Solanki · Source: DPR §12, §16
Review weekly and at every gate. Score = Likelihood × Impact (1–5 each). 🔴 ≥ 15 · 🟠 8–14 · 🟢 ≤ 7.

**The biggest risk is a single lost original.** One viral review about deleted wedding videos can end the product, so R1's mitigations are non-negotiable and gate every release.

---

## 1. Product and technical risks

| # | Risk | L | I | Score | Mitigation | Owner | Trigger to act |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Original deleted or corrupted by a bug | 1 | 5 (critical) | 🟠 5 → treat as 🔴 | Read-only originals; delete only via system dialog and only READY jobs with re-verified output (ARCH §7); holding period; crash-safe state machine; safety suite gates every engine change; `engine_delete_enabled` kill switch | Claude Code / Vedant | Any report of a missing or broken original → kill switch first, investigate second |
| R2 | Visible quality loss angers users | 3 | 4 | 🟠 12 | SSIM gate + dimension/duration checks; conservative Balanced; quality words; "Keep original instead" during holding period; golden-set regression | Claude Code | Any beta "looks worse" report with SSIM ≥ threshold → raise threshold/bitrate via Remote Config |
| R3 | OEM battery killers stop background jobs (OnePlus, Xiaomi, Vivo, Oppo, Realme) | 4 | 3 | 🟠 12 | Brand battery guide; WorkManager retries; "Compress now" fallback; queue resumes cleanly | Claude Code | Auto-mode completion rate < 60% on a brand |
| R4 | Hardware encoder bugs on some chipsets (wrong colours, crashes, green frames) | 3 | 4 | 🟠 12 | Device/chipset deny list via Remote Config; H.264 fallback; auto-fallback after 2 crashes per model; SSIM catches garbage | Claude Code | Crash cluster or SSIM failures on one model |
| R5 | Android 15+ FGS time limit (~6 h/24 h) interrupts long queues | 4 | 2 | 🟠 8 | Checkpoint per file; `onTimeout()` clean stop; resume next window; biggest-gain files first | Claude Code | — |
| R6 | Phone overheats or drains battery | 3 | 3 | 🟠 9 | Charging-only default; thermal pause at moderate; one job at a time | Claude Code | Thermal pauses > 30% of job time |
| R7 | Play rejects media permission, FGS type or Data safety form | 3 | 4 | 🟠 12 | Minimal permissions; in-app justification; declaration with demo video; `policy-checker` agent review before submission | Vedant | Rejection email → fix within 48 h |
| R8 | HEIC/HEVC files fail to open in other apps or when shared | 3 | 3 | 🟠 9 | MP4 container; HEIC is opt-in (Max savings); share-as-JPEG/H.264 in v1.1; FAQ | Claude Code | Beta reports about WhatsApp/Instagram sharing |
| R9 | Low willingness to pay in India | 4 | 4 | 🔴 16 | Generous free tier; lifetime option; rewarded ads; international pricing in month 3–4; lean budget keeps break-even low | Vedant | Paid < 1.5% after 8 weeks |
| R10 | Google Photos / OEMs add local compression or HEVC defaults | 3 | 4 | 🟠 12 | Speed to market; safety and quality brand; iOS ProRes niche; duplicates finder | Vedant | Announcement → re-plan P1 |
| R11 | Metadata lost or gallery order breaks | 3 | 4 | 🟠 12 | Metadata copy (MP4 + EXIF + MediaStore DATE_TAKEN); ACCESS_MEDIA_LOCATION; automated metadata comparison in golden run | Claude Code | Any metadata test failure blocks release |
| R12 | Low storage leaves no room for temp files | 3 | 2 | 🟢 6 | 1.2× free-space check; offer smallest-first order when space is low | Claude Code | — |
| R13 | Legal or tax mistakes (DPDP, GST) | 2 | 3 | 🟢 6 | Lawyer and CA review before launch gate | Vedant | — |
| R14 | Founder time split with Doodle Rage launch (1 Dec) | 4 | 3 | 🟠 12 | Phase 1 is engine work Claude Code can do with short phone checks; design gate needs only 5–8 tests; slip Engine gate ≤ 1 week if needed | Vedant | Phase 1 sessions < 60% done by 27 Nov |
| R15 | MP4 metadata (location/creation time) not writable through Media3 on some versions | 2 | 4 | 🟠 8 | Spike in session 1.7; fallback: post-process MP4 `moov` atoms with a small Kotlin box writer | Claude Code | Session 1.7 fails |
| R16 | Gallery apps double-show (original + output) during holding period and confuse users | 3 | 2 | 🟢 6 | Clear copy on Review; holding is opt-in; reminder notification | Vedant | Beta confusion reports |
| R17 | Files in Google Photos backup get re-uploaded as new items | 3 | 2 | 🟢 6 | FAQ; note in Review screen; consider skipping recently-backed-up check (not possible via API) | Vedant | — |
| R18 | Play closed-testing requirement (12 testers × 14 days) delays production access | 2 | 3 | 🟢 6 | Recruit from Phase 0; start closed track by 18 Jan | Vedant | < 12 testers on 18 Jan |

## 2. Privacy, legal and store checklist (before Launch gate)

| Item | Status |
| --- | --- |
| Privacy policy page (EN + HI) live; linked in app and listing | ⬜ |
| DPDP Act 2023: notice, consent for analytics, opt-out, grievance contact (lawyer review) | ⬜ |
| GST and payment handling confirmed with CA | ⬜ |
| Play Data safety form: analytics + crash data, no media; ads id | ⬜ |
| Play photo/video permissions declaration (core use: storage management) | ⬜ |
| FGS type declaration (`mediaProcessing` / `dataSync`) with demo video | ⬜ |
| Subscription disclosure on paywall (price, period, renewal, cancel) | ⬜ |
| AdMob: UMP consent; rewarded only; app-ads.txt on domain | ⬜ |
| Content rating questionnaire (Everyone/3+; no user content) | ⬜ |
| `LICENSES.md` complete; open-source licences screen in app | ⬜ |
| Store listing claims are true and measured ("same resolution", "on-device") | ⬜ |

## 3. Closed risks

_(none yet)_
