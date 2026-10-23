import 'package:flutter/material.dart';

import '../../app/theme.dart';

enum ChipTone {
  neutral,
  primary,
  success,
  error,
  accent,
  tertiary,
  warning,
  solid,
}

class StatusChip extends StatelessWidget {
  const StatusChip(
    this.label, {
    super.key,
    this.icon,
    this.tone = ChipTone.neutral,
    this.onTap,
  });

  /// The small "Pro" tag shown next to Pro-only controls.
  const StatusChip.pro({super.key})
    : label = 'Pro',
      icon = null,
      tone = ChipTone.primary,
      onTap = null;

  final String label;
  final IconData? icon;
  final ChipTone tone;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final (bg, fg) = switch (tone) {
      ChipTone.neutral => (c.sunken, c.textPrimary),
      ChipTone.primary => (c.primaryContainer, c.onPrimaryContainer),
      ChipTone.success => (c.success, c.onSuccess),
      ChipTone.error => (c.error, c.onError),
      ChipTone.accent => (c.accent, c.onAccent),
      ChipTone.tertiary => (c.tertiary, c.onTertiary),
      ChipTone.warning => (c.warningContainer, c.warning),
      ChipTone.solid => (c.primary, c.onPrimary),
    };
    final chip = Container(
      constraints: const BoxConstraints(minHeight: 32),
      padding: EdgeInsets.fromLTRB(icon != null ? 8 : 12, 4, 12, 4),
      decoration: ShapeDecoration(color: bg, shape: const StadiumBorder()),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18, color: fg),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Text(
              label,
              style: AppText.style(
                13,
                weight: FontWeight.w600,
                color: fg,
                height: 16,
              ),
            ),
          ),
        ],
      ),
    );
    if (onTap == null) return chip;
    return Semantics(
      button: true,
      child: InkWell(
        onTap: onTap,
        customBorder: const StadiumBorder(),
        child: chip,
      ),
    );
  }
}

class TrustBadge extends StatelessWidget {
  const TrustBadge({super.key, this.label = 'Processed on your phone'});

  final String label;

  @override
  Widget build(BuildContext context) {
    final muted = context.c.textMuted;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.lock_rounded, size: 16, color: muted),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            label,
            style: AppText.style(
              13,
              weight: FontWeight.w500,
              color: muted,
              height: 16,
            ),
          ),
        ),
      ],
    );
  }
}
