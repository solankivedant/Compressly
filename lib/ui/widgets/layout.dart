import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../app/theme.dart';
import 'button.dart';

/// Screen title row: optional back button, title + subtitle, actions.
class ScreenHeader extends StatelessWidget {
  const ScreenHeader({
    super.key,
    this.title,
    this.subtitle,
    this.onBack,
    this.actions = const [],
    this.titleSize = 22,
  });

  final String? title;
  final String? subtitle;
  final VoidCallback? onBack;
  final List<Widget> actions;
  final double titleSize;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 64),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Row(
          children: [
            if (onBack != null)
              HeaderIconButton(
                Icons.arrow_back_rounded,
                label: 'Back',
                onTap: onBack,
              ),
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(left: onBack != null ? 4 : 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (title != null)
                      Text(
                        title!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.style(
                          titleSize,
                          weight: FontWeight.w700,
                          color: c.textPrimary,
                          height: titleSize + 6,
                          spacing: -0.01,
                        ),
                      ),
                    if (subtitle != null)
                      Text(
                        subtitle!,
                        style: AppText.style(13, color: c.textMuted),
                      ),
                  ],
                ),
              ),
            ),
            ...actions,
          ],
        ),
      ),
    );
  }
}

/// Bottom action area pinned under scrolling content.
class StickyFooter extends StatelessWidget {
  const StickyFooter({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      decoration: BoxDecoration(color: c.card, boxShadow: c.stickyShadow),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final (i, w) in children.indexed) ...[
            if (i > 0) const SizedBox(height: 8),
            w,
          ],
        ],
      ),
    );
  }
}

class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 4),
    child: Text(
      text,
      style: AppText.style(
        14,
        weight: FontWeight.w700,
        color: context.c.textMuted,
      ),
    ),
  );
}

/// Rounded card surface.
class CardBox extends StatelessWidget {
  const CardBox({
    super.key,
    required this.child,
    this.padding = EdgeInsets.zero,
    this.radius = Space.radiusCard,
    this.color,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final Color? color;

  @override
  Widget build(BuildContext context) => Material(
    color: color ?? context.c.card,
    borderRadius: BorderRadius.circular(radius),
    clipBehavior: Clip.antiAlias,
    child: Padding(padding: padding, child: child),
  );
}

/// Section label above a card, the common Settings/Home pattern.
class LabeledCard extends StatelessWidget {
  const LabeledCard({
    super.key,
    required this.label,
    required this.children,
    this.padding = const EdgeInsets.symmetric(vertical: 4),
  });

  final String label;
  final List<Widget> children;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      SectionLabel(label),
      const SizedBox(height: 8),
      CardBox(
        padding: padding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: children,
        ),
      ),
    ],
  );
}

/// Icon in a rounded square, used in list rows and illustrations.
class IconTile extends StatelessWidget {
  const IconTile(
    this.icon, {
    super.key,
    required this.bg,
    required this.fg,
    this.size = 36,
    this.iconSize = 20,
    this.radius = 10,
    this.shadow = false,
  });

  final IconData icon;
  final Color bg, fg;
  final double size, iconSize, radius;
  final bool shadow;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(radius),
      boxShadow: shadow ? CTokens.liftShadow : null,
    ),
    child: Icon(icon, size: iconSize, color: fg),
  );
}

/// Settings-style row: icon tile, title, optional subtitle and trailing.
class ListRow extends StatelessWidget {
  const ListRow({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.iconBg,
    this.iconFg,
    this.trailing,
    this.onTap,
    this.chevron = false,
  });

  final IconData icon;
  final String title;
  final Widget? subtitle;
  final Color? iconBg, iconFg;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool chevron;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: subtitle != null ? 64 : 56),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: Row(
            children: [
              IconTile(
                icon,
                bg: iconBg ?? c.sunken,
                fg: iconFg ?? c.textPrimary,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppText.style(
                        16,
                        color: c.textPrimary,
                        height: 22,
                      ),
                    ),
                    if (subtitle != null)
                      DefaultTextStyle.merge(
                        style: AppText.style(13, color: c.textMuted),
                        child: subtitle!,
                      ),
                  ],
                ),
              ),
              ?trailing,
              if (chevron)
                Icon(Icons.chevron_right_rounded, color: c.textPrimary),
            ],
          ),
        ),
      ),
    );
  }
}

/// Small dot that pulses while work is running.
class PulseDot extends StatefulWidget {
  const PulseDot({super.key, required this.color, this.size = 7});

  final Color color;
  final double size;

  @override
  State<PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<PulseDot>
    with SingleTickerProviderStateMixin {
  late final _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 500),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.of(context).disableAnimations) {
      _c.stop();
      _c.value = 0;
    } else if (!_c.isAnimating) {
      _c.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
    opacity: Tween(begin: 1.0, end: .3).animate(_c),
    child: Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(color: widget.color, shape: BoxShape.circle),
    ),
  );
}

/// Dashed outline (circle or rounded rect), for illustrations and
/// screenshot placeholders.
class DashedOutline extends StatelessWidget {
  const DashedOutline({
    super.key,
    required this.color,
    this.radius,
    this.circle = false,
    this.strokeWidth = 2,
    this.child,
  });

  final Color color;
  final double? radius;
  final bool circle;
  final double strokeWidth;
  final Widget? child;

  @override
  Widget build(BuildContext context) => CustomPaint(
    painter: _DashedPainter(color, radius ?? 0, circle, strokeWidth),
    child: child,
  );
}

class _DashedPainter extends CustomPainter {
  _DashedPainter(this.color, this.radius, this.circle, this.width);

  final Color color;
  final double radius, width;
  final bool circle;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = (Offset.zero & size).deflate(width / 2);
    final path = circle
        ? (Path()..addOval(rect))
        : (Path()
            ..addRRect(RRect.fromRectAndRadius(rect, Radius.circular(radius))));
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..color = color;
    final dash = width * 3, gap = width * 3;
    for (final m in path.computeMetrics()) {
      for (var d = 0.0; d < m.length; d += dash + gap) {
        canvas.drawPath(m.extractPath(d, math.min(d + dash, m.length)), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedPainter old) => old.color != color;
}
