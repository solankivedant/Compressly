import 'package:flutter/material.dart';

import '../../app/theme.dart';
import '../../core/domain/media_kind.dart';
import 'thumb.dart';

const _shadow = [
  Shadow(color: Color(0x66000000), blurRadius: 2, offset: Offset(0, 1)),
];

/// One file with its before → after size and savings.
class FileRow extends StatelessWidget {
  const FileRow({
    super.key,
    required this.kind,
    required this.title,
    required this.before,
    required this.after,
    required this.hue,
    this.meta,
    this.savingPct,
    this.qualityDrop,
    this.quality,
    this.selected,
    this.onToggle,
    this.trailing,
    this.onTap,
  });

  final MediaKind kind;
  final String title;
  final String? meta;
  final String before;
  final String after;
  final double hue;
  final int? savingPct;
  final int? qualityDrop;

  /// Plain-words quality result, e.g. "Looks identical".
  final String? quality;
  final bool? selected;
  final ValueChanged<bool>? onToggle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 72),
        child: Padding(
          padding: EdgeInsets.fromLTRB(16, 8, onToggle != null ? 4 : 16, 8),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: thumbGradient(hue),
                  borderRadius: BorderRadius.circular(Space.radiusThumb),
                ),
                alignment: Alignment.bottomLeft,
                padding: const EdgeInsets.all(4),
                child: Icon(
                  kind == MediaKind.video
                      ? Icons.play_circle_rounded
                      : Icons.photo_rounded,
                  size: 18,
                  color: Colors.white,
                  shadows: _shadow,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: _texts(c)),
              if (trailing != null) Flexible(child: trailing!),
              if (onToggle != null)
                Semantics(
                  checked: selected ?? false,
                  label: title,
                  child: SizedBox.square(
                    dimension: 48,
                    child: IconButton(
                      onPressed: () => onToggle!(!(selected ?? false)),
                      icon: Icon(
                        selected ?? false
                            ? Icons.check_box_rounded
                            : Icons.check_box_outline_blank_rounded,
                        color: selected ?? false ? c.primary : c.textMuted,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _texts(CTokens c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(
          TextSpan(
            children: [
              TextSpan(text: '$before '),
              TextSpan(
                text: '→',
                style: TextStyle(
                  color: c.textMuted,
                  fontWeight: FontWeight.w400,
                ),
              ),
              TextSpan(text: ' $after'),
              if (savingPct != null && qualityDrop == null)
                TextSpan(
                  text: '  −$savingPct%',
                  style: AppText.style(
                    13,
                    weight: FontWeight.w600,
                    color: c.primary,
                  ),
                ),
            ],
          ),
          style: AppText.style(
            16,
            weight: FontWeight.w600,
            color: c.textPrimary,
            height: 24,
            tabular: true,
          ),
        ),
        Text(
          meta == null ? title : '$title · $meta',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: AppText.style(13, color: c.textMuted, height: 18),
        ),
        if (qualityDrop != null)
          Wrap(
            spacing: 10,
            children: [
              if (savingPct != null)
                Text(
                  'Storage −$savingPct%',
                  style: AppText.style(
                    12,
                    weight: FontWeight.w700,
                    color: c.primary,
                    height: 18,
                    tabular: true,
                  ),
                ),
              Text(
                'Quality −$qualityDrop%',
                style: AppText.style(
                  12,
                  weight: FontWeight.w700,
                  color: c.tertiary,
                  height: 18,
                  tabular: true,
                ),
              ),
            ],
          ),
        if (quality != null)
          Row(
            children: [
              Icon(Icons.check_circle_rounded, size: 16, color: c.success),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  quality!,
                  style: AppText.style(
                    13,
                    weight: FontWeight.w600,
                    color: c.success,
                    height: 18,
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

/// One job in the queue with its live progress.
class ProgressRow extends StatelessWidget {
  const ProgressRow({
    super.key,
    required this.kind,
    required this.title,
    required this.hue,
    required this.state,
    required this.progress,
    this.eta,
    this.detail,
    this.done = false,
  });

  final MediaKind kind;
  final String title;
  final double hue;
  final String state;

  /// 0..100.
  final double progress;
  final String? eta;
  final String? detail;
  final bool done;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final right = done
        ? detail ?? ''
        : '${progress.round()}%${eta != null ? ' · $eta' : ''}';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: thumbGradient(hue),
              borderRadius: BorderRadius.circular(Space.radiusThumb),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(
                  kind == MediaKind.video
                      ? Icons.play_circle_rounded
                      : Icons.photo_rounded,
                  size: 22,
                  color: Colors.white,
                  shadows: _shadow,
                ),
                if (done)
                  Positioned(
                    right: 2,
                    bottom: 2,
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: c.success,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.check_rounded,
                        size: 14,
                        color: c.onSuccess,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        state,
                        style: AppText.style(
                          14,
                          weight: FontWeight.w600,
                          color: done ? c.success : c.textPrimary,
                          height: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        right,
                        textAlign: TextAlign.right,
                        style: AppText.style(
                          14,
                          color: c.textMuted,
                          height: 20,
                          tabular: true,
                        ),
                      ),
                    ),
                  ],
                ),
                if (!done) ...[
                  const SizedBox(height: 6),
                  ProgressBar(value: progress / 100, height: 6),
                ],
                const SizedBox(height: 6),
                Text(
                  !done && detail != null ? '$title · $detail' : title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppText.style(12, color: c.textMuted, height: 16),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Rounded linear progress bar.
class ProgressBar extends StatelessWidget {
  const ProgressBar({
    super.key,
    required this.value,
    this.height = 6,
    this.color,
    this.track,
    this.rounded = true,
  });

  final double value;
  final double height;
  final Color? color;
  final Color? track;
  final bool rounded;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final r = BorderRadius.circular(rounded ? 999 : 0);
    return Container(
      height: height,
      decoration: BoxDecoration(color: track ?? c.sunken, borderRadius: r),
      alignment: Alignment.centerLeft,
      child: AnimatedFractionallySizedBox(
        duration: Motion.of(context, const Duration(milliseconds: 300)),
        curve: Motion.standard,
        widthFactor: value.clamp(0, 1),
        heightFactor: 1,
        child: DecoratedBox(
          decoration: BoxDecoration(color: color ?? c.primary, borderRadius: r),
        ),
      ),
    );
  }
}
