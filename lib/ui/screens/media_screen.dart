import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/domain/byte_format.dart';
import '../../core/domain/media_item.dart';
import '../../core/domain/media_kind.dart';
import '../widgets/button.dart';
import '../widgets/controls.dart';
import '../widgets/layout.dart';
import '../widgets/overlays.dart';
import '../widgets/status_chip.dart';
import '../widgets/thumb.dart';
import 'file_sheet.dart';

enum _Filter { all, original, done }

/// Gallery grid with before/after filters.
class MediaScreen extends StatefulWidget {
  const MediaScreen({super.key});

  @override
  State<MediaScreen> createState() => _MediaScreenState();
}

class _MediaScreenState extends State<MediaScreen> {
  _Filter _filter = _Filter.all;
  MediaKind? _kind;
  bool _desc = true;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = AppScope.of(context);
    return ListenableBuilder(
      listenable: s.engine,
      builder: (context, _) {
        final files = s.engine.items;
        final done = files.where((x) => x.done).toList();
        double shown(MediaItem x) => x.done ? x.afterGb : x.beforeGb;
        final list =
            files
                .where(
                  (x) => switch (_filter) {
                    _Filter.all => true,
                    _Filter.original => !x.done,
                    _Filter.done => x.done,
                  },
                )
                .where((x) => _kind == null || x.kind == _kind)
                .toList()
              ..sort(
                (a, b) => _desc
                    ? shown(b).compareTo(shown(a))
                    : shown(a).compareTo(shown(b)),
              );
        final was = done.fold(0.0, (t, x) => t + x.beforeGb),
            now = done.fold(0.0, (t, x) => t + x.afterGb);
        final note =
            '${list.length} items · Size: ${_desc ? 'largest first' : 'smallest first'}'
            '${_filter == _Filter.done && done.isNotEmpty ? ' · were ${formatGb(was)}, now ${formatGb(now)}' : ''}';
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ScreenHeader(
              title: 'Media',
              subtitle: '${files.length} items · ${done.length} compressed',
              actions: [
                HeaderIconButton(
                  Icons.search_rounded,
                  label: 'Search',
                  onTap: () => showToast(context, 'Search by name or date'),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SegmentedControl<_Filter>(
                    options: [
                      seg(_Filter.all, 'All', count: files.length),
                      seg(
                        _Filter.original,
                        'Original',
                        count: files.length - done.length,
                      ),
                      seg(_Filter.done, 'Done', count: done.length),
                    ],
                    value: _filter,
                    onChanged: (v) => setState(() => _filter = v),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final (k, label, icon) in [
                              (null, 'All', Icons.apps_rounded),
                              (
                                MediaKind.video,
                                'Videos',
                                Icons.videocam_rounded,
                              ),
                              (MediaKind.photo, 'Photos', Icons.photo_rounded),
                            ])
                              StatusChip(
                                label,
                                icon: icon,
                                tone: _kind == k
                                    ? ChipTone.solid
                                    : ChipTone.neutral,
                                onTap: () => setState(() => _kind = k),
                              ),
                          ],
                        ),
                      ),
                      _sortButton(c),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(note, style: AppText.style(12, color: c.textMuted)),
                ],
              ),
            ),
            Expanded(
              child: list.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(32),
                      child: Text(
                        'No items match this filter.',
                        textAlign: TextAlign.center,
                        style: AppText.style(16, color: c.textMuted),
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            mainAxisSpacing: 8,
                            crossAxisSpacing: 8,
                            childAspectRatio: 1 / 1.05,
                          ),
                      itemCount: list.length,
                      itemBuilder: (context, i) => _MediaTile(item: list[i]),
                    ),
            ),
          ],
        );
      },
    );
  }

  Widget _sortButton(CTokens c) => Semantics(
    button: true,
    label: 'Sort by size',
    child: Material(
      color: c.card,
      shape: StadiumBorder(side: BorderSide(color: c.borderDefault)),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: () => setState(() => _desc = !_desc),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.sort_rounded, size: 18, color: c.textPrimary),
              const SizedBox(width: 2),
              Icon(
                _desc
                    ? Icons.arrow_downward_rounded
                    : Icons.arrow_upward_rounded,
                size: 16,
                color: c.textPrimary,
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _MediaTile extends StatelessWidget {
  const _MediaTile({required this.item});

  final MediaItem item;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final x = item;
    final white = AppText.style(
      12,
      weight: FontWeight.w700,
      color: Colors.white,
      tabular: true,
    );
    final badgeFg = x.done ? c.onAccent : c.onTertiary;
    return Semantics(
      button: true,
      label:
          '${x.title}, ${x.done ? 'compressed, ${x.after}' : 'original, ${x.before}'}',
      excludeSemantics: true,
      child: GestureDetector(
        onTap: () => showFileSheet(context, x.id),
        child: Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            gradient: thumbGradient(x.hue),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Stack(
            children: [
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(gradient: bottomScrim(.6, .45)),
                ),
              ),
              Positioned(
                top: 6,
                right: 6,
                child: Container(
                  height: 22,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: ShapeDecoration(
                    color: x.done ? c.accent : c.tertiary,
                    shape: const StadiumBorder(),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (x.done)
                        Icon(Icons.check_rounded, size: 14, color: badgeFg),
                      Text(
                        x.done ? '−${x.savingPct}%' : 'Original',
                        style: white.copyWith(color: badgeFg),
                      ),
                    ],
                  ),
                ),
              ),
              Positioned(
                left: 8,
                right: 8,
                bottom: 6,
                child: MediaQuery.withClampedTextScaling(
                  maxScaleFactor: 1.3,
                  child: Row(
                    children: [
                      Icon(
                        x.isVideo
                            ? Icons.play_circle_rounded
                            : Icons.image_rounded,
                        size: 15,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          x.duration ?? '',
                          style: white,
                          maxLines: 1,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerRight,
                          child: Text(
                            x.done ? x.after : x.before,
                            style: white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
