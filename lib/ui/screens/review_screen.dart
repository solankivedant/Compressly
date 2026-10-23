import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/router.dart';
import '../../app/theme.dart';
import '../../core/domain/byte_format.dart';
import '../../core/domain/quality_words.dart';
import '../widgets/button.dart';
import '../widgets/controls.dart';
import '../widgets/file_row.dart';
import '../widgets/layout.dart';
import '../widgets/overlays.dart';

/// Approve removing originals, or keep both for a while (FR-14, FR-15).
class ReviewScreen extends StatefulWidget {
  const ReviewScreen({super.key, required this.fromPending});

  /// True when opened from Home's "Ready to free" card.
  final bool fromPending;

  @override
  State<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends State<ReviewScreen> {
  final Set<int> _kept = {};

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = AppScope.of(context);
    final batch = widget.fromPending ? s.engine.pendingBatch : s.engine.batch;
    final active = batch.where((x) => !_kept.contains(x.id)).toList();
    final save = formatGb(active.fold(0.0, (t, x) => t + x.savingGb));
    final hold = s.prefs.holdDays;

    Future<void> remove() async {
      final yes = await showConfirmSheet(
        context,
        title: 'Remove ${active.length} originals?',
        body: 'Android will ask you to confirm. The new copies are already in your gallery, same resolution.',
        primaryLabel: 'Remove originals',
        secondaryLabel: 'Not now',
      );
      if (yes != true || !context.mounted) return;
      // TODO(2.8): go through OriginalsRequester and the system delete dialog.
      final gb = s.engine.removeOriginals(
        active,
        fromPending: widget.fromPending,
      );
      s.router.reset(AppScreen.home);
      showToast(context, 'Freed ${formatGb(gb)} · processed on your phone');
    }

    void keepBoth() {
      final gb = s.engine.keepBoth(active, fromPending: widget.fromPending);
      s.router.reset(AppScreen.home);
      showToast(
        context,
        'Ready to free ${formatGb(gb)} · we’ll remind you in $hold days',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const ScreenHeader(title: 'Review originals'),
        Expanded(
          // One scroll view so the big heading never squeezes the list at
          // large text sizes; the card area still fills to the footer.
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ready to free $save',
                        style: AppText.style(
                          36,
                          weight: FontWeight.w700,
                          color: c.textPrimary,
                          height: 44,
                          spacing: -0.02,
                          tabular: true,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.check_circle_rounded,
                            size: 20,
                            color: c.success,
                          ),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              'Looks identical · checked frame by frame',
                              style: AppText.style(
                                16,
                                weight: FontWeight.w600,
                                color: c.success,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              SliverFillRemaining(
                hasScrollBody: false,
                child: ColoredBox(
                  color: c.card,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (final x in batch)
                        FileRow(
                          kind: x.kind,
                          title: x.title,
                          hue: x.hue,
                          before: x.before,
                          after: _kept.contains(x.id) ? x.before : x.after,
                          quality: _kept.contains(x.id)
                              ? null
                              : qualityWords(x.qualityDrop),
                          meta: _kept.contains(x.id)
                              ? 'Keeping original'
                              : null,
                          trailing: CButton(
                            _kept.contains(x.id) ? 'Undo' : 'Keep original',
                            variant: ButtonVariant.text,
                            size: ButtonSize.sm,
                            onPressed: () => setState(
                              () => _kept.contains(x.id)
                                  ? _kept.remove(x.id)
                                  : _kept.add(x.id),
                            ),
                          ),
                        ),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'If you keep both, remind me after',
                              style: AppText.style(
                                14,
                                weight: FontWeight.w700,
                                color: c.textMuted,
                              ),
                            ),
                            const SizedBox(height: 8),
                            SegmentedControl<int>(
                              small: true,
                              options: [
                                seg(7, '7 days'),
                                seg(14, '14 days'),
                                seg(30, '30 days'),
                              ],
                              value: hold,
                              onChanged: (v) => setState(
                                () => s.prefs.update((p) => p.holdDays = v),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        StickyFooter(
          children: [
            CButton(
              'Remove originals',
              size: ButtonSize.lg,
              fullWidth: true,
              onPressed: active.isEmpty ? null : remove,
            ),
            CButton(
              'Keep both for $hold days',
              variant: ButtonVariant.text,
              fullWidth: true,
              onPressed: keepBoth,
            ),
          ],
        ),
      ],
    );
  }
}
