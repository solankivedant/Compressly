import 'package:flutter/material.dart';

import '../../app/theme.dart';

enum ButtonVariant { primary, tonal, secondary, text }

enum ButtonSize {
  sm(36),
  md(48),
  lg(56);

  const ButtonSize(this.height);
  final double height;
}

/// Design-system button. Disabled when [onPressed] is null.
class CButton extends StatelessWidget {
  const CButton(
    this.label, {
    super.key,
    this.onPressed,
    this.variant = ButtonVariant.primary,
    this.size = ButtonSize.md,
    this.icon,
    this.trailing,
    this.fullWidth = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final ButtonSize size;
  final IconData? icon;
  final Widget? trailing;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final (bg, fg, border) = switch (variant) {
      ButtonVariant.primary => (c.primary, c.onPrimary, Colors.transparent),
      ButtonVariant.tonal => (
        c.primaryContainer,
        c.onPrimaryContainer,
        Colors.transparent,
      ),
      ButtonVariant.secondary => (
        Colors.transparent,
        c.primary,
        c.borderDefault,
      ),
      ButtonVariant.text => (Colors.transparent, c.primary, Colors.transparent),
    };
    final hPad = variant == ButtonVariant.text
        ? 12.0
        : size == ButtonSize.sm
        ? 14.0
        : 20.0;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(Space.radiusButton),
      side: BorderSide(color: border),
    );
    final content = Row(
      mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 20, color: fg),
          const SizedBox(width: 8),
        ],
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppText.style(
              size == ButtonSize.lg ? 16 : 14,
              weight: FontWeight.w600,
              color: fg,
              spacing: .01,
            ),
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 8), trailing!],
      ],
    );
    return Opacity(
      opacity: onPressed == null ? .38 : 1,
      child: Material(
        color: bg,
        shape: shape,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onPressed,
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: size.height),
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: hPad),
              child: Center(widthFactor: fullWidth ? null : 1, child: content),
            ),
          ),
        ),
      ),
    );
  }
}

/// 48×48 icon button used in screen headers.
class HeaderIconButton extends StatelessWidget {
  const HeaderIconButton(
    this.icon, {
    super.key,
    required this.label,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: Space.tapTarget,
    child: IconButton(
      onPressed: onTap,
      tooltip: label,
      icon: Icon(icon, color: context.c.textPrimary),
    ),
  );
}
