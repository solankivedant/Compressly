---
paths:
  - "lib/core/services/billing/**"
  - "lib/core/services/ads/**"
  - "lib/core/services/remote_config/**"
  - "lib/core/domain/allowance*"
  - "lib/core/domain/paywall*"
  - "lib/ui/screens/paywall*"
  - "android/app/src/main/kotlin/**/entitlement/**"
---

# Billing, ads & Remote Config rules

## Free tier and paywall (DESIGN §7, FR-17, FR-25, FR-26)
- Allowance maths lives in `core/domain/allowance.dart` (Dart, for UI) and `entitlement/AllowanceGuard.kt` (Kotlin, enforcing). Both read the same Remote Config keys and have matching unit tests for the same cases.
- The native guard is authoritative. The UI never decides on its own that a job may run.
- The scan and estimate are always free. Never show the paywall before the first savings result, and never during a running job.
- The job that crosses the limit finishes; the next one is blocked.

## Billing (RevenueCat)
- Entitlement id `pro`; offering `default` with monthly, yearly, lifetime. Yearly is highlighted.
- **Displayed prices come from the store product**, never from code or Remote Config.
- After every customer-info change, push `setEntitlement` to native.
- Handle cancelled, pending, already-owned and network errors with plain-words messages. Restore is always available on the paywall and in Settings (FR-18).
- Paywall shows price, period, auto-renewal, and how to cancel (FR-40).
- Sandbox / test keys only in git. The release key comes from `--dart-define=RC_API_KEY`.

## Ads
- **Rewarded only.** No banners, no interstitials, no app-open ads.
- Only Google's official test ad unit ids in code and git. Real ids from `--dart-define=ADMOB_REWARDED_ID`.
- UMP consent completes before any ad request (FR-34). Non-personalised without consent.
- Grant the +200 MB bonus **only** in the `onUserEarnedReward` callback. Enforce the daily cap natively.
- Show "Watch an ad" only when an ad is loaded. Never block anything waiting for an ad.
- Never click real ads on your own devices.

## Remote Config
- Every key has a bundled default (ARCHITECTURE §9). Fetch in the background; **activate on next launch**, never mid-session; push to native with `setRemoteTuning`.
- Key naming: `<area>_<name>` (`free_allowance_bytes`, `ads_max_per_day`, `engine_device_denylist`).
