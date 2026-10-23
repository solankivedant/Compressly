import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/router.dart';
import '../../app/theme.dart';
import '../widgets/button.dart';
import '../widgets/layout.dart';
import '../widgets/status_chip.dart';
import '../widgets/thumb.dart';

typedef _Page = ({String title, String body});

const _pages = <_Page>[
  (
    title: 'Same resolution, half the space',
    body: 'Your 4K stays 4K. Frame rate, length and orientation never change. Files just take up less room.',
  ),
  (
    title: 'Stays on your phone',
    body: 'Nothing is uploaded. No account, no cloud. Every file is processed right here, on your phone.',
  ),
  (
    title: 'You approve every deletion',
    body: "Originals go only after a quality check and your tap on Android's dialog.",
  ),
];

/// First-run carousel (DESIGN §2).
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  int _i = 0;

  void _next() {
    if (_i < _pages.length - 1) {
      setState(() => _i++);
    } else {
      AppScope.of(context).router.go(AppScreen.permission);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final router = AppScope.of(context).router;
    final glow = [c.primary, c.tertiary, c.success][_i];
    final page = _pages[_i];
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(
                  'Compressly',
                  overflow: TextOverflow.ellipsis,
                  style: AppText.style(
                    18,
                    weight: FontWeight.w800,
                    color: c.textPrimary,
                    spacing: -0.02,
                  ),
                ),
              ),
              CButton(
                'Skip',
                variant: ButtonVariant.text,
                size: ButtonSize.sm,
                onPressed: () => router.go(AppScreen.permission),
              ),
            ],
          ),
        ),
        Expanded(
          child: GestureDetector(
            onHorizontalDragEnd: (d) {
              final v = d.primaryVelocity ?? 0;
              if (v < -200) _next();
              if (v > 200 && _i > 0) setState(() => _i--);
            },
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: MediaQuery.sizeOf(context).height * .7,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      height: 250,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          _glow(230, glow, .16),
                          _glow(160, glow, .14),
                          AnimatedSwitcher(
                            duration: Motion.of(context, Motion.screenLong),
                            // Decorative mock-ups keep their drawn size;
                            // the real text below still scales.
                            child: KeyedSubtree(
                              key: ValueKey(_i),
                              child: MediaQuery.withNoTextScaling(
                                child: _illustration(c),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text(
                      page.title,
                      textAlign: TextAlign.center,
                      style: AppText.style(
                        28,
                        weight: FontWeight.w800,
                        color: c.textPrimary,
                        height: 34,
                        spacing: -0.02,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      page.body,
                      textAlign: TextAlign.center,
                      style: AppText.style(16, color: c.textMuted, height: 24),
                    ),
                    const SizedBox(height: 28),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (var j = 0; j < _pages.length; j++)
                          GestureDetector(
                            onTap: () => setState(() => _i = j),
                            child: AnimatedContainer(
                              duration: Motion.of(context, Motion.screen),
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              width: j == _i ? 28 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: j == _i ? c.primary : c.borderDefault,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: CButton(
            _i < _pages.length - 1 ? 'Next' : 'Get started',
            size: ButtonSize.lg,
            fullWidth: true,
            onPressed: _next,
          ),
        ),
      ],
    );
  }

  Widget _glow(double size, Color color, double opacity) => AnimatedContainer(
    duration: Motion.of(context, Motion.screenLong),
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: color.withValues(alpha: opacity),
    ),
  );

  Widget _illustration(CTokens c) => switch (_i) {
    0 => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _sizeCard(c, 'Before', '1.8 GB', c.tertiary),
        const SizedBox(width: 10),
        IconTile(
          Icons.arrow_forward_rounded,
          bg: c.primary,
          fg: c.onPrimary,
          size: 40,
          iconSize: 24,
          radius: 20,
        ),
        const SizedBox(width: 10),
        _sizeCard(c, 'After', '0.7 GB', c.success),
      ],
    ),
    1 => SizedBox(
      width: 240,
      height: 210,
      child: Stack(
        children: [
          Positioned(
            left: 70,
            top: 0,
            child: Container(
              width: 100,
              height: 200,
              decoration: BoxDecoration(
                color: c.card,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: c.textPrimary, width: 4),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconTile(
                    Icons.lock_rounded,
                    bg: c.primary,
                    fg: c.onPrimary,
                    size: 56,
                    iconSize: 30,
                    radius: 28,
                  ),
                  const SizedBox(height: 8),
                  _bar(c, 56),
                  const SizedBox(height: 8),
                  _bar(c, 40),
                ],
              ),
            ),
          ),
          Positioned(
            left: 0,
            top: 24,
            child: IconTile(
              Icons.cloud_off_rounded,
              bg: c.tertiary,
              fg: c.onTertiary,
              size: 56,
              iconSize: 28,
              radius: 16,
              shadow: true,
            ),
          ),
          Positioned(
            right: 0,
            top: 70,
            child: IconTile(
              Icons.wifi_off_rounded,
              bg: c.accent,
              fg: c.onAccent,
              size: 56,
              iconSize: 28,
              radius: 16,
              shadow: true,
            ),
          ),
          Positioned(
            left: 16,
            bottom: 10,
            child: IconTile(
              Icons.shield_rounded,
              bg: c.success,
              fg: c.onSuccess,
              size: 48,
              iconSize: 24,
              radius: 24,
              shadow: true,
            ),
          ),
        ],
      ),
    ),
    _ => SizedBox(
      width: 260,
      height: 200,
      child: Stack(
        children: [
          Positioned(
            left: 20,
            right: 20,
            top: 16,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: c.card,
                borderRadius: BorderRadius.circular(20),
                boxShadow: CTokens.liftShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconTile(
                        Icons.verified_rounded,
                        bg: c.successContainer,
                        fg: c.success,
                        iconSize: 24,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Looks identical',
                              style: AppText.style(
                                14,
                                weight: FontWeight.w700,
                                color: c.textPrimary,
                              ),
                            ),
                            Text(
                              'Quality checked',
                              style: AppText.style(12, color: c.textMuted),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Remove 5 originals?',
                    style: AppText.style(13, color: c.textMuted),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(child: _fakeBtn(c, 'Keep', filled: false)),
                      const SizedBox(width: 8),
                      Expanded(child: _fakeBtn(c, 'Allow', filled: true)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            right: 4,
            bottom: 6,
            child: IconTile(
              Icons.touch_app_rounded,
              bg: c.accent,
              fg: c.onAccent,
              size: 56,
              iconSize: 30,
              radius: 28,
              shadow: true,
            ),
          ),
        ],
      ),
    ),
  };

  Widget _sizeCard(CTokens c, String label, String value, Color color) =>
      Container(
        width: 118,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(18),
          boxShadow: CTokens.liftShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 92,
              decoration: BoxDecoration(gradient: thumbGradient(28)),
              alignment: Alignment.topLeft,
              padding: const EdgeInsets.all(8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: const ShapeDecoration(
                  color: Color(0x8C000000),
                  shape: StadiumBorder(),
                ),
                child: Text(
                  '4K',
                  style: AppText.style(
                    11,
                    weight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: AppText.style(
                      11,
                      weight: FontWeight.w600,
                      color: c.textMuted,
                    ),
                  ),
                  Text(
                    value,
                    style: AppText.style(
                      18,
                      weight: FontWeight.w800,
                      color: color,
                      tabular: true,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _bar(CTokens c, double w) => Container(
    width: w,
    height: 6,
    decoration: BoxDecoration(
      color: c.raised,
      borderRadius: BorderRadius.circular(3),
    ),
  );

  Widget _fakeBtn(CTokens c, String label, {required bool filled}) => Container(
    height: 34,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: filled ? c.primary : null,
      border: filled ? null : Border.all(color: c.borderDefault),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      label,
      style: AppText.style(
        13,
        weight: FontWeight.w600,
        color: filled ? c.onPrimary : c.primary,
      ),
    ),
  );
}

/// Explains the permissions before Android asks (FR-01, FR-20).
class PermissionScreen extends StatelessWidget {
  const PermissionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final router = AppScope.of(context).router;
    final rows = [
      (
        Icons.photo_library_rounded,
        'Photos and videos',
        'To find files that can be made smaller. We only read them.',
        c.primary,
        c.onPrimary,
      ),
      (
        Icons.location_on_rounded,
        'Location in photos',
        'So the place a photo was taken is kept in the new copy.',
        c.tertiary,
        c.onTertiary,
      ),
      (
        Icons.notifications_rounded,
        'Notifications',
        'To show progress while compressing in the background.',
        c.accent,
        c.onAccent,
      ),
    ];
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            children: [
              SizedBox(height: 170, child: _illustration(c)),
              const SizedBox(height: 20),
              Text(
                'Let Compressly see your photos and videos',
                textAlign: TextAlign.center,
                style: AppText.style(
                  26,
                  weight: FontWeight.w800,
                  color: c.textPrimary,
                  height: 32,
                  spacing: -0.02,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Android will ask you next. You can change this anytime.',
                textAlign: TextAlign.center,
                style: AppText.style(14, color: c.textMuted),
              ),
              const SizedBox(height: 20),
              CardBox(
                radius: 20,
                padding: const EdgeInsets.all(8),
                child: Column(
                  children: [
                    for (final (icon, title, body, bg, fg) in rows)
                      Padding(
                        padding: const EdgeInsets.all(10),
                        child: Row(
                          children: [
                            IconTile(
                              icon,
                              bg: bg,
                              fg: fg,
                              size: 44,
                              iconSize: 24,
                              radius: 14,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    title,
                                    style: AppText.style(
                                      15,
                                      weight: FontWeight.w700,
                                      color: c.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    body,
                                    style: AppText.style(
                                      13,
                                      color: c.textMuted,
                                      height: 18,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // TODO(1.2): request READ_MEDIA_*, ACCESS_MEDIA_LOCATION, POST_NOTIFICATIONS.
              CButton(
                'Continue',
                size: ButtonSize.lg,
                fullWidth: true,
                onPressed: () => router.go(AppScreen.scan),
              ),
              const SizedBox(height: 8),
              CButton(
                'Not now',
                variant: ButtonVariant.text,
                fullWidth: true,
                onPressed: () => router.go(AppScreen.denied),
              ),
              const SizedBox(height: 8),
              const TrustBadge(label: 'Nothing leaves your phone'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _illustration(CTokens c) => LayoutBuilder(
    builder: (context, box) {
      final mid = box.maxWidth / 2;
      return Stack(
        alignment: Alignment.center,
        children: [
          SizedBox.square(
            dimension: 170,
            child: DashedOutline(color: c.borderDefault, circle: true),
          ),
          Container(
            width: 92,
            height: 92,
            decoration: BoxDecoration(
              color: c.primary,
              borderRadius: BorderRadius.circular(28),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x592443E6),
                  offset: Offset(0, 12),
                  blurRadius: 32,
                ),
              ],
            ),
            child: Icon(
              Icons.photo_library_rounded,
              size: 48,
              color: c.onPrimary,
            ),
          ),
          Positioned(
            left: mid - 100,
            top: 22,
            child: IconTile(
              Icons.videocam_rounded,
              bg: c.tertiary,
              fg: c.onTertiary,
              size: 44,
              iconSize: 22,
              radius: 22,
            ),
          ),
          Positioned(
            left: mid + 58,
            top: 18,
            child: IconTile(
              Icons.photo_camera_rounded,
              bg: c.accent,
              fg: c.onAccent,
              size: 44,
              iconSize: 22,
              radius: 22,
            ),
          ),
          Positioned(
            left: mid + 50,
            bottom: 6,
            child: IconTile(
              Icons.lock_rounded,
              bg: c.success,
              fg: c.onSuccess,
              size: 40,
              iconSize: 20,
              radius: 20,
            ),
          ),
        ],
      );
    },
  );
}

class PermissionDeniedScreen extends StatelessWidget {
  const PermissionDeniedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final router = AppScope.of(context).router;
    const steps = [
      'Tap Open settings',
      'Go to Permissions → Photos and videos',
      'Choose Allow all',
    ];
    return Column(
      children: [
        Expanded(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Column(
                children: [
                  IconTile(
                    Icons.hide_image_outlined,
                    bg: c.primaryContainer,
                    fg: c.onPrimaryContainer,
                    size: 88,
                    iconSize: 44,
                    radius: 28,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    "Compressly can't see your gallery yet",
                    textAlign: TextAlign.center,
                    style: AppText.style(
                      26,
                      weight: FontWeight.w800,
                      color: c.textPrimary,
                      height: 32,
                      spacing: -0.02,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Without access we can't find files to make smaller. Turn on Photos and videos in Android settings.",
                    textAlign: TextAlign.center,
                    style: AppText.style(16, color: c.textMuted, height: 24),
                  ),
                  const SizedBox(height: 20),
                  CardBox(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    child: Column(
                      children: [
                        for (final (i, t) in steps.indexed)
                          Padding(
                            padding: EdgeInsets.only(top: i == 0 ? 0 : 10),
                            child: Row(
                              children: [
                                _NumberDot(i + 1, size: 24),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    t,
                                    style: AppText.style(
                                      14,
                                      color: c.textPrimary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // TODO(1.2): open the app's Android settings page.
              CButton(
                'Open settings',
                icon: Icons.open_in_new_rounded,
                size: ButtonSize.lg,
                fullWidth: true,
                onPressed: () => router.go(AppScreen.scan),
              ),
              const SizedBox(height: 8),
              CButton(
                'Try again',
                variant: ButtonVariant.text,
                fullWidth: true,
                onPressed: () => router.go(AppScreen.permission),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Numbered step marker.
class _NumberDot extends StatelessWidget {
  const _NumberDot(this.n, {this.size = 28});

  final int n;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: c.primary, shape: BoxShape.circle),
      child: Text(
        '$n',
        style: AppText.style(
          size / 2,
          weight: FontWeight.w700,
          color: c.onPrimary,
        ),
      ),
    );
  }
}
