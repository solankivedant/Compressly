import 'package:compressly/app/router.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('tab roots reset the stack, other screens push', () {
    final r = AppRouter(AppScreen.home)..go(AppScreen.history);
    expect(r.canPop, isTrue);
    r.go(AppScreen.media);
    expect(r.canPop, isFalse);
    expect(r.current.screen, AppScreen.media);
  });

  test('back pops until the bottom of the stack', () {
    final r = AppRouter(AppScreen.compress)..go(AppScreen.queue);
    expect(r.back(), isTrue);
    expect(r.current.screen, AppScreen.compress);
    expect(r.back(), isFalse);
  });

  test('replace swaps only the top screen', () {
    final r = AppRouter(AppScreen.compress)
      ..go(AppScreen.queue)
      ..replace(AppScreen.review, arg: false);
    expect(r.current.screen, AppScreen.review);
    r.back();
    expect(r.current.screen, AppScreen.compress);
  });

  test('first-run and paywall screens hide the bottom nav', () {
    for (final s in [
      AppScreen.welcome,
      AppScreen.scan,
      AppScreen.result,
      AppScreen.paywall,
    ]) {
      expect(tabOf(s), isNull, reason: s.name);
    }
    expect(tabOf(AppScreen.detail), NavTab.media);
  });
}
