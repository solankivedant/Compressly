# Compressly: Project Plan & Milestones

Last updated: 22 Oct 2026 · Owner: Vedant Solanki
Session-level tasks: IMPLEMENTATION_PLAN.md. Risks: RISK_REGISTER.md. Money and people: BUDGET_AND_RESOURCES.md.

---

## 1. Objective

Launch Compressly v1.0 for Android on Google Play (India first) on **Tue 9 Feb 2027**. It must have the P0 scope (PRD §5), zero lost originals and Balanced SSIM ≥ 0.95. Decide on iOS by Mon 22 Feb 2027.

## 2. Scope

**In:** PRD §5.1–5.3 (P0). **Out:** iOS, duplicates, before/after slider, share-as-JPEG, RAW, downscale, international pricing (all P1/P2).

## 3. Organisation

| Role | Who | Responsibilities |
| --- | --- | --- |
| Founder, product owner, designer, tester | Vedant Solanki | Feature notes, Figma, phone testing every session, decisions, store listing, marketing, accounts, legal |
| Builder | Claude Code | All Dart, Kotlin, C++ (JNI), tests, scripts, docs upkeep, store text drafts |
| Hindi reviewer | Native speaker (paid per batch) | `app_hi.arb`, store listing |
| Prototype testers | 5–8 people | Design gate |
| Beta testers | 50–200 (≥ 12 for 14 days) | Phase 4 |
| Advisers | CA (GST), lawyer (DPDP, privacy policy) | Before launch gate |

Vedant's time is shared with Doodle Rage until its launch on Tue 1 Dec 2026. Plan for Compressly at ~50% until then and ~100% from 2 Dec (RISK R14).

## 4. Schedule

### 4.1 Week view

| Week | Dates | Phase | Key outputs |
| --- | --- | --- | --- |
| 1 | Mon 2 – Fri 6 Nov | 0 Foundation | Repo, ids, skeleton, Pigeon caps, Room, Firebase, size baseline |
| 2 | 9 – 13 Nov | 1 Engine | Golden v0, permissions, scanner, presets · **wireframes** |
| 3 | 16 – 20 Nov | 1 Engine | Video encode, quality gate |
| 4 | 23 – 27 Nov | 1 Engine | Metadata, library writer, HDR, photos · **Figma hi-fi** |
| 5 | 30 Nov – 4 Dec | 1 Engine | Golden runner, 5-phone run · **prototype tests** · (Doodle Rage launch 1 Dec) |
| 6 | 7 – 11 Dec | 2 Core | ◆ Engine + Design gates (Mon 7 Dec) · state machine, FGS |
| 7 | 14 – 18 Dec | 2 Core | Onboarding, scan, results |
| 8 | 21 – 25 Dec | 2 Core | Queue, originals requester, review |
| 9 | 28 Dec – 1 Jan | 2 Core | Home, history, settings, safety suite v1 |
| 10 | 4 – 8 Jan | 3 Background + monetise | Workers, FGS timeout, battery guide, RevenueCat |
| 11 | 11 – 15 Jan | 3 | Allowance, paywall, ads, Remote Config, Hindi, analytics, closed-track build |
| 12 | 18 – 22 Jan | 4 Beta | ◆ Beta gate (Mon 18 Jan) · closed test starts |
| 13 | 25 – 29 Jan | 4 | Device matrix, a11y, performance, fixes |
| 14 | 1 – 5 Feb | 4 | Store listing, declarations, billing checklist · ◆ Launch gate (Fri 5 Feb) |
| 15 | 8 – 12 Feb | 5 Launch | **v1.0 live Tue 9 Feb**, staged rollout |
| 17 | Mon 22 Feb | 5 | ◆ iOS go/no-go |

### 4.2 Milestones

| Milestone | Date | Evidence |
| --- | --- | --- |
| M0 Project set up | Fri 6 Nov 2026 | Phase 0 exit |
| M1 Engine gate | Mon 7 Dec 2026 | Golden report from 5 phones |
| M2 Design gate | Mon 7 Dec 2026 | Prototype test notes (5–8 users) |
| M3 Feature complete (manual flow) | Fri 1 Jan 2027 | Phase 2 done, safety v1 green |
| M4 Beta gate | Mon 18 Jan 2027 | Safety suite, crash-free, sandbox billing |
| M5 Launch gate | Fri 5 Feb 2027 | Beta feedback, legal, declarations |
| M6 v1.0 live | Tue 9 Feb 2027 | Production 20% |
| M7 iOS go/no-go | Mon 22 Feb 2027 | KPI review |

## 5. Gates

| Gate | Pass criteria | If it fails |
| --- | --- | --- |
| Engine (7 Dec) | 4K H.264 → HEVC works on 5 phones; Balanced mean SSIM ≥ 0.95; resolution and metadata identical; median saving ≥ 40% | Re-plan: narrower device allow-list, H.264-lower-bitrate mode, or extend Phase 1 by ≤ 2 weeks and move launch |
| Design (7 Dec) | ≥ 6 of 8 testers explain the savings number and say they'd trust "Remove originals" | Rework review/delete flow before Phase 2 UI sessions |
| Beta (18 Jan) | Zero lost originals in safety suite on 5 phones; crash-free ≥ 99% internal; sandbox purchase + restore OK | No closed-track promotion; fix first |
| Launch (5 Feb) | No visible-quality complaints from beta; billing and restore verified; Data safety, permissions and FGS declarations accepted; CA and lawyer sign-off | Slip launch week by week; never ship with an open R1 issue |
| iOS go/no-go (22 Feb) | Android trend toward §6 targets (scan ≥ 50%, scan→compress ≥ 30%, paid ≥ 2%) | Stay Android-only; work on P1 |

## 6. KPIs (from DPR §17.2)

| Stage | KPI | Target |
| --- | --- | --- |
| Acquisition | Store listing conversion (view → install) | ≥ 30% |
| Activation | Install → completed scan | 60% |
| Activation | Scan → first compression | 40% |
| Revenue | Free → paid (active users, 30 days) | 3–5% |
| Revenue | Yearly share of new subscriptions | ≥ 50% |
| Retention | Day-30 retention | 20% |
| Value | Median GB freed per active user | ≥ 10 GB |
| Quality | Crash-free sessions | 99.5% |
| Safety | Originals lost due to app error | 0 |
| Satisfaction | Store rating | ≥ 4.4 |

Reviewed weekly from launch; targets reset after 8 weeks of live data.

## 7. Status log

Newest first. One line per week (Fridays) plus gate results and size checks.

| Date | Phase | Status | Notes |
| --- | --- | --- | --- |
| Thu 22 Oct 2026 | Pre-0 | ⬜ | Docs and Claude Code setup created from DPR. Flutter template project exists (`com.example.compressly`, has unused `flame` dep). |
