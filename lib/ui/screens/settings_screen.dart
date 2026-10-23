import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/router.dart';
import '../../app/theme.dart';
import '../../core/domain/photo_format.dart';
import '../../core/domain/preset.dart';
import '../widgets/controls.dart';
import '../widgets/layout.dart';
import '../widgets/overlays.dart';
import '../widgets/status_chip.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = AppScope.of(context);
    final p = s.prefs;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const ScreenHeader(title: 'Settings'),
        Expanded(
          child: ListenableBuilder(
            listenable: Listenable.merge([p, s.billing]),
            builder: (context, _) => ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              children: [
                if (!s.billing.isPro) ...[
                  const _ProBanner(),
                  const SizedBox(height: 16),
                ],
                const SectionLabel('Appearance'),
                const SizedBox(height: 8),
                SegmentedControl<ThemeMode>(
                  options: [
                    seg(
                      ThemeMode.light,
                      'Light',
                      icon: Icons.light_mode_rounded,
                    ),
                    seg(ThemeMode.dark, 'Dark', icon: Icons.dark_mode_rounded),
                    seg(
                      ThemeMode.system,
                      'System',
                      icon: Icons.contrast_rounded,
                    ),
                  ],
                  value: p.themeMode,
                  onChanged: (v) => p.update((p) => p.themeMode = v),
                ),
                const SizedBox(height: 16),
                LabeledCard(
                  label: 'Compression',
                  children: [
                    const _ResolutionNote(),
                    _PresetList(s: s),
                  ],
                ),
                const SizedBox(height: 16),
                LabeledCard(
                  label: 'File formats',
                  padding: const EdgeInsets.fromLTRB(0, 4, 0, 8),
                  children: [
                    ListRow(
                      icon: Icons.videocam_rounded,
                      iconBg: c.primary,
                      iconFg: c.onPrimary,
                      title: 'Videos',
                      subtitle: _formatLine(
                        c,
                        'MP4 · H.264 → ',
                        'MP4 · HEVC (H.265)',
                      ),
                    ),
                    ListRow(
                      icon: Icons.photo_rounded,
                      iconBg: c.tertiary,
                      iconFg: c.onTertiary,
                      title: 'Photos',
                      subtitle: _formatLine(
                        c,
                        'JPEG / PNG → ',
                        p.photoFormat.label,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(66, 0, 16, 4),
                      child: Wrap(
                        spacing: 8,
                        children: [
                          for (final f in PhotoFormat.values)
                            StatusChip(
                              f.label,
                              tone: p.photoFormat == f
                                  ? ChipTone.solid
                                  : ChipTone.neutral,
                              onTap: () => p.update((p) => p.photoFormat = f),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                LabeledCard(
                  label: 'When to run',
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: CSwitch(
                        label: 'Only while charging',
                        description: 'For auto-compress',
                        value: p.onlyWhileCharging,
                        onChanged: (v) =>
                            p.update((p) => p.onlyWhileCharging = v),
                      ),
                    ),
                    const ListRow(
                      icon: Icons.device_thermostat_rounded,
                      title: 'Pause when warm',
                      subtitle: Text('Always on, keeps your phone cool'),
                      trailing: StatusChip('On', tone: ChipTone.success),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Minimum battery',
                            style: AppText.style(14, color: c.textMuted),
                          ),
                          const SizedBox(height: 8),
                          SegmentedControl<int>(
                            small: true,
                            options: [
                              seg(20, '20%'),
                              seg(30, '30%'),
                              seg(50, '50%'),
                            ],
                            value: p.minBattery,
                            onChanged: (v) => p.update((p) => p.minBattery = v),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                LabeledCard(
                  label: 'Media',
                  children: [
                    ListRow(
                      icon: Icons.perm_media_rounded,
                      iconBg: c.tertiary,
                      iconFg: c.onTertiary,
                      title: 'Originals',
                      subtitle: const Text(
                        'Ask every time · 2 albums excluded',
                      ),
                      chevron: true,
                      onTap: () => showToast(
                        context,
                        'Choose when originals are removed and which albums to skip',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                LabeledCard(
                  label: 'Privacy',
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: CSwitch(
                        label: 'Share anonymous usage stats',
                        description: 'Never file names, photos or locations',
                        value: p.analytics,
                        onChanged: (v) => p.update((p) => p.analytics = v),
                      ),
                    ),
                    ListRow(
                      icon: Icons.battery_saver_rounded,
                      title: 'Battery guide',
                      subtitle: const Text(
                        'Stop your phone from pausing Compressly',
                      ),
                      chevron: true,
                      onTap: () => s.router.go(AppScreen.battery),
                    ),
                    ListRow(
                      icon: Icons.restore_rounded,
                      title: 'Restore purchases',
                      onTap: () async {
                        final ok = await s.billing.restore();
                        if (!context.mounted) return;
                        showToast(
                          context,
                          ok
                              ? 'Purchase restored'
                              : 'No purchase found on this Google account',
                        );
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                LabeledCard(
                  label: 'Legal',
                  children: [
                    for (final (icon, t) in [
                      (Icons.privacy_tip_rounded, 'Privacy policy'),
                      (Icons.gavel_rounded, 'Terms and conditions'),
                      (Icons.currency_rupee_rounded, 'Refund policy'),
                    ])
                      ListRow(
                        icon: icon,
                        title: t,
                        chevron: true,
                        onTap: () =>
                            showToast(context, 'Opens ${t.toLowerCase()}'),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  'Compressly 1.0.0 · Made in India',
                  textAlign: TextAlign.center,
                  style: AppText.style(12, color: c.textMuted),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _formatLine(CTokens c, String from, String to) => Text.rich(
    TextSpan(
      text: from,
      children: [
        TextSpan(
          text: to,
          style: TextStyle(fontWeight: FontWeight.w700, color: c.textPrimary),
        ),
      ],
    ),
    style: AppText.style(12, color: c.textMuted, height: 16),
  );
}

class _ProBanner extends StatelessWidget {
  const _ProBanner();

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Material(
      color: c.primary,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => AppScope.of(context).router.go(AppScreen.paywall),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(
                Icons.workspace_premium_rounded,
                size: 28,
                color: c.onPrimary,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Compressly Pro',
                      style: AppText.style(
                        16,
                        weight: FontWeight.w700,
                        color: c.onPrimary,
                      ),
                    ),
                    Text(
                      'Unlimited savings, auto-compress, no ads',
                      style: AppText.style(
                        13,
                        color: c.onPrimary.withValues(alpha: .85),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: c.onPrimary),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResolutionNote extends StatelessWidget {
  const _ResolutionNote();

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: c.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.info_rounded, size: 20, color: c.onPrimaryContainer),
          const SizedBox(width: 10),
          Expanded(
            child: Text.rich(
              const TextSpan(
                children: [
                  TextSpan(
                    text: 'Resolution never changes.',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  TextSpan(text: ' Presets set storage and quality reduction.'),
                ],
              ),
              style: AppText.style(13, color: c.onPrimaryContainer, height: 19),
            ),
          ),
        ],
      ),
    );
  }
}

class _PresetList extends StatelessWidget {
  const _PresetList({required this.s});

  final AppScope s;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
    child: Column(
      children: [
        for (final (i, preset) in Preset.values.indexed) ...[
          if (i > 0) const SizedBox(height: 8),
          _row(context, preset),
        ],
      ],
    ),
  );

  Widget _row(BuildContext context, Preset preset) {
    final c = context.c;
    final on = s.prefs.preset == preset;
    final locked = preset.proOnly && !s.billing.isPro;
    final est = s.engine.presetEstimate(preset);
    final tag = locked
        ? 'Pro'
        : switch (preset) {
            Preset.high => 'Smallest change',
            Preset.balanced => 'Recommended',
            Preset.max => 'Most space',
          };
    // Figures stay compact so the preset name keeps room at large text.
    Widget figure(String v, String label, Color color) =>
        MediaQuery.withClampedTextScaling(
          maxScaleFactor: 1.3,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                v,
                style: AppText.style(
                  17,
                  weight: FontWeight.w800,
                  color: color,
                  height: 22,
                  tabular: true,
                ),
              ),
              Text(
                label,
                style: AppText.style(
                  10,
                  weight: FontWeight.w700,
                  color: c.textMuted,
                  height: 14,
                  spacing: .06,
                ),
              ),
            ],
          ),
        );
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: on,
      child: Material(
        color: on
            ? Color.alphaBlend(c.primary.withValues(alpha: .08), c.card)
            : Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: BorderSide(
            color: on ? c.primary : c.borderDefault,
            width: on ? 2 : 1,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => locked
              ? s.router.go(AppScreen.paywall)
              : s.prefs.update((p) => p.preset = preset),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 64),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                children: [
                  RadioDot(on: on),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          preset.label,
                          style: AppText.style(
                            15,
                            weight: FontWeight.w700,
                            color: c.textPrimary,
                            height: 20,
                          ),
                        ),
                        Row(
                          children: [
                            if (locked) ...[
                              Icon(
                                Icons.lock_rounded,
                                size: 13,
                                color: c.primary,
                              ),
                              const SizedBox(width: 3),
                            ],
                            Flexible(
                              child: Text(
                                tag,
                                style: AppText.style(
                                  12,
                                  weight: FontWeight.w600,
                                  color: locked ? c.primary : c.success,
                                  height: 16,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  figure(
                    '−${est.storagePct}%',
                    'STORAGE',
                    on ? c.primary : c.textPrimary,
                  ),
                  Container(
                    width: 1,
                    height: 36,
                    margin: const EdgeInsets.symmetric(horizontal: 10),
                    color: c.borderDefault,
                  ),
                  ConstrainedBox(
                    constraints: const BoxConstraints(minWidth: 44),
                    child: figure(
                      '−${est.qualityDrop}%',
                      'QUALITY',
                      on ? c.tertiary : c.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
