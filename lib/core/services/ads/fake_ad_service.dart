import 'ad_service.dart';

class FakeAdService implements AdService {
  const FakeAdService();

  // Mirrors the bundled tunable; the real value comes from Remote Config.
  @override
  double get rewardGb => 0.2;

  @override
  Future<bool> showRewarded() async => true;
}
