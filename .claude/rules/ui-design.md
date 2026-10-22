---
paths:
  - "lib/ui/**"
  - "lib/app/theme.dart"
  - "lib/l10n/**"
  - "docs/DESIGN.md"
---

# UI, copy & localisation rules

## Tone (DESIGN §1, §4)
- Calm and trustworthy. Not a "phone booster". No fake urgency, countdowns, scare copy, red warnings or "Your phone is in danger!".
- Plain words on main screens. "HEVC", "SSIM", "bitrate" only in File detail and Settings → Advanced.
- Never call pending savings "freed". Freed = original deleted (FR-28).
- "Processed on your phone" trust badge on every result.

## Visual
- Colours, radii, spacing and type only from `app/theme.dart` tokens (DESIGN §8). Green only for confirmed savings; amber for warnings.
- Light and dark themes both checked for every new screen.
- Noto Sans; display numbers use tabular figures.
- Motion: count-up ≤ 1.2 s, transitions 200–250 ms; honour `MediaQuery.disableAnimations`.

## Localisation
- Every string in `lib/l10n/app_en.arb` with a description; add the same key to `app_hi.arb` (mark `"x-needs-review": true` until the Hindi reviewer signs off).
- Use ICU plurals and placeholders; never concatenate translated fragments.
- Format sizes and numbers with `byte_format.dart` + locale, never by hand.

## Accessibility
- 48×48 dp touch targets; `Semantics` on the ring, numbers and icon buttons.
- Contrast ≥ 4.5:1. Never rely on colour alone.
- Check at 200% text scale.

## Paywall
- Follow `.claude/rules/monetization.md`. No dark patterns: "Not now" is always visible; no pre-ticked plans other than the highlighted yearly.
