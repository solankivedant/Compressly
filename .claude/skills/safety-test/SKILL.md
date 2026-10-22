---
name: safety-test
description: Run Compressly's originals-safety suite on a connected phone. It interrupts jobs (kill mid-encode, kill mid-save, reboot, storage full, low battery, permission revoked, FGS timeout) and verifies by hash that every original is intact and recovery works. Required before committing any change to the engine's scan/encode/quality/library/queue/schedule/data code, and at the Beta and Launch gates.
argument-hint: "[quick|full]"
---

# Safety suite (RISK R1)

`quick` (default) runs scenarios 1–4 on one phone. `full` runs all scenarios, and at gates it must run on every available test phone.

1. Pre-checks: `flutter analyze`, Dart tests, Kotlin JVM tests green. `adb devices` shows a phone. If no phone is connected, **stop and say the session can't be ticked**.
2. Install a debug build. Push the safety fixtures (5 golden files: 4K H.264 1 min, 1080p 10 min, HDR clip, portrait 60 fps, 20 MB JPEG) into a dedicated album `CompresslySafety/` with `tool/safety/push_fixtures.sh`.
3. Record SHA-256 of every fixture (`tool/safety/hash_originals.sh > before.txt`).
4. Run the scenarios with the scripts in `tool/safety/` (create any that are missing, following the existing ones' style):
   1. **Kill mid-encode:** start job, `am force-stop` at ~40%, relaunch → job back in QUEUED, temp file gone, completes on retry.
   2. **Kill mid-save:** force-stop while state is SAVING → no half-written gallery item; recovery re-saves once.
   3. **Reboot mid-job:** `adb reboot` at ~50% → after boot, recovery runs on next start; no orphans.
   4. **Delete batch integrity:** tamper with one READY output (truncate it with the test helper) → that item is dropped from the delete batch.
   5. **Storage full:** `tool/safety/fill_storage.sh` to leave < 1.2× → job refuses to start with `no_space`.
   6. **Low battery / not charging (auto mode):** `adb shell dumpsys battery set level 15` / `unplug` → queue waits; `dumpsys battery reset` after.
   7. **Permission revoked mid-queue:** `pm revoke` media permission → job stops cleanly, plain-words message.
   8. **FGS timeout (API 35+):** trigger `onTimeout` via the debug hook → checkpoint, stop, resume later.
   9. **Kill switch:** set `engine_delete_enabled=false` in local RC override → Remove originals disabled.
5. Hash again (`after.txt`) and diff. **Every original must be byte-identical** unless the user approved its deletion in the scenario.
6. Check for orphans: no files left in `cacheDir/jobs/`, no `IS_PENDING=1` rows from our package.
7. Report a table: scenario · phone · result ✅/🔴 · notes. Any 🔴 blocks the commit. Report it to Vedant with the logcat excerpt (redacted) and the fix plan.
8. Clean up: remove fixtures and outputs created by the test, `dumpsys battery reset`, free the filler file.

Append a line to `docs/PROJECT_PLAN.md` §7 when run at a gate.
