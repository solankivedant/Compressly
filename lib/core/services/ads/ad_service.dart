/// Rewarded ads (AdMob + UMP in session 3.7).
abstract class AdService {
  /// Extra free allowance one rewarded ad grants this month.
  double get rewardGb;

  /// Shows a rewarded ad; true only when the reward callback fired.
  Future<bool> showRewarded();
}
