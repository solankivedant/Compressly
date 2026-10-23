import 'package:flutter/foundation.dart';

import '../../domain/plan.dart';

/// Pro entitlement and store prices. Backed by RevenueCat in session 3.4.
abstract class BillingService extends ChangeNotifier {
  bool get isPro;

  /// Localised store price, e.g. "₹399". Never hard-coded in screens.
  String price(Plan plan);

  /// Per-month equivalent for long plans, e.g. "₹33"; null when not useful.
  String? monthlyEquivalent(Plan plan);
  Future<bool> purchase(Plan plan);
  Future<bool> restore();
}
