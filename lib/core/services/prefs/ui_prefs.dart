import 'package:flutter/material.dart';

import '../../domain/photo_format.dart';
import '../../domain/preset.dart';

/// UI preferences. In memory for now: persisting them needs the
/// `shared_preferences` plugin. Settings the engine needs move behind
/// EngineService in session 2.11.
// TODO(2.11): persist with shared_preferences; move engine settings out.
class UiPrefs extends ChangeNotifier {
  UiPrefs({this.onboarded = false});

  ThemeMode themeMode = ThemeMode.dark;
  bool onboarded;
  Preset preset = Preset.balanced;
  PhotoFormat photoFormat = PhotoFormat.heic;
  bool onlyWhileCharging = true;
  int minBattery = 30;
  bool analytics = false;
  bool consentAsked = false;
  int holdDays = 14;
  bool autoCompress = false;
  String batteryBrand = 'samsung';

  /// Applies [change] and notifies listeners.
  void update(void Function(UiPrefs p) change) {
    change(this);
    notifyListeners();
  }
}
