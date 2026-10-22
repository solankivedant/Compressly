---
name: bridge-change
description: Add or change a call or DTO in Compressly's Pigeon bridge between Flutter and the Kotlin engine, updating the definition, generated code, Kotlin implementation, Dart service, fake service, tests and ARCHITECTURE §5 together. Use whenever a feature needs the UI to ask the engine something new, or the engine to report something new.
argument-hint: "<call name and purpose>"
---

# Change the Pigeon bridge

Input: `$ARGUMENTS`, the call (host or flutter API) and what it's for.

1. Read `.claude/rules/pigeon-bridge.md` and ARCHITECTURE §5. Check that an existing call can't do the job first.
2. Design the call: name, direction, parameters, return DTO, error codes. DTOs contain no file paths or display names. Slow work returns via events or a completed future.
3. Edit `pigeons/engine_api.dart`, then run `dart run pigeon --input pigeons/engine_api.dart`.
4. Implement in the same commit:
   - Kotlin: `bridge/EngineApiImpl.kt` delegating to an engine class (logic stays out of the bridge)
   - Dart: `EngineService` interface + `NativeEngineService`
   - `FakeEngineService` with canned data
   - Tests: Kotlin unit test for the engine logic, Dart test using the fake
5. Update the ARCHITECTURE §5 table.
6. Run analyze, Dart tests and Kotlin tests. Then do a quick `flutter run` on the phone to confirm the call works end to end (codec/channel mismatches only show up at runtime).
