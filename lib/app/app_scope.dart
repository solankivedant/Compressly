import 'package:flutter/widgets.dart';

import '../core/services/ads/ad_service.dart';
import '../core/services/billing/billing_service.dart';
import '../core/services/engine/engine_service.dart';
import '../core/services/prefs/ui_prefs.dart';
import '../core/util/clock.dart';
import 'router.dart';

/// Services created once in [bootstrap] and shared with every widget.
class AppScope extends InheritedWidget {
  const AppScope({
    super.key,
    required this.engine,
    required this.billing,
    required this.ads,
    required this.prefs,
    required this.router,
    required this.clock,
    required super.child,
  });

  final EngineService engine;
  final BillingService billing;
  final AdService ads;
  final UiPrefs prefs;
  final AppRouter router;
  final Clock clock;

  static AppScope of(BuildContext context) =>
      context.getInheritedWidgetOfExactType<AppScope>()!;

  // Services never change identity; widgets listen to them directly.
  @override
  bool updateShouldNotify(AppScope oldWidget) => false;
}
