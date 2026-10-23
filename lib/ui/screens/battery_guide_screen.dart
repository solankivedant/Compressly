import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../widgets/button.dart';
import '../widgets/controls.dart';
import '../widgets/layout.dart';
import '../widgets/overlays.dart';

const _steps = {
  'samsung': [
    ('Open Settings → Battery', 'Battery settings'),
    ('Tap Background usage limits', 'Usage limits list'),
    ('Add Compressly to Never auto sleeping apps', 'App picker'),
  ],
  'xiaomi': [
    ('Open Settings → Apps → Manage apps', 'App list'),
    ('Find Compressly → Battery saver', 'App info'),
    ('Choose No restrictions', 'Battery saver options'),
  ],
  'oneplus': [
    ('Open Settings → Battery → Battery optimisation', 'Optimisation list'),
    ('Find Compressly', 'App row'),
    ("Choose Don't optimise", 'Optimise dialog'),
  ],
  'other': [
    ('Open Settings → Apps → Compressly', 'App info'),
    ('Tap Battery', 'Battery usage'),
    ('Choose Unrestricted', 'Battery options'),
  ],
};

/// OEM steps that stop the phone killing overnight work (FR-30).
class BatteryGuideScreen extends StatelessWidget {
  const BatteryGuideScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = AppScope.of(context);
    return ListenableBuilder(
      listenable: s.prefs,
      builder: (context, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(title: 'Battery guide', onBack: s.router.back),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                Text(
                  'Some phones stop apps running in the background. These steps let Compressly finish overnight.',
                  style: AppText.style(16, color: c.textMuted, height: 24),
                ),
                const SizedBox(height: 16),
                SegmentedControl<String>(
                  small: true,
                  options: [
                    seg('samsung', 'Samsung'),
                    seg('xiaomi', 'Xiaomi'),
                    seg('oneplus', 'OnePlus'),
                    seg('other', 'Other'),
                  ],
                  value: s.prefs.batteryBrand,
                  onChanged: (v) => s.prefs.update((p) => p.batteryBrand = v),
                ),
                for (final (i, (t, shot))
                    in _steps[s.prefs.batteryBrand]!.indexed) ...[
                  const SizedBox(height: 16),
                  CardBox(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: c.primary,
                                shape: BoxShape.circle,
                              ),
                              child: Text(
                                '${i + 1}',
                                style: AppText.style(
                                  13,
                                  weight: FontWeight.w700,
                                  color: c.onPrimary,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                t,
                                style: AppText.style(
                                  15,
                                  weight: FontWeight.w600,
                                  color: c.textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // TODO(3.3): real screenshots per brand.
                        SizedBox(
                          height: 120,
                          child: DashedOutline(
                            color: c.borderDefault,
                            radius: 12,
                            strokeWidth: 1.5,
                            child: Center(
                              child: Text(
                                'screenshot · $shot',
                                style: AppText.style(
                                  12,
                                  color: c.textMuted,
                                ).copyWith(fontFamily: 'monospace'),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          StickyFooter(
            children: [
              CButton(
                'Open battery settings',
                icon: Icons.open_in_new_rounded,
                size: ButtonSize.lg,
                fullWidth: true,
                onPressed: () => showToast(
                  context,
                  'Opens Android battery settings on a real phone',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
