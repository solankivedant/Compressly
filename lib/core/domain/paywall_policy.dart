/// Free users who have used this month's allowance see the paywall before
/// any new compression starts (FR-26).
bool shouldShowPaywall({
  required bool isPro,
  required double usedGb,
  required double limitGb,
}) => !isPro && usedGb >= limitGb;
