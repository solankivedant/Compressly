import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/router.dart';
import '../../app/theme.dart';
import '../../core/domain/byte_format.dart';
import '../../core/domain/media_item.dart';
import '../../core/domain/photo_format.dart';
import '../flows.dart';
import '../widgets/button.dart';
import '../widgets/controls.dart';
import '../widgets/overlays.dart';
import '../widgets/thumb.dart';

/// Opens the quick before/after sheet for one file.
Future<void> showFileSheet(BuildContext context, int itemId) =>
    showCSheet<void>(context, (_) => _FileSheet(itemId: itemId));

int _secs(String? d) =>
    d == null ? 0 : d.split(':').fold(0, (a, x) => a * 60 + int.parse(x));

String _clock(double s) =>
    '${s ~/ 60}:${(s % 60).floor().toString().padLeft(2, '0')}';

class _FileSheet extends StatefulWidget {
  const _FileSheet({required this.itemId});

  final int itemId;

  @override
  State<_FileSheet> createState() => _FileSheetState();
}

class _FileSheetState extends State<_FileSheet> {
  /// True for the best format (HEVC/HEIC), false for the compatible one.
  late bool _best = AppScope.of(context).prefs.photoFormat == PhotoFormat.heic;
  bool _playing = false;
  double _t = 0;
  Timer? _play;

  @override
  void dispose() {
    _play?.cancel();
    super.dispose();
  }

  // Simulated playback until real previews arrive.
  void _togglePlay(double len) {
    if (_playing) {
      _play?.cancel();
      setState(() => _playing = false);
      return;
    }
    setState(() {
      if (_t >= len) _t = 0;
      _playing = true;
    });
    _play = Timer.periodic(const Duration(milliseconds: 100), (t) {
      setState(() {
        _t += .1;
        if (_t >= len) {
          _t = len;
          _playing = false;
          t.cancel();
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = AppScope.of(context);
    final f = s.engine.items.firstWhere((x) => x.id == widget.itemId);
    final v = f.isVideo, best = f.done || _best;
    final len = (_secs(f.duration))
        .toDouble()
        .clamp(1, double.infinity)
        .toDouble();
    final pct = best ? f.savingPct : (f.savingPct * .55).round();
    final after = f.done ? f.afterGb : f.beforeGb * (1 - pct / 100);
    final qd = best ? f.qualityDrop : (f.qualityDrop - 1).clamp(1, 100);
    final est = f.done ? '' : '~';
    final from = v ? 'H.264' : 'JPEG',
        toBest = v ? 'HEVC' : 'HEIC',
        toAlt = v ? 'H.264' : 'JPEG';

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SheetHandle(width: 36),
            const SizedBox(height: 12),
            Text(
              f.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppText.style(
                20,
                weight: FontWeight.w700,
                color: c.textPrimary,
                height: 26,
              ),
            ),
            Text(f.meta, style: AppText.style(13, color: c.textMuted)),
            const SizedBox(height: 12),
            _preview(c, f, len, from, best ? toBest : 'Optimised $toAlt'),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 2,
              children: [
                _card(
                  c,
                  'Before',
                  f.before,
                  from,
                  c.sunken,
                  c.textPrimary,
                  c.textMuted,
                ),
                _card(
                  c,
                  f.done ? 'After' : 'After (est.)',
                  '$est${formatGb(after)}',
                  best ? toBest : toAlt,
                  c.successContainer,
                  c.success,
                  c.textPrimary,
                ),
                _card(
                  c,
                  'Storage',
                  '−$pct%',
                  '${f.done ? 'Saved' : 'Saves'} ${formatGb(f.beforeGb - after)}',
                  c.primaryContainer,
                  c.onPrimaryContainer,
                  c.onPrimaryContainer,
                ),
                _card(
                  c,
                  'Quality',
                  '−$qd%',
                  '${100 - qd}% of original',
                  c.tertiaryContainer,
                  c.onTertiaryContainer,
                  c.onTertiaryContainer,
                ),
              ],
            ),
            if (!f.done) ...[
              const SizedBox(height: 12),
              Text(
                'CONVERT TO',
                style: AppText.style(
                  11,
                  weight: FontWeight.w700,
                  color: c.textMuted,
                  spacing: .06,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _fmt(c, true, toBest, 'Saves the most space'),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _fmt(
                      c,
                      false,
                      'Optimised $toAlt',
                      v
                          ? 'Plays on older phones and TVs'
                          : 'Opens on any phone or PC',
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            CButton(
              f.done ? 'Compare before and after' : 'Compress this file',
              size: ButtonSize.lg,
              fullWidth: true,
              onPressed: () {
                Navigator.pop(context);
                if (f.done) {
                  s.router.go(AppScreen.detail, arg: f.id);
                } else {
                  compressNow(s, [f.copyWith(afterGb: after, savingPct: pct)]);
                }
              },
            ),
            const SizedBox(height: 4),
            CButton(
              'Close',
              variant: ButtonVariant.text,
              fullWidth: true,
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  Widget _preview(CTokens c, MediaItem f, double len, String from, String to) {
    final label = AppText.style(
      12,
      weight: FontWeight.w700,
      color: Colors.white,
      tabular: true,
    );
    return GestureDetector(
      onTap: f.isVideo ? () => _togglePlay(len) : null,
      child: Container(
        height: 200,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          gradient: thumbGradient(f.hue),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Stack(
          children: [
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(gradient: bottomScrim(.55, .45)),
              ),
            ),
            Positioned(
              top: 10,
              left: 10,
              child: _tag(
                const Color(0x8C000000),
                Text.rich(
                  TextSpan(
                    text: '$from → ',
                    children: [
                      TextSpan(
                        text: to,
                        style: const TextStyle(color: CTokens.lime),
                      ),
                    ],
                  ),
                  style: label,
                ),
              ),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: _tag(
                f.done ? c.accent : c.tertiary,
                Text(
                  f.done ? '✓ −${f.savingPct}%' : 'Original',
                  style: label.copyWith(
                    color: f.done ? c.onAccent : c.onTertiary,
                  ),
                ),
                pill: true,
              ),
            ),
            if (f.isVideo) ...[
              Center(
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(
                    color: Color(0x80000000),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                    size: 32,
                    color: Colors.white,
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: LinearProgressIndicator(
                  value: (_t / len).clamp(0, 1),
                  minHeight: 4,
                  color: Colors.white,
                  backgroundColor: Colors.white24,
                ),
              ),
            ],
            Positioned(
              left: 12,
              bottom: 12,
              child: Text(
                f.isVideo ? '${_clock(_t)} / ${f.duration}' : f.meta,
                style: label,
              ),
            ),
            Positioned(
              right: 12,
              bottom: 12,
              child: Text(
                f.isVideo
                    ? (_playing ? 'Tap to pause' : 'Tap to play')
                    : 'Tap Close to go back',
                style: label.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tag(Color bg, Widget child, {bool pill = false}) => Container(
    height: pill ? 24 : 26,
    padding: const EdgeInsets.symmetric(horizontal: 10),
    alignment: Alignment.center,
    decoration: pill
        ? ShapeDecoration(color: bg, shape: const StadiumBorder())
        : BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
    child: child,
  );

  Widget _card(
    CTokens c,
    String l,
    String v,
    String sub,
    Color bg,
    Color fg,
    Color lc,
  ) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(14),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          l.toUpperCase(),
          style: AppText.style(
            11,
            weight: FontWeight.w700,
            color: lc,
            spacing: .06,
          ),
        ),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            v,
            style: AppText.style(
              22,
              weight: FontWeight.w800,
              color: fg,
              height: 28,
              tabular: true,
            ),
          ),
        ),
        Text(
          sub,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: AppText.style(12, color: lc),
        ),
      ],
    ),
  );

  Widget _fmt(CTokens c, bool best, String t, String sub) {
    final on = _best == best;
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: on,
      child: Material(
        color: on ? c.primaryContainer : c.card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: on ? c.primary : c.borderDefault,
            width: on ? 2 : 1,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => setState(() => _best = best),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                RadioDot(on: on),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        t,
                        style: AppText.style(
                          14,
                          weight: FontWeight.w700,
                          color: c.textPrimary,
                          height: 18,
                        ),
                      ),
                      Text(
                        sub,
                        style: AppText.style(
                          11,
                          color: c.textMuted,
                          height: 14,
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
    );
  }
}
