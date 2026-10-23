import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/router.dart';
import '../../app/theme.dart';
import '../../core/domain/media_item.dart';
import '../../core/domain/media_kind.dart';
import '../flows.dart';
import '../widgets/button.dart';
import '../widgets/controls.dart';
import '../widgets/file_row.dart';
import '../widgets/layout.dart';
import '../widgets/savings.dart';
import 'file_sheet.dart';

enum _Tab { videos, photos, large }

/// Pick files to compress (FR-23).
class CompressScreen extends StatefulWidget {
  const CompressScreen({super.key});

  @override
  State<CompressScreen> createState() => _CompressScreenState();
}

class _CompressScreenState extends State<CompressScreen> {
  _Tab _tab = _Tab.videos;
  late Set<int> _selected = {
    for (final x in AppScope.of(
      context,
    ).engine.items.where((x) => !x.done).take(5))
      x.id,
  };

  bool _inTab(MediaItem x) => switch (_tab) {
    _Tab.videos => x.kind == MediaKind.video,
    _Tab.photos => x.kind == MediaKind.photo,
    _Tab.large => x.beforeGb >= 1,
  };

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    return ListenableBuilder(
      listenable: Listenable.merge([s.engine, s.billing, s.prefs]),
      builder: (context, _) {
        final undone = s.engine.items.where((x) => !x.done).toList();
        final list = undone.where(_inTab).toList()
          ..sort((a, b) => b.beforeGb.compareTo(a.beforeGb));
        final picked = undone.where((x) => _selected.contains(x.id)).toList();
        final save = picked.fold(0.0, (t, x) => t + x.savingGb);
        final total = undone.fold(0.0, (t, x) => t + x.savingGb);
        return Column(
          children: [
            ScreenHeader(
              title: 'Compress',
              subtitle: '${s.prefs.preset.label} preset · same resolution',
              actions: [
                HeaderIconButton(
                  Icons.tune_rounded,
                  label: 'Preset',
                  onTap: () => s.router.go(AppScreen.settings),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: StatCard(
                        tone: StatTone.tertiary,
                        icon: Icons.hourglass_top_rounded,
                        label: 'Can be freed',
                        value: total.toStringAsFixed(1),
                        unit: 'GB',
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: StatCard(
                        tone: StatTone.primary,
                        icon: Icons.checklist_rounded,
                        label: 'Selected',
                        value: save.toStringAsFixed(1),
                        unit: 'GB',
                        sub: '${picked.length} files',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (!s.billing.isPro) _allowance(context),
            TabsBar<_Tab>(
              tabs: [
                (
                  id: _Tab.videos,
                  label: 'Videos',
                  count: undone.where((x) => x.kind == MediaKind.video).length,
                ),
                (
                  id: _Tab.photos,
                  label: 'Photos',
                  count: undone.where((x) => x.kind == MediaKind.photo).length,
                ),
                (id: _Tab.large, label: 'Large files', count: null),
              ],
              value: _tab,
              onChanged: (t) => setState(() => _tab = t),
            ),
            Expanded(child: _list(context, list)),
            StickyFooter(
              children: [
                CButton(
                  picked.isEmpty
                      ? 'Select files to compress'
                      : 'Compress ${picked.length} files · save ${save.toStringAsFixed(1)} GB',
                  icon: Icons.compress_rounded,
                  size: ButtonSize.lg,
                  fullWidth: true,
                  onPressed: picked.isEmpty
                      ? null
                      : () => compressNow(s, picked),
                ),
              ],
            ),
          ],
        );
      },
    );
  }

  Widget _allowance(BuildContext context) {
    final c = context.c;
    final s = AppScope.of(context);
    final used = s.engine.allowanceUsedGb, limit = s.engine.allowanceLimitGb;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Material(
        color: c.card,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => s.router.go(AppScreen.paywall),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Free this month',
                        style: AppText.style(13, color: c.textMuted),
                      ),
                    ),
                    Flexible(
                      child: Text(
                        '${(used < limit ? used : limit).toStringAsFixed(1)} of ${limit.toStringAsFixed(1)} GB used',
                        textAlign: TextAlign.right,
                        style: AppText.style(
                          13,
                          weight: FontWeight.w700,
                          color: c.textPrimary,
                          tabular: true,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ProgressBar(value: used / limit),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _list(BuildContext context, List<MediaItem> list) {
    final c = context.c;
    return ColoredBox(
      color: c.card,
      child: ListView(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${list.length} files · biggest first',
                    style: AppText.style(13, color: c.textMuted),
                  ),
                ),
                CButton(
                  'Select all',
                  variant: ButtonVariant.text,
                  size: ButtonSize.sm,
                  onPressed: () => setState(
                    () => _selected = {..._selected, ...list.map((x) => x.id)},
                  ),
                ),
              ],
            ),
          ),
          if (list.isEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Text(
                'Nothing left to compress here.',
                textAlign: TextAlign.center,
                style: AppText.style(16, color: c.textMuted),
              ),
            ),
          for (final x in list)
            FileRow(
              kind: x.kind,
              title: x.title,
              meta: x.meta,
              before: x.before,
              after: x.after,
              savingPct: x.savingPct,
              qualityDrop: x.qualityDrop,
              hue: x.hue,
              selected: _selected.contains(x.id),
              onToggle: (v) => setState(
                () => v ? _selected.add(x.id) : _selected.remove(x.id),
              ),
              onTap: () => showFileSheet(context, x.id),
            ),
        ],
      ),
    );
  }
}
