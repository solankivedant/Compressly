---
paths:
  - "lib/**/*.dart"
  - "test/**/*.dart"
  - "tool/**/*.dart"
  - "integration_test/**/*.dart"
---

# Dart & Flutter code rules

## Structure
- Follow the folder layout in `docs/ARCHITECTURE.md` §3. New top-level folders need a doc update first.
- Imports: `ui/` → `core/services` interfaces + `core/domain` + `app/theme.dart` · `core/services/` → SDKs + generated bridge + domain · `core/domain/` → Dart SDK only.
- `ui/` never imports `core/bridge/*.g.dart`, `purchases_flutter`, `google_mobile_ads` or `firebase_*` directly.
- One public class per file in `core/services/` and `core/domain/`.

## State
- No state-management packages. Services extend `ChangeNotifier`; widgets use `ListenableBuilder` / `ValueListenableBuilder`.
- Services are created once in `bootstrap.dart` and reached through `AppScope.of(context)`. Never create a service inside a widget.
- Flutter holds no authoritative engine state. Re-read from `EngineService` on resume; events only refresh.

## Style
- `final` by default; `const` constructors and widgets wherever possible.
- Sealed classes + `switch` patterns for results (`EnqueueResult`, `PurchaseResult`, `RewardResult`).
- No `print`. Use `log()` from `core/util/logger.dart`. Never log file names, paths or URIs.
- No `DateTime.now()` in logic. Inject `Clock`.
- Every `async` SDK call handles failure; ads, billing or Firebase errors never block scanning, compression or navigation.
- Don't leave `// TODO` without a session id, e.g. `// TODO(3.7): daily ad cap`.

## Widgets
- Screens are `StatelessWidget` where possible; keep build methods under ~80 lines by extracting widgets.
- Theme tokens from `app/theme.dart` (DESIGN.md §8). No hard-coded colours, radii or text styles in screens.
- Every user-visible string comes from `AppLocalizations` (ARB). No string literals in widgets.
- Min touch target 48×48 dp; `Semantics` labels on icons, the storage ring and numbers.
- Must render at 200% text scale without clipping.

## Formatting
- `dart format .` before commit. Default line length (80).
