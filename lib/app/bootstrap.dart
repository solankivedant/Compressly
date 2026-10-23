import 'package:flutter/widgets.dart';

import '../core/services/ads/fake_ad_service.dart';
import '../core/services/billing/fake_billing_service.dart';
import '../core/services/engine/fake_engine_service.dart';
import '../core/services/prefs/ui_prefs.dart';
import '../core/util/clock.dart';
import 'app.dart';
import 'app_scope.dart';
import 'router.dart';

/// Creates every service once. Only fakes exist so far; the native engine,
/// RevenueCat and AdMob replace them in their sessions (0.5, 3.4, 3.7).
Widget bootstrap() {
  final prefs = UiPrefs();
  return AppScope(
    engine: FakeEngineService(),
    billing: FakeBillingService(),
    ads: const FakeAdService(),
    prefs: prefs,
    router: AppRouter(prefs.onboarded ? AppScreen.home : AppScreen.welcome),
    clock: const Clock(),
    child: const CompresslyApp(),
  );
}
