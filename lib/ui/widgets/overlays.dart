import 'package:flutter/material.dart';

import '../../app/router.dart';
import '../../app/theme.dart';
import 'button.dart';

/// Short confirmation at the bottom of the screen.
void showToast(BuildContext context, String message) {
  final c = context.c;
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        duration: const Duration(milliseconds: 2800),
        backgroundColor: c.sheet,
        elevation: 6,
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: c.borderSubtle),
        ),
        content: Row(
          children: [
            Icon(Icons.check_circle_rounded, size: 20, color: c.success),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: AppText.style(
                  14,
                  weight: FontWeight.w600,
                  color: c.textPrimary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
}

/// Modal sheet with the design-system shape: handle, rounded top corners.
Future<T?> showCSheet<T>(BuildContext context, WidgetBuilder builder) {
  final c = context.c;
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: c.sheet,
    barrierColor: c.scrim,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular(Space.radiusSheet),
      ),
    ),
    constraints: BoxConstraints(
      maxHeight: MediaQuery.sizeOf(context).height * .94,
    ),
    builder: builder,
  );
}

class SheetHandle extends StatelessWidget {
  const SheetHandle({super.key, this.width = 32});

  final double width;

  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      width: width,
      height: 4,
      decoration: BoxDecoration(
        color: context.c.borderDefault,
        borderRadius: BorderRadius.circular(2),
      ),
    ),
  );
}

/// Yes/no sheet. Resolves true for the primary action, false for the
/// secondary one and null when dismissed.
Future<bool?> showConfirmSheet(
  BuildContext context, {
  required String title,
  required String body,
  required String primaryLabel,
  required String secondaryLabel,
}) => showCSheet<bool>(context, (context) {
  final c = context.c;
  return SafeArea(
    child: SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SheetHandle(),
          const SizedBox(height: 20),
          Text(
            title,
            style: AppText.style(
              20,
              weight: FontWeight.w600,
              color: c.textPrimary,
              height: 28,
            ),
          ),
          const SizedBox(height: 16),
          Text(body, style: AppText.style(16, color: c.textMuted, height: 24)),
          const SizedBox(height: 16),
          CButton(
            primaryLabel,
            size: ButtonSize.lg,
            fullWidth: true,
            onPressed: () => Navigator.pop(context, true),
          ),
          const SizedBox(height: 8),
          CButton(
            secondaryLabel,
            variant: ButtonVariant.text,
            fullWidth: true,
            onPressed: () => Navigator.pop(context, false),
          ),
        ],
      ),
    ),
  );
});

typedef NavItem = ({
  NavTab id,
  String label,
  IconData icon,
  IconData activeIcon,
});

class BottomNav extends StatelessWidget {
  const BottomNav({
    super.key,
    required this.items,
    required this.value,
    required this.onChanged,
  });

  final List<NavItem> items;
  final NavTab value;
  final ValueChanged<NavTab> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      decoration: BoxDecoration(
        color: c.card,
        border: Border(top: BorderSide(color: c.borderSubtle)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 80,
          child: Row(
            children: [
              for (final it in items) Expanded(child: _item(context, it)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _item(BuildContext context, NavItem it) {
    final c = context.c;
    final on = it.id == value;
    return Semantics(
      selected: on,
      button: true,
      label: it.label,
      excludeSemantics: true,
      child: InkWell(
        onTap: () => onChanged(it.id),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: Motion.of(context, Motion.screen),
              curve: Motion.standard,
              width: 60,
              height: 32,
              decoration: ShapeDecoration(
                color: on ? c.primary : Colors.transparent,
                shape: const StadiumBorder(),
              ),
              child: Icon(
                on ? it.activeIcon : it.icon,
                color: on ? c.onPrimary : c.textMuted,
              ),
            ),
            const SizedBox(height: 4),
            // Like Material's NavigationBar, labels stop growing at 1.3× so
            // the 80 dp bar never clips; Semantics still reads the label.
            Text(
              it.label,
              textScaler: MediaQuery.textScalerOf(context)
                  .clamp(maxScaleFactor: 1.3),
              style: AppText.style(
                12,
                weight: on ? FontWeight.w700 : FontWeight.w500,
                color: on ? c.textPrimary : c.textMuted,
                height: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One plan on the paywall (radio).
class PlanCard extends StatelessWidget {
  const PlanCard({
    super.key,
    required this.name,
    required this.price,
    required this.selected,
    required this.onSelect,
    this.period,
    this.note,
    this.badge,
  });

  final String name;
  final String price;
  final String? period;
  final String? note;
  final String? badge;
  final bool selected;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final card = Material(
      color: selected ? c.primaryContainer : c.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Space.radiusCard),
        side: BorderSide(
          color: selected ? c.primary : c.borderDefault,
          width: selected ? 2 : 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onSelect,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 72),
          child: Padding(
            padding: EdgeInsets.all(selected ? 15 : 16),
            child: Row(
              children: [
                Icon(
                  selected
                      ? Icons.radio_button_checked_rounded
                      : Icons.radio_button_unchecked_rounded,
                  color: selected ? c.primary : c.textMuted,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: AppText.style(
                          16,
                          weight: FontWeight.w600,
                          color: c.textPrimary,
                          height: 24,
                        ),
                      ),
                      if (note != null)
                        Text(
                          note!,
                          style: AppText.style(
                            13,
                            color: c.textMuted,
                            height: 18,
                          ),
                        ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      price,
                      style: AppText.style(
                        18,
                        weight: FontWeight.w700,
                        color: c.textPrimary,
                        height: 24,
                        tabular: true,
                      ),
                    ),
                    if (period != null)
                      Text(
                        period!,
                        style: AppText.style(
                          12,
                          color: c.textMuted,
                          height: 16,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selected,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          card,
          if (badge != null)
            Positioned(
              top: -11,
              right: 16,
              child: Container(
                height: 22,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                alignment: Alignment.center,
                decoration: ShapeDecoration(
                  color: c.primary,
                  shape: const StadiumBorder(),
                ),
                child: Text(
                  badge!,
                  style: AppText.style(
                    12,
                    weight: FontWeight.w700,
                    color: c.onPrimary,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
