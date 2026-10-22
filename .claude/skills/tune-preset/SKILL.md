---
name: tune-preset
description: Change a Compressly compression preset (video bitrate per resolution/fps, SSIM threshold, photo quality) or the device/chipset deny list, keeping DESIGN §5, the bundled Remote Config defaults, PresetResolver tests and the golden results consistent. Use when Vedant says a preset looks soft or saves too little, when a device misbehaves, or after a golden run suggests new values.
argument-hint: "<what to change, e.g. 'balanced 4K30 28→32 Mbps' or 'deny hevc on <model>'>"
---

# Tune a preset or the deny list

Input: `$ARGUMENTS`, the change in plain words.

1. Read DESIGN §5 (current table and rules) and ARCHITECTURE §9 (Remote Config keys).
2. Turn the request into exact values. Show the before → after table. If Vedant gave a feeling ("too soft"), propose a step: bitrate +15% or threshold +0.01, never more than +30% at once.
3. Check the ordering rules still hold: High > Balanced > Max savings for every row; thresholds 0.97 / 0.95 / 0.92 or stricter; 60%-of-source cap still applies.
4. Update, in one commit:
   - `docs/DESIGN.md` §5 table
   - The bundled Remote Config default (`preset_video_table` / `preset_ssim_thresholds` / `engine_device_denylist`)
   - `PresetResolver` tests (expected values)
5. Run Kotlin unit tests, then `/quality-check balanced quick` (or the changed preset) on the phone, and show the saving vs SSIM trade-off before → after.
6. Say whether the change needs an app release or can ship as a Remote Config update only (live users: Remote Config, activated on next launch).
7. Deny-list changes: name the brand/model/chipset precisely (from `adb shell getprop ro.product.model` / `ro.soc.model`), choose `hevc_off` (fallback to H.264) or `engine_off`, and note the evidence in RISK_REGISTER R4.
