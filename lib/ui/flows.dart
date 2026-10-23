import '../app/app_scope.dart';
import '../app/router.dart';
import '../core/domain/media_item.dart';
import '../core/domain/paywall_policy.dart';

/// Starts compressing [files], or shows the paywall when the free allowance
/// is used up.
void compressNow(AppScope s, List<MediaItem> files) {
  if (files.isEmpty) return;
  if (shouldShowPaywall(
    isPro: s.billing.isPro,
    usedGb: s.engine.allowanceUsedGb,
    limitGb: s.engine.allowanceLimitGb,
  )) {
    s.router.go(AppScreen.paywall);
    return;
  }
  s.engine.startQueue(files);
  s.router.go(AppScreen.queue);
}
