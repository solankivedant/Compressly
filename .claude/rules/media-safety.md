---
paths:
  - "android/app/src/main/kotlin/**/scan/**"
  - "android/app/src/main/kotlin/**/encode/**"
  - "android/app/src/main/kotlin/**/quality/**"
  - "android/app/src/main/kotlin/**/library/**"
  - "android/app/src/main/kotlin/**/queue/**"
  - "android/app/src/main/kotlin/**/schedule/**"
  - "android/app/src/main/kotlin/**/data/**"
  - "lib/ui/screens/review*"
  - "lib/core/services/engine/**"
---

# Originals safety rules (RISK R1: non-negotiable)

Read ARCHITECTURE.md §6 (state machine) and §7 (safety design) before changing anything here.

## Originals
- Open originals with `contentResolver.openFileDescriptor(uri, "r")` / `openInputStream` only. **Never** `"w"`, `"rw"`, `"wt"`, `createWriteRequest` on an original, or `ExifInterface.saveAttributes()` on an original.
- The only delete path is `OriginalsRequester`: `MediaStore.createDeleteRequest()` (API 30+) or the `RecoverableSecurityException` flow (API 29). No `contentResolver.delete()` on an original, no `File.delete()` on media paths, no trash request without the user's tap.
- Before adding an item to a delete batch, re-check: job state is READY, the output URI exists, the output size matches `job.output_size`, and the output can be probed (dimensions and duration match the source). Drop the item on any failure. Never drop the check "for speed".
- Free space ≥ 1.2× source before ENCODING and re-checked before SAVING (NFR-07).

## State machine
- Persist the new state in Room **before** starting the side-effect it guards. Persist the next state only after the side-effect is confirmed.
- Every new state or transition gets: a JVM test, a row in the recovery table (ARCH §6), and a recovery test.
- One job at a time. No parallel encodes.

## Outputs
- Temp files only in `cacheDir/jobs/<jobId>/`. Delete them after the job and in startup recovery.
- MediaStore insert uses `IS_PENDING=1`, then copy, then metadata, then `IS_PENDING=0`, then re-read the row to confirm.
- Mark outputs with our marker so the scanner skips them (FR-36).

## Kill switches
- `engine_enabled` and `engine_delete_enabled` (Remote Config) must be checked at job start and when the Review screen builds.

## Before commit
- `/safety-test` green on at least one phone for any change in these paths. If no phone is connected, say so and **don't tick the session**.
- When in doubt, run the `media-safety-auditor` agent on the diff.
