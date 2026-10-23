import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../app/theme.dart';

enum StatTone {
  accent,
  primary,
  tertiary,
  accentSoft,
  primarySoft,
  tertiarySoft,
  neutral,
}

/// Big-number card used on Home and Compress.
class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.unit,
    this.sub,
    this.tone = StatTone.neutral,
    this.large = false,
    this.onTap,
    this.children = const [],
  });

  final String label;
  final String value;
  final IconData? icon;
  final String? unit;
  final String? sub;
  final StatTone tone;
  final bool large;
  final VoidCallback? onTap;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final (bg, fg) = switch (tone) {
      StatTone.accent => (c.accent, c.onAccent),
      StatTone.primary => (c.primary, c.onPrimary),
      StatTone.tertiary => (c.tertiary, c.onTertiary),
      StatTone.accentSoft => (c.accentContainer, c.onAccentContainer),
      StatTone.primarySoft => (c.primaryContainer, c.onPrimaryContainer),
      StatTone.tertiarySoft => (c.tertiaryContainer, c.onTertiaryContainer),
      StatTone.neutral => (c.card, c.textPrimary),
    };
    final size = large ? 56.0 : 28.0;
    final gap = SizedBox(height: large ? 8 : 4);
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(large ? 24 : Space.radiusCard),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.all(large ? 20 : 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 20, color: fg),
                    const SizedBox(width: 6),
                  ],
                  Expanded(
                    child: Text(
                      label,
                      style: AppText.style(
                        14,
                        weight: FontWeight.w600,
                        color: fg,
                        height: 20,
                      ),
                    ),
                  ),
                  if (onTap != null)
                    Icon(Icons.chevron_right_rounded, size: 20, color: fg),
                ],
              ),
              gap,
              Semantics(
                label: '$value ${unit == 'GB' ? 'gigabytes' : unit ?? ''}',
                excludeSemantics: true,
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text.rich(
                    TextSpan(
                      text: value,
                      children: [
                        if (unit != null)
                          TextSpan(
                            text: ' $unit',
                            style: TextStyle(
                              fontSize: size * .45,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0,
                            ),
                          ),
                      ],
                    ),
                    style: AppText.style(
                      size,
                      weight: FontWeight.w800,
                      color: fg,
                      height: large ? 60 : 34,
                      spacing: -0.03,
                      tabular: true,
                    ),
                  ),
                ),
              ),
              if (sub != null) ...[
                gap,
                Text(
                  sub!,
                  style: AppText.style(
                    13,
                    weight: FontWeight.w500,
                    color: fg.withValues(alpha: .8),
                    height: 18,
                  ),
                ),
              ],
              for (final child in children) ...[gap, child],
            ],
          ),
        ),
      ),
    );
  }
}

/// Storage ring: used, can-be-freed and freed segments over a cobalt track.
class StorageRing extends StatelessWidget {
  const StorageRing({
    super.key,
    required this.total,
    required this.used,
    required this.freeable,
    this.freed = 0,
    this.size = 240,
    this.stroke = 18,
    this.value,
    this.unit = 'GB',
    this.caption = 'can be freed',
  });

  final double total, used, freeable, freed;
  final double size, stroke;

  /// Number shown in the middle; defaults to [freeable].
  final String? value;
  final String unit;
  final String caption;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final shown = value ?? _trim(freeable);
    return Semantics(
      label: '$shown ${unit == 'GB' ? 'gigabytes' : unit} $caption',
      excludeSemantics: true,
      child: SizedBox.square(
        dimension: size,
        child: TweenAnimationBuilder<_RingValues>(
          tween: _RingTween(end: _RingValues(used, freeable, freed)),
          duration: Motion.of(context, Motion.countUp),
          curve: Motion.decelerate,
          builder: (context, v, child) => CustomPaint(
            painter: _RingPainter(
              total: total,
              values: v,
              stroke: stroke,
              track: c.ringTrack,
              colors: [c.ringUsed, c.ringFreeable, c.ringFreed],
            ),
            child: child,
          ),
          child: Padding(
            padding: EdgeInsets.all(stroke + 6),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text.rich(
                    TextSpan(
                      text: shown,
                      children: [
                        if (unit.isNotEmpty)
                          TextSpan(
                            text: ' $unit',
                            style: TextStyle(
                              fontSize: (size >= 220 ? 48 : 36) * .5,
                              letterSpacing: 0,
                            ),
                          ),
                      ],
                    ),
                    style: TextStyle(
                      fontSize: size >= 220 ? 48 : 36,
                      height: 1.15,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.02 * (size >= 220 ? 48 : 36),
                      fontFeatures: AppText.tabular,
                      color: c.textPrimary,
                    ),
                  ),
                  Text(
                    caption,
                    style: AppText.style(14, color: c.textMuted, height: 20),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  static String _trim(double v) =>
      v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toStringAsFixed(1);
}

class _RingValues {
  const _RingValues(this.used, this.freeable, this.freed);
  final double used, freeable, freed;
}

class _RingTween extends Tween<_RingValues> {
  _RingTween({required super.end});

  @override
  _RingValues lerp(double t) {
    final b = begin ?? end!, e = end!;
    double l(double x, double y) => x + (y - x) * t;
    return _RingValues(
      l(b.used, e.used),
      l(b.freeable, e.freeable),
      l(b.freed, e.freed),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.total,
    required this.values,
    required this.stroke,
    required this.track,
    required this.colors,
  });

  final double total, stroke;
  final _RingValues values;
  final Color track;
  final List<Color> colors;

  @override
  void paint(Canvas canvas, Size size) {
    final r = (size.width - stroke) / 2;
    final center = size.center(Offset.zero);
    final rect = Rect.fromCircle(center: center, radius: r);
    final circumference = 2 * math.pi * r;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.butt;
    canvas.drawCircle(center, r, paint..color = track);

    double frac(double x) => (x / total).clamp(0.0, 1.0);
    final usedOnly = math.max(0.0, values.used - values.freeable);
    void seg(double start, double len, Color color) {
      if (len <= 0) return;
      // 3 px gap between segments, as in the design.
      final sweep = math.max(0.0, frac(len) * circumference - 3) / r;
      canvas.drawArc(
        rect,
        -math.pi / 2 + frac(start) * 2 * math.pi,
        sweep,
        false,
        paint..color = color,
      );
    }

    seg(0, usedOnly, colors[0]);
    seg(usedOnly, values.freeable, colors[1]);
    seg(usedOnly + values.freeable, values.freed, colors[2]);
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.values != values || old.track != track || old.total != total;
}
