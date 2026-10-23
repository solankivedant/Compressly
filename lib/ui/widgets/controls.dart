import 'package:flutter/material.dart';

import '../../app/theme.dart';

typedef SegmentOption<T> = ({T id, String label, IconData? icon, int? count});

SegmentOption<T> seg<T>(T id, String label, {IconData? icon, int? count}) =>
    (id: id, label: label, icon: icon, count: count);

/// Pill-shaped segmented control (radio group).
class SegmentedControl<T> extends StatelessWidget {
  const SegmentedControl({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.small = false,
  });

  final List<SegmentOption<T>> options;
  final T value;
  final ValueChanged<T> onChanged;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final h = (small ? 36.0 : 44.0) - 8;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: ShapeDecoration(
        color: c.sunken,
        shape: const StadiumBorder(),
      ),
      child: Row(
        children: [
          for (final (i, o) in options.indexed) ...[
            if (i > 0) const SizedBox(width: 4),
            Expanded(child: _segment(context, o, h)),
          ],
        ],
      ),
    );
  }

  Widget _segment(BuildContext context, SegmentOption<T> o, double h) {
    final c = context.c;
    final on = o.id == value;
    final fg = on ? c.onPrimary : c.textMuted;
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: on,
      button: true,
      child: GestureDetector(
        onTap: () => onChanged(o.id),
        child: AnimatedContainer(
          duration: Motion.of(context, Motion.screen),
          curve: Motion.standard,
          height: h,
          decoration: ShapeDecoration(
            color: on ? c.primary : Colors.transparent,
            shape: const StadiumBorder(),
          ),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (o.icon != null) ...[
                    Icon(o.icon, size: 18, color: fg),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    o.label,
                    style: AppText.style(
                      14,
                      weight: FontWeight.w600,
                      color: fg,
                    ),
                  ),
                  if (o.count != null) ...[
                    const SizedBox(width: 6),
                    Text(
                      '${o.count}',
                      style: AppText.style(
                        14,
                        weight: FontWeight.w600,
                        color: fg.withValues(alpha: .7),
                        tabular: true,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Design-system switch track (52×32), optionally with a label row.
class CSwitch extends StatelessWidget {
  const CSwitch({
    super.key,
    required this.value,
    required this.onChanged,
    this.label,
    this.description,
    this.trailing,
  });

  final bool value;
  final ValueChanged<bool>? onChanged;
  final String? label;
  final String? description;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final d = Motion.of(context, Motion.screen);
    final track = AnimatedContainer(
      duration: d,
      curve: Motion.standard,
      width: 52,
      height: 32,
      decoration: ShapeDecoration(
        color: value ? c.primary : c.sunken,
        shape: StadiumBorder(
          side: BorderSide(color: value ? c.primary : c.textMuted, width: 2),
        ),
      ),
      child: Stack(
        children: [
          AnimatedPositioned(
            duration: d,
            curve: Motion.standard,
            left: value ? 20 : 2,
            top: value ? 2 : 6,
            child: AnimatedContainer(
              duration: d,
              width: value ? 24 : 16,
              height: value ? 24 : 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: value ? c.onPrimary : c.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
    final toggle = onChanged == null ? null : () => onChanged!(!value);
    if (label == null) {
      return Semantics(
        toggled: value,
        child: GestureDetector(onTap: toggle, child: track),
      );
    }
    return Semantics(
      toggled: value,
      label: label,
      excludeSemantics: true,
      child: InkWell(
        onTap: toggle,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 64),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Wrap(
                      spacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          label!,
                          style: AppText.style(
                            16,
                            color: c.textPrimary,
                            height: 24,
                          ),
                        ),
                        ?trailing,
                      ],
                    ),
                    if (description != null)
                      Text(
                        description!,
                        style: AppText.style(
                          14,
                          color: c.textMuted,
                          height: 20,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              track,
            ],
          ),
        ),
      ),
    );
  }
}

typedef TabOption<T> = ({T id, String label, int? count});

/// Underlined tabs (Compress screen).
class TabsBar<T> extends StatelessWidget {
  const TabsBar({
    super.key,
    required this.tabs,
    required this.value,
    required this.onChanged,
  });

  final List<TabOption<T>> tabs;
  final T value;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: c.borderSubtle)),
      ),
      child: Row(
        children: [
          for (final t in tabs)
            Expanded(
              child: Semantics(
                selected: t.id == value,
                button: true,
                child: InkWell(
                  onTap: () => onChanged(t.id),
                  child: SizedBox(
                    height: 48,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Text.rich(
                          TextSpan(
                            text: t.label,
                            children: [
                              if (t.count != null)
                                TextSpan(
                                  text: '  ${t.count}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w500,
                                    fontFeatures: AppText.tabular,
                                  ),
                                ),
                            ],
                          ),
                          style: AppText.style(
                            14,
                            weight: FontWeight.w600,
                            color: t.id == value ? c.primary : c.textMuted,
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          left: 0,
                          right: 0,
                          child: FractionallySizedBox(
                            widthFactor: .56,
                            child: Container(
                              height: 3,
                              decoration: BoxDecoration(
                                color: t.id == value
                                    ? c.primary
                                    : Colors.transparent,
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(3),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Design-system radio dot (thick ring when on).
class RadioDot extends StatelessWidget {
  const RadioDot({super.key, required this.on});

  final bool on;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: c.card,
        border: Border.all(
          color: on ? c.primary : c.textMuted,
          width: on ? 6 : 2,
        ),
      ),
    );
  }
}
