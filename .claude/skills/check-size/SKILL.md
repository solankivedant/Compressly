---
name: check-size
description: Measure Compressly's Android release download size against the budget (target ≤ 21 MB arm64, warn > 22 MB, fail > 25 MB; install < 30 MB) and break it down by group (Flutter, native engine, Firebase, AdMob, RevenueCat, fonts, images). Use after adding any package or native library, weekly, and before any release.
---

# Size check

1. Build: `flutter build apk --release --split-per-abi --target-platform android-arm64 --analyze-size`.
2. Run `dart run tool/check_size.dart` (reads the arm64 APK). If the script doesn't exist yet, report the APK size from `build/app/outputs/flutter-apk/` and note that session 0.4 is pending.
3. Break the size down using the `--analyze-size` output and the APK contents (`lib/arm64-v8a/*.so`, `classes*.dex`, `assets/flutter_assets`): Flutter engine + Dart, native .so (libjpeg-turbo), dex by SDK (Media3, Firebase, AdMob, RevenueCat), fonts, images.
4. Compare with the budget table in `docs/BUDGET_AND_RESOURCES.md` §5.5 and the last recorded size in `docs/PROJECT_PLAN.md` §7.
5. Report:
   - Total MB and status: ✅ ≤ 21 · ⚠️ 21–22 · 🟠 22–25 · 🔴 > 25
   - The biggest 5 groups
   - Change since last check
   - If over target: the 3 cheapest savings (e.g. "subset Noto Sans Devanagari saves ~0.6 MB")
6. Before a release, also ask Vedant to read the installed size on the phone (Settings → Apps → Compressly → Storage): must be < 30 MB (NFR-09).
7. Add a line to the PROJECT_PLAN.md status log with the date and size.
