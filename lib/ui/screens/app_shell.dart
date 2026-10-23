import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/router.dart';
import '../../app/theme.dart';
import '../widgets/overlays.dart';
import 'battery_guide_screen.dart';
import 'compress_screen.dart';
import 'file_detail_screen.dart';
import 'history_screen.dart';
import 'home_screen.dart';
import 'media_screen.dart';
import 'onboarding_screens.dart';
import 'paywall_screen.dart';
import 'queue_screen.dart';
import 'review_screen.dart';
import 'savings_result_screen.dart';
import 'scan_screen.dart';
import 'settings_screen.dart';

const _nav = <NavItem>[
  (
    id: NavTab.home,
    label: 'Home',
    icon: Icons.home_outlined,
    activeIcon: Icons.home_rounded,
  ),
  (
    id: NavTab.compress,
    label: 'Compress',
    icon: Icons.compress_rounded,
    activeIcon: Icons.compress_rounded,
  ),
  (
    id: NavTab.media,
    label: 'Media',
    icon: Icons.photo_library_outlined,
    activeIcon: Icons.photo_library_rounded,
  ),
  (
    id: NavTab.settings,
    label: 'Settings',
    icon: Icons.settings_outlined,
    activeIcon: Icons.settings_rounded,
  ),
];

/// Hosts the current screen and the bottom nav; maps Android back to the
/// router stack.
class AppShell extends StatelessWidget {
  const AppShell({super.key});

  @override
  Widget build(BuildContext context) {
    final router = AppScope.of(context).router;
    return ListenableBuilder(
      listenable: router,
      builder: (context, _) {
        final route = router.current;
        final tab = tabOf(route.screen);
        return PopScope(
          canPop: !router.canPop,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) router.back();
          },
          child: Scaffold(
            backgroundColor: context.c.background,
            body: SafeArea(
              bottom: tab == null,
              child: AnimatedSwitcher(
                duration: Motion.of(context, Motion.screen),
                switchInCurve: Motion.standard,
                child: KeyedSubtree(
                  key: ValueKey(route),
                  child: _screenFor(route),
                ),
              ),
            ),
            bottomNavigationBar: tab == null
                ? null
                : BottomNav(
                    items: _nav,
                    value: tab,
                    onChanged: (t) => router.go(rootOf(t)),
                  ),
          ),
        );
      },
    );
  }

  Widget _screenFor(AppRoute r) => switch (r.screen) {
    AppScreen.welcome => const WelcomeScreen(),
    AppScreen.permission => const PermissionScreen(),
    AppScreen.denied => const PermissionDeniedScreen(),
    AppScreen.scan => const ScanScreen(),
    AppScreen.result => const SavingsResultScreen(),
    AppScreen.home => const HomeScreen(),
    AppScreen.compress => const CompressScreen(),
    AppScreen.queue => const QueueScreen(),
    AppScreen.review => ReviewScreen(fromPending: r.arg == true),
    AppScreen.paywall => const PaywallScreen(),
    AppScreen.media => const MediaScreen(),
    AppScreen.detail => FileDetailScreen(itemId: r.arg! as int),
    AppScreen.history => const HistoryScreen(),
    AppScreen.settings => const SettingsScreen(),
    AppScreen.battery => const BatteryGuideScreen(),
  };
}
