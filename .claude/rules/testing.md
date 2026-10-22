---
paths:
  - "test/**"
  - "integration_test/**"
  - "android/app/src/test/**"
  - "android/app/src/androidTest/**"
  - "tool/safety/**"
---

# Testing rules

- Mirror source paths: `lib/core/domain/allowance.dart` → `test/core/domain/allowance_test.dart`; `queue/JobStateMachine.kt` → `src/test/.../queue/JobStateMachineTest.kt`.
- Name tests with the requirement id: `test('FR-25 ad bonus adds 1 GB and caps at 5 per day', ...)`, `fun FR_38_checkpoints_on_timeout()`.
- Inject `Clock` (FakeClock) on both sides. Never sleep or rely on wall-clock time; test month and day boundaries explicitly (IST and a non-IST zone).
- Dart tests use `Fake*` services and never touch the network, Pigeon or real SDKs.
- Must-have JVM tests: EligibilityRules, PresetResolver (whole DESIGN §5.1 table + 60% rule + fallback), QualityGate decisions, Ssim on synthetic images (identical = 1.0, noise < 1.0), JobStateMachine (every transition), recovery (every row of ARCH §6), AllowanceGuard, Room migrations.
- Must-have Dart tests: allowance, paywall policy, quality words, byte formatting (EN + HI), every screen renders with the fake engine at 1.0× and 2.0× text scale.
- On-device tests read golden files from the app's external files dir; they never touch the user's real gallery items except outputs they created themselves, and they clean those up.
- Safety scripts (`tool/safety/`) must verify originals by **hash before and after**, not just existence.
- Keep each test independent; no shared mutable state between tests.
- If a test exposes a real bug, report it with the failing test name; don't weaken the test.
