import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/router.dart';
import '../../app/theme.dart';
import '../../core/domain/quality_words.dart';
import '../widgets/button.dart';
import '../widgets/controls.dart';
import '../widgets/file_row.dart';
import '../widgets/layout.dart';
import '../widgets/savings.dart';
import '../widgets/status_chip.dart';
import 'file_sheet.dart';

/// Dashboard: freed vs ready-to-free vs still-to-free (FR-16, FR-28).
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final hour = s.clock.now().hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 17
        ? 'Good afternoon'
        : 'Good evening';
    return Column(
      children: [
        ScreenHeader(
          title: 'Compressly',
          subtitle: greeting,
          actions: [
            HeaderIconButton(
              Icons.history_rounded,
              label: 'History',
              onTap: () => s.router.go(AppScreen.history),
            ),
            HeaderIconButton(
              Icons.refresh_rounded,
              label: 'Scan again',
              onTap: () => s.router.reset(AppScreen.scan),
            ),
          ],
        ),
        Expanded(
          child: ListenableBuilder(
            listenable: Listenable.merge([s.engine, s.billing, s.prefs]),
            builder: (context, _) => ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                const _FreedCard(),
                const SizedBox(height: 12),
                _pendingRow(context),
                const SizedBox(height: 12),
                const _StorageCard(),
                const SizedBox(height: 12),
                CardBox(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 4,
                  ),
                  child: CSwitch(
                    label: 'Auto-compress while charging',
                    description: 'Runs overnight when your phone is cool',
                    value: s.prefs.autoCompress,
                    trailing: s.billing.isPro ? null : const StatusChip.pro(),
                    onChanged: (v) => s.billing.isPro
                        ? s.prefs.update((p) => p.autoCompress = v)
                        : s.router.go(AppScreen.paywall),
                  ),
                ),
                const SizedBox(height: 12),
                _recent(context),
                const SizedBox(height: 12),
                const Center(child: TrustBadge()),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _pendingRow(BuildContext context) {
    final s = AppScope.of(context);
    final e = s.engine;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: StatCard(
              tone: StatTone.primary,
              icon: Icons.schedule_rounded,
              label: 'Ready to free',
              value: e.pendingGb.toStringAsFixed(1),
              unit: 'GB',
              sub: e.pendingGb > 0 ? 'Tap to review' : 'Nothing waiting',
              onTap: e.pendingGb > 0
                  ? () => s.router.go(AppScreen.review, arg: true)
                  : null,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: StatCard(
              tone: StatTone.tertiary,
              icon: Icons.hourglass_top_rounded,
              label: 'Still to free',
              value: e.stillToFreeGb.toStringAsFixed(1),
              unit: 'GB',
              onTap: () => s.router.go(AppScreen.compress),
            ),
          ),
        ],
      ),
    );
  }

  Widget _recent(BuildContext context) {
    final s = AppScope.of(context);
    final recent = s.engine.items.where((x) => x.done).take(3);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            children: [
              const Expanded(child: SectionLabel('Recent')),
              StatusChip(
                'History',
                icon: Icons.history_rounded,
                onTap: () => s.router.go(AppScreen.history),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        CardBox(
          child: Column(
            children: [
              for (final x in recent)
                FileRow(
                  kind: x.kind,
                  title: x.title,
                  before: x.before,
                  after: x.after,
                  savingPct: x.savingPct,
                  quality: qualityWords(x.qualityDrop),
                  hue: x.hue,
                  onTap: () => showFileSheet(context, x.id),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// "Freed till now" with a count-up when the number grows.
class _FreedCard extends StatelessWidget {
  const _FreedCard();

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final e = AppScope.of(context).engine;
    final pct = (e.freedGb / (e.freedGb + e.stillToFreeGb) * 100).round();
    return TweenAnimationBuilder<double>(
      tween: Tween(end: e.freedGb),
      duration: Motion.of(context, Motion.countUp),
      curve: Curves.easeOutCubic,
      builder: (context, freed, _) => StatCard(
        tone: StatTone.accent,
        large: true,
        icon: Icons.check_circle_rounded,
        label: 'Freed till now',
        value: freed.toStringAsFixed(1),
        unit: 'GB',
        sub: '${e.compressedCount} files compressed · same resolution',
        children: [
          ProgressBar(
            value: pct / 100,
            height: 8,
            color: c.onAccent,
            track: const Color(0x2E090B10),
          ),
          Text(
            '$pct% of what can be freed',
            style: AppText.style(
              12,
              weight: FontWeight.w600,
              color: c.onAccent,
            ),
          ),
        ],
      ),
    );
  }
}

class _StorageCard extends StatelessWidget {
  const _StorageCard();

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final e = AppScope.of(context).engine;
    final total = e.deviceTotalGb,
        used = e.deviceUsedGb,
        left = e.stillToFreeGb;
    final legend = [
      (c.ringUsed, 'Used', '${used.toStringAsFixed(0)} GB'),
      (c.ringFreeable, 'Can be freed', '${left.toStringAsFixed(1)} GB'),
      (c.ringTrack, 'Free', '${(total - used).toStringAsFixed(0)} GB'),
    ];
    return CardBox(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          StorageRing(
            total: total,
            used: used,
            freeable: left,
            size: 120,
            stroke: 12,
            value: '${(total - used).round()}',
            caption: 'free',
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final (color, label, v) in legend)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            label,
                            style: AppText.style(13, color: c.textMuted),
                          ),
                        ),
                        Text(
                          v,
                          style: AppText.style(
                            13,
                            weight: FontWeight.w700,
                            color: c.textPrimary,
                            tabular: true,
                          ),
                        ),
                      ],
                    ),
                  ),
                Text(
                  '${total.round()} GB phone',
                  style: AppText.style(13, color: c.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
