import '../../domain/plan.dart';
import 'billing_service.dart';

class FakeBillingService extends BillingService {
  // ignore: prefer_initializing_formals
  FakeBillingService({bool pro = false}) : _pro = pro;

  bool _pro;

  static const _prices = {
    Plan.yearly: '₹399',
    Plan.monthly: '₹49',
    Plan.lifetime: '₹999',
  };

  @override
  bool get isPro => _pro;

  @override
  String price(Plan plan) => _prices[plan]!;

  @override
  String? monthlyEquivalent(Plan plan) => plan == Plan.yearly ? '₹33' : null;

  @override
  Future<bool> purchase(Plan plan) async {
    _pro = true;
    notifyListeners();
    return true;
  }

  @override
  Future<bool> restore() async => false;
}
