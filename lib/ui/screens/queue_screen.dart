import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/router.dart';
import '../../app/theme.dart';
import '../../core/domain/byte_format.dart';
import '../../core/domain/media_item.dart';
import '../../core/domain/quality_words.dart';
import '../../core/services/engine/engine_service.dart';
import '../widgets/button.dart';
import '../widgets/file_row.dart';
import '../widgets/layout.dart';
import '../widgets/status_chip.dart';
import '../widgets/thumb.dart';

const _states = ['Compressing', 'Checking quality', 'Saving'];

String _stateFor(double pct) => _states[math.min(2, pct ~/ 40)];

/// Live queue (FR-13). Moves on to Review when every file is done.
class QueueScreen extends StatefulWidget {
  const QueueScreen({super.key});

  @override
  State<QueueScreen> createState() => _QueueScreenState();
}

class _QueueScreenState extends State<QueueScreen> {
  late final EngineService _engine = AppScope.of(context).engine;
  late final AppRouter _router = AppScope.of(context).router;
  Timer? _toReview;

  @override
  void initState() {
    super.initState();
    _engine.addListener(_onEngine);
  }

  void _onEngine() {
    if (!_engine.queueFinished || _toReview != null) return;
    _toReview = Timer(
      const Duration(milliseconds: 600),
      () => _router.replace(AppScreen.review, arg: false),
    );
  }

  @override
  void dispose() {
    _engine.removeListener(_onEngine);
    _toReview?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return ListenableBuilder(
      listenable: _engine,
      builder: (context, _) {
        final batch = _engine.batch;
        final qp = _engine.queueProgress * 100;
        final fin = _engine.queueFinished;
        final paused = _engine.paused;
        final ci = math.min(math.max(batch.length - 1, 0), qp ~/ 100);
        double progressOf(int i) => (qp - i * 100).clamp(0, 100).toDouble();
        final saved = [
          for (final (i, x) in batch.indexed)
            if (progressOf(i) >= 100) x.savingGb,
        ].fold(0.0, (a, b) => a + b);
        final status = fin
            ? 'All done'
            : paused
            ? 'Paused. We’ll continue when you tap Resume.'
            : 'Compressing ${math.min(batch.length, ci + 1)} of ${batch.length}';
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ScreenHeader(
              title: 'Queue',
              onBack: () {
                if (!_router.back()) _router.go(AppScreen.compress);
              },
              actions: [
                CButton(
                  paused ? 'Resume' : 'Pause',
                  variant: ButtonVariant.text,
                  icon: paused ? Icons.play_arrow_rounded : Icons.pause_rounded,
                  onPressed: fin ? null : () => _engine.setPaused(!paused),
                ),
              ],
            ),
            // TODO(2.2): read run conditions from the engine.
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  StatusChip(
                    'Charging',
                    icon: Icons.battery_charging_full_rounded,
                    tone: ChipTone.success,
                  ),
                  StatusChip('Cool', icon: Icons.device_thermostat_rounded),
                  StatusChip('24 GB free', icon: Icons.sd_card_rounded),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(status, style: AppText.style(14, color: c.textMuted)),
                  Text.rich(
                    TextSpan(
                      text: '${saved.toStringAsFixed(1)} GB ',
                      children: [
                        TextSpan(
                          text: 'saved so far',
                          style: AppText.style(
                            16,
                            weight: FontWeight.w500,
                            color: c.textMuted,
                          ),
                        ),
                      ],
                    ),
                    style: AppText.style(
                      36,
                      weight: FontWeight.w700,
                      color: c.textPrimary,
                      height: 44,
                      spacing: -0.02,
                      tabular: true,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  if (batch.isNotEmpty)
                    _current(c, batch[ci], progressOf(ci), fin, paused),
                  const SizedBox(height: 12),
                  CardBox(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Column(
                      children: [
                        for (final (i, x) in batch.indexed)
                          _row(x, progressOf(i)),
                      ],
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(child: TrustBadge()),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _row(MediaItem x, double l) {
    final done = l >= 100;
    return ProgressRow(
      kind: x.kind,
      title: x.title,
      hue: x.hue,
      done: done,
      progress: l,
      state: done
          ? 'Ready · ${formatGb(x.savingGb)}'
          : l == 0
          ? 'Waiting'
          : _stateFor(l),
      eta: l > 0 && !done ? '${((100 - l) / 30).ceil()} min left' : null,
      detail: done ? qualityWords(x.qualityDrop) : '${x.before} → ~${x.after}',
    );
  }

  Widget _current(CTokens c, MediaItem x, double lp, bool fin, bool paused) {
    final (badge, bg, fg) = fin
        ? ('All done', c.success, c.onSuccess)
        : paused
        ? ('Paused', c.primary, c.onPrimary)
        : ('Now processing', c.primary, c.onPrimary);
    final line =
        '${x.before} → ~${x.after} · ${lp >= 100 ? 'Ready' : '${_stateFor(lp)} · ${lp.round()}%'}';
    final white = AppText.style(
      12,
      weight: FontWeight.w700,
      color: Colors.white,
    );
    return CardBox(
      radius: 20,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: 188,
            decoration: BoxDecoration(gradient: thumbGradient(x.hue)),
            child: Stack(
              children: [
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(gradient: bottomScrim(.65, .55)),
                  ),
                ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    height: 26,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: ShapeDecoration(
                      color: bg,
                      shape: const StadiumBorder(),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        PulseDot(color: fg),
                        const SizedBox(width: 6),
                        Text(badge, style: white.copyWith(color: fg)),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    height: 26,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    alignment: Alignment.center,
                    decoration: const ShapeDecoration(
                      color: Color(0x80000000),
                      shape: StadiumBorder(),
                    ),
                    child: Text(x.meta.split(' · ').first, style: white),
                  ),
                ),
                Align(
                  alignment: const Alignment(0, -.16),
                  child: Icon(
                    x.isVideo ? Icons.play_circle_rounded : Icons.photo_rounded,
                    size: 48,
                    color: Colors.white.withValues(alpha: .9),
                  ),
                ),
                Positioned(
                  left: 14,
                  right: 14,
                  bottom: 12,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        x.title,
                        style: AppText.style(
                          16,
                          weight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        line,
                        style: AppText.style(
                          13,
                          color: Colors.white.withValues(alpha: .85),
                          tabular: true,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          ProgressBar(value: lp / 100, rounded: false),
        ],
      ),
    );
  }
}
