import 'package:compressly/app/app.dart';
import 'package:compressly/app/app_scope.dart';
import 'package:compressly/app/router.dart';
import 'package:compressly/core/services/ads/fake_ad_service.dart';
import 'package:compressly/core/services/billing/fake_billing_service.dart';
import 'package:compressly/core/services/engine/fake_engine_service.dart';
import 'package:compressly/core/services/prefs/ui_prefs.dart';
import 'package:compressly/core/util/clock.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<AppScope> _pump(
  WidgetTester t,
  AppScreen start, {
  ThemeMode theme = ThemeMode.dark,
  double textScale = 1,
}) async {
  t.view.physicalSize = const Size(412 * 2.625, 915 * 2.625);
  t.view.devicePixelRatio = 2.625;
  t.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(t.view.reset);
  addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
  final engine = FakeEngineService();
  final prefs = UiPrefs(onboarded: true)
    ..themeMode = theme
    ..consentAsked = true;
  final scope = AppScope(
    engine: engine,
    billing: FakeBillingService(),
    ads: const FakeAdService(),
    prefs: prefs,
    router: AppRouter(start),
    clock: const Clock(),
    child: const CompresslyApp(),
  );
  await t.pumpWidget(scope);
  await t.pump(const Duration(milliseconds: 300));
  return scope;
}

/// Screens that need an argument or engine state get it here.
Future<void> _goTo(WidgetTester t, AppScope s, AppScreen screen) async {
  if (screen == AppScreen.queue || screen == AppScreen.review) {
    s.engine.startQueue(s.engine.items.where((x) => !x.done).take(3).toList());
  }
  final arg = switch (screen) {
    AppScreen.detail => 1,
    AppScreen.review => false,
    _ => null,
  };
  s.router.reset(screen, arg: arg);
  await t.pump(const Duration(milliseconds: 300));
}

void main() {
  for (final theme in [ThemeMode.dark, ThemeMode.light]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'NFR-10 every screen renders (${theme.name}, ${scale}x text)',
        (t) async {
          final s = await _pump(
            t,
            AppScreen.home,
            theme: theme,
            textScale: scale,
          );
          for (final screen in AppScreen.values) {
            await _goTo(t, s, screen);
            expect(t.takeException(), isNull, reason: '${screen.name} threw');
          }
          // Let fake timers finish so the test ends cleanly.
          s.router.reset(AppScreen.home);
          await t.pump(const Duration(seconds: 10));
          s.engine.dispose();
        },
      );
    }
  }

  testWidgets('first run walks Welcome → Permission → Scan → Savings result', (
    t,
  ) async {
    final s = await _pump(t, AppScreen.welcome);
    await t.tap(find.text('Next'));
    await t.pump(const Duration(milliseconds: 300));
    await t.tap(find.text('Next'));
    await t.pump(const Duration(milliseconds: 300));
    await t.tap(find.text('Get started'));
    await t.pump(const Duration(milliseconds: 300));
    expect(
      find.text('Let Compressly see your photos and videos'),
      findsOneWidget,
    );
    await t.tap(find.text('Continue'));
    await t.pump(const Duration(milliseconds: 300));
    expect(find.text('Looking through your gallery'), findsOneWidget);
    await t.pump(const Duration(seconds: 2));
    await t.pump(const Duration(milliseconds: 500));
    expect(find.text('You can free up'), findsOneWidget);
    expect(s.prefs.onboarded, isTrue);
  });

  testWidgets('compress → queue → review → remove originals frees space', (
    t,
  ) async {
    final s = await _pump(t, AppScreen.compress);
    final before = s.engine.freedGb;
    await t.tap(find.textContaining('Compress 5 files'));
    await t.pump(const Duration(milliseconds: 300));
    expect(s.router.current.screen, AppScreen.queue);
    await t.pump(const Duration(seconds: 20));
    await t.pump(const Duration(milliseconds: 700));
    expect(s.router.current.screen, AppScreen.review);
    await t.tap(find.text('Remove originals'));
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(InkWell, 'Remove originals').last);
    await t.pump(const Duration(milliseconds: 300));
    expect(s.router.current.screen, AppScreen.home);
    expect(s.engine.freedGb, greaterThan(before));
    await t.pump(const Duration(seconds: 3));
  });
}
