---
name: device-test
description: Build and install Compressly on Vedant's connected Android phone (or run the UI with fake services on Windows if none is connected) and hand over a focused phone checklist for the feature just built. Use after finishing a feature, or when Vedant says "put it on my phone", "let me test" or "run it".
argument-hint: "[release]"
---

# Phone test build

1. Run `flutter analyze`, `flutter test` and `cd android && ./gradlew :app:testDebugUnitTest`. Stop and fix anything that fails first.
2. Run `flutter devices`.
   - Android phone connected: `flutter run -d <id>` (debug). If `$ARGUMENTS` is `release`, use `flutter run --release -d <id>`; only release timing is meaningful for encode speed (NFR-04).
   - No phone: say so, and offer `flutter run -d windows --dart-define=FAKE_SERVICES=true` for a UI-only look (no real scan, encode, billing or ads).
3. If the feature needs media, tell Vedant which golden files to use, or what to record ("record a 30 s 4K video in the stock camera first").
4. Give Vedant **4–8 concrete checks** for the feature, each with what "good" looks like. For example: "Compress the 1-minute 4K clip. It should finish in under 2 minutes, show 'Looks identical', and in Google Photos the new copy should sit at the same date as the original."
5. Always add the standing checks:
   - Is the original still in the gallery and still plays, until you approve deletion?
   - Does the compressed copy show the same date (and location, if it had one) in Google Photos?
   - Did the phone get hot? (Queue screen temperature chip.)
   - Any text cut off or untranslated (switch to Hindi once a week)?
6. Ask for feedback in Vedant's own words, then turn each comment into a concrete change ("looks a bit soft" → raise Balanced 4K30 from 28 to 32 Mbps via `/tune-preset`).
