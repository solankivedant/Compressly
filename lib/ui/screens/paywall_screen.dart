import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/router.dart';
import '../../app/theme.dart';
import '../../core/domain/byte_format.dart';
import '../../core/domain/plan.dart';
import '../widgets/button.dart';
import '../widgets/layout.dart';
import '../widgets/overlays.dart';

/// Pro upsell (FR-40). "Not now" is always visible; yearly is pre-selected.
class PaywallScreen extends StatefulWidget {
  const PaywallScreen({super.key});

  @override
  State<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends State<PaywallScreen> {
  Plan _plan = Plan.yearly;

  void _close() {
    final r = AppScope.of(context).router;
    if (!r.back()) r.reset(AppScreen.home);
  }

  String _terms(AppScope s) {
    final p = s.billing.price(_plan);
    return switch (_plan) {
      Plan.lifetime =>
        '$p once. No renewal. Restore on any phone signed in to the same Google account.',
      Plan.yearly =>
        '$p per year. Renews automatically until you cancel. Cancel anytime in Google Play → Subscriptions.',
      Plan.monthly =>
        '$p per month. Renews automatically until you cancel. Cancel anytime in Google Play → Subscriptions.',
    };
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = AppScope.of(context);
    final limit = s.engine.allowanceLimitGb;
    final usedUp = s.engine.allowanceUsedGb >= limit;
    final perks = [
      (Icons.all_inclusive_rounded, 'Unlimited savings'),
      (Icons.bolt_rounded, 'Auto-compress while charging'),
      (Icons.tune_rounded, 'High and Max savings presets'),
      (Icons.block_rounded, 'No ads'),
    ];
    final monthly = s.billing.monthlyEquivalent(Plan.yearly);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ScreenHeader(
          actions: [
            HeaderIconButton(
              Icons.close_rounded,
              label: 'Close',
              onTap: _close,
            ),
          ],
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              Text(
                usedUp
                    ? 'You’ve used this month’s free ${formatGb(limit).replaceAll('.0 ', ' ')}'
                    : 'Free up as much as you like',
                style: AppText.style(
                  28,
                  weight: FontWeight.w800,
                  color: c.textPrimary,
                  height: 34,
                  spacing: -0.02,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Go Pro to keep freeing space.',
                style: AppText.style(16, color: c.textMuted),
              ),
              const SizedBox(height: 16),
              for (final (icon, t) in perks)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      IconTile(
                        icon,
                        bg: c.accent,
                        fg: c.onAccent,
                        size: 32,
                        iconSize: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          t,
                          style: AppText.style(15, color: c.textPrimary),
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 20),
              PlanCard(
                name: 'Yearly',
                price: s.billing.price(Plan.yearly),
                period: 'per year',
                note: monthly == null ? null : '$monthly a month',
                badge: 'Best value',
                selected: _plan == Plan.yearly,
                onSelect: () => setState(() => _plan = Plan.yearly),
              ),
              const SizedBox(height: 12),
              PlanCard(
                name: 'Monthly',
                price: s.billing.price(Plan.monthly),
                period: 'per month',
                selected: _plan == Plan.monthly,
                onSelect: () => setState(() => _plan = Plan.monthly),
              ),
              const SizedBox(height: 12),
              PlanCard(
                name: 'Lifetime',
                price: s.billing.price(Plan.lifetime),
                period: 'one time',
                selected: _plan == Plan.lifetime,
                onSelect: () => setState(() => _plan = Plan.lifetime),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Text(
                  _terms(s),
                  style: AppText.style(12, color: c.textMuted, height: 16),
                ),
              ),
            ],
          ),
        ),
        StickyFooter(
          children: [
            CButton(
              'Continue',
              size: ButtonSize.lg,
              fullWidth: true,
              onPressed: () async {
                final ok = await s.billing.purchase(_plan);
                if (!ok || !context.mounted) return;
                s.prefs.update((p) => p.autoCompress = true);
                _close();
                showToast(context, 'You’re on Pro. Auto-compress is on.');
              },
            ),
            Row(
              children: [
                Expanded(
                  child: CButton(
                    'Watch an ad for +${formatGb(s.ads.rewardGb)}',
                    variant: ButtonVariant.secondary,
                    icon: Icons.play_circle_rounded,
                    onPressed: () async {
                      final ok = await s.ads.showRewarded();
                      if (!ok || !context.mounted) return;
                      s.engine.addAllowance(s.ads.rewardGb);
                      _close();
                      showToast(
                        context,
                        '+${formatGb(s.ads.rewardGb)} added for this month',
                      );
                    },
                  ),
                ),
                const SizedBox(width: 8),
                CButton(
                  'Not now',
                  variant: ButtonVariant.text,
                  onPressed: _close,
                ),
              ],
            ),
            Center(
              child: CButton(
                'Restore purchase',
                variant: ButtonVariant.text,
                size: ButtonSize.sm,
                onPressed: () async {
                  final ok = await s.billing.restore();
                  if (!context.mounted) return;
                  showToast(
                    context,
                    ok
                        ? 'Purchase restored'
                        : 'No purchase found on this Google account',
                  );
                },
              ),
            ),
          ],
        ),
      ],
    );
  }
}
