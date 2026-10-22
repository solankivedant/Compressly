---
name: quality-check
description: Run Compressly's golden-set quality and metadata regression on a connected phone. It encodes the golden files with each preset and reports SSIM, PSNR, saving %, encode time, and resolution/fps/duration/metadata pass-fail per file against NFR-03 and the presets in DESIGN §5. Use after any change to encoding, presets, the quality gate or the metadata copier, at the Engine gate, and before releases.
argument-hint: "[preset: high|balanced|max|all] [subset: quick|full]"
---

# Golden-set quality check

1. Make sure a phone is connected and the golden files are in `Android/data/com.connectedinteractive.compressly/files/golden/` (list in `docs/golden_set.md`). `quick` = the 30-file v0 subset; `full` = all 200.
2. Run the on-device runner:
   `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.connectedinteractive.compressly.golden.GoldenSetTest -Pandroid.testInstrumentationRunnerArguments.preset=<preset>`
3. Pull and summarise: `dart run tool/golden_report.dart` (pulls the CSV and prints per-preset tables).
4. Compare with the previous report in `docs/PROJECT_PLAN.md` §7 (or the last saved CSV under `build/golden/`).
5. Report:
   - Per preset: mean SSIM, min SSIM, median saving %, median encode time per minute of 4K30, rejections ("not worth it") count
   - **Hard fails** (any one blocks commit): resolution/fps/duration/rotation mismatch; metadata (date, GPS, orientation) mismatch; Balanced mean SSIM < 0.95; an output > 90% of original that was accepted
   - Regressions vs last run (SSIM down > 0.005 or saving down > 3 points)
   - Device and chipset, encoder used (HEVC/H.264 fallback)
6. If quality is low on one device or chipset only, suggest a deny-list entry instead of lowering presets for everyone.
7. At the Engine gate, add the summary to PROJECT_PLAN §7.
