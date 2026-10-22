---
paths:
  - "pigeons/**"
  - "lib/core/bridge/**"
  - "lib/core/services/engine/**"
  - "android/app/src/main/kotlin/**/bridge/**"
---

# Pigeon bridge rules

- `pigeons/engine_api.dart` is the source of truth. Generated files (`lib/core/bridge/engine_api.g.dart`, `bridge/EngineApi.g.kt`) are **never hand-edited**. Regenerate with `dart run pigeon --input pigeons/engine_api.dart`.
- The contract is documented in ARCHITECTURE.md §5. Update that table in the same commit as any API change.
- DTOs only: primitives, enums, lists, maps and Pigeon data classes. No platform types, no file paths, no display names in DTOs that might reach analytics.
- Host calls return fast. Anything slow (scan, encode, delete flow) runs in the engine scope and reports through `EngineEvents` or a completed future, never by blocking the platform thread.
- Errors cross as `FlutterError(code, message, details)` with codes from the fixed list: `permission_denied`, `no_space`, `busy`, `not_found`, `engine_disabled`, `internal`. Add a new code only with a doc update. Messages contain no media identifiers.
- Progress events are throttled to ≤ 4 per second per job.
- `FakeEngineService` must implement every new call with canned data in the same commit, so UI tests and `FAKE_SERVICES=true` runs keep working.
- Changing an existing call's shape: update Dart service, Kotlin impl, fake, and tests together. Use `/bridge-change`.
