import 'package:flutter/foundation.dart';

enum AppScreen {
  welcome,
  permission,
  denied,
  scan,
  result,
  home,
  compress,
  queue,
  review,
  paywall,
  media,
  detail,
  history,
  settings,
  battery,
}

enum NavTab { home, compress, media, settings }

typedef AppRoute = ({AppScreen screen, Object? arg});

/// Which bottom-nav tab a screen belongs to; screens without a tab hide the
/// bottom nav (first run, paywall).
NavTab? tabOf(AppScreen s) => switch (s) {
  AppScreen.home || AppScreen.history => NavTab.home,
  AppScreen.compress || AppScreen.queue || AppScreen.review => NavTab.compress,
  AppScreen.media || AppScreen.detail => NavTab.media,
  AppScreen.settings || AppScreen.battery => NavTab.settings,
  _ => null,
};

AppScreen rootOf(NavTab t) => switch (t) {
  NavTab.home => AppScreen.home,
  NavTab.compress => AppScreen.compress,
  NavTab.media => AppScreen.media,
  NavTab.settings => AppScreen.settings,
};

/// A small stack router. Tab roots reset the stack; everything else pushes,
/// so Android back walks the stack and exits from a tab root.
class AppRouter extends ChangeNotifier {
  AppRouter(AppScreen initial) : _stack = [(screen: initial, arg: null)];

  List<AppRoute> _stack;

  AppRoute get current => _stack.last;
  bool get canPop => _stack.length > 1;

  void go(AppScreen screen, {Object? arg}) {
    final route = (screen: screen, arg: arg);
    final isRoot = NavTab.values.any((t) => rootOf(t) == screen);
    _stack = isRoot ? [route] : [..._stack, route];
    notifyListeners();
  }

  /// Swaps the top screen, e.g. Queue → Review when compression finishes.
  void replace(AppScreen screen, {Object? arg}) {
    _stack = [
      ..._stack.sublist(0, _stack.length - 1),
      (screen: screen, arg: arg),
    ];
    notifyListeners();
  }

  void reset(AppScreen screen, {Object? arg}) {
    _stack = [(screen: screen, arg: arg)];
    notifyListeners();
  }

  /// Pops one screen; false when already at the bottom of the stack.
  bool back() {
    if (!canPop) return false;
    _stack = _stack.sublist(0, _stack.length - 1);
    notifyListeners();
    return true;
  }
}
