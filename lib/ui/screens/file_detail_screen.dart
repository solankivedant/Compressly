import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/domain/byte_format.dart';
import '../../core/domain/media_item.dart';
import '../../core/domain/quality_words.dart';
import '../flows.dart';
import '../widgets/button.dart';
import '../widgets/layout.dart';
import '../widgets/status_chip.dart';
import '../widgets/thumb.dart';

/// Before/after compare with the technical details (the one place where
/// codec names and SSIM appear).
class FileDetailScreen extends StatefulWidget {
  const FileDetailScreen({super.key, required this.itemId});

  final int itemId;

  @override
  State<FileDetailScreen> createState() => _FileDetailScreenState();
}

class _FileDetailScreenState extends State<FileDetailScreen> {
  double _slider = 50;

  void _slide(Offset local, double width) =>
      setState(() => _slider = (local.dx / width * 100).clamp(2, 98));

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = AppScope.of(context);
    final f = s.engine.items.firstWhere((x) => x.id == widget.itemId);
    final stats = [
      ('Before', f.before, c.tertiary),
      (f.done ? 'After' : 'After (est.)', f.after, c.success),
      ('Saves', formatGb(f.savingGb), c.textPrimary),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ScreenHeader(
          title: f.title,
          subtitle: f.meta,
          titleSize: 20,
          onBack: s.router.back,
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            children: [
              _compare(c, f),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: c.successContainer,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Icon(Icons.check_circle_rounded, color: c.success),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${f.done ? '' : 'Expected: '}${qualityWords(f.qualityDrop)}',
                            style: AppText.style(
                              16,
                              weight: FontWeight.w700,
                              color: c.success,
                            ),
                          ),
                          Text(
                            f.done ? 'Quality checked on every frame' : 'Checked after compressing. Kept as is if not.',
                            style: AppText.style(13, color: c.textMuted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  for (final (i, (l, v, color)) in stats.indexed) ...[
                    if (i > 0) const SizedBox(width: 8),
                    Expanded(
                      child: CardBox(
                        radius: 14,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l,
                              style: AppText.style(
                                12,
                                weight: FontWeight.w600,
                                color: c.textMuted,
                              ),
                            ),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                v,
                                style: AppText.style(
                                  20,
                                  weight: FontWeight.w800,
                                  color: color,
                                  height: 26,
                                  tabular: true,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 12),
              LabeledCard(
                label: 'Details',
                children: [
                  for (final (l, v) in _details(f))
                    ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 48),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                l,
                                style: AppText.style(14, color: c.textMuted),
                              ),
                            ),
                            Text(
                              v,
                              textAlign: TextAlign.right,
                              style: AppText.style(
                                14,
                                weight: FontWeight.w600,
                                color: c.textPrimary,
                                tabular: true,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              const Center(child: TrustBadge()),
            ],
          ),
        ),
        if (!f.done)
          StickyFooter(
            children: [
              CButton(
                'Compress this file · save ${formatGb(f.savingGb)}',
                icon: Icons.compress_rounded,
                size: ButtonSize.lg,
                fullWidth: true,
                onPressed: () => compressNow(s, [f]),
              ),
            ],
          ),
      ],
    );
  }

  List<(String, String)> _details(MediaItem f) {
    final res = f.meta.startsWith('4K')
        ? '3840 × 2160'
        : f.meta.startsWith('1080p')
        ? '1920 × 1080'
        : '8160 × 6120';
    final fps = RegExp(r'(\d+) fps').firstMatch(f.meta)?.group(1);
    final secs =
        f.duration?.split(':').fold(0, (a, x) => a * 60 + int.parse(x)) ?? 60;
    String mbps(double gb) => '${(gb * 8000 / secs).toStringAsFixed(0)} Mbps';
    final ssim = f.qualityDrop >= 4 ? '0.96' : '0.98';
    return [
      ('Format', f.isVideo ? 'H.264 → HEVC' : 'JPEG → HEIC'),
      ('Resolution', '$res · kept'),
      if (f.isVideo) ...[
        ('Frame rate', '$fps fps · kept'),
        ('Length', '${f.duration} · kept'),
        ('Bitrate', '${mbps(f.beforeGb)} → ${mbps(f.afterGb)}'),
      ] else
        ('Date and location', 'Kept'),
      ('Quality score', f.done ? 'SSIM $ssim' : 'Target SSIM ≥ 0.95'),
    ];
  }

  Widget _compare(CTokens c, MediaItem f) {
    final tag = AppText.style(12, weight: FontWeight.w700);
    return LayoutBuilder(
      builder: (context, box) => Semantics(
        label: 'Before and after comparison. Drag to compare.',
        slider: true,
        value: '${_slider.round()}%',
        child: GestureDetector(
          onHorizontalDragUpdate: (d) => _slide(d.localPosition, box.maxWidth),
          onTapDown: (d) => _slide(d.localPosition, box.maxWidth),
          child: Container(
            height: 260,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              gradient: thumbGradient(f.hue),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Stack(
              children: [
                Center(
                  child: Icon(
                    f.isVideo ? Icons.play_circle_rounded : Icons.photo_rounded,
                    size: 48,
                    color: Colors.white.withValues(alpha: .35),
                  ),
                ),
                Positioned(
                  top: 10,
                  left: 10,
                  child: _tag(
                    c.tertiary,
                    Text(
                      'Before · ${f.before}',
                      style: tag.copyWith(color: c.onTertiary),
                    ),
                  ),
                ),
                Positioned(
                  top: 10,
                  right: 10,
                  child: _tag(
                    c.success,
                    Text(
                      'After · ${f.done ? '' : '~'}${f.after}',
                      style: tag.copyWith(color: c.onSuccess),
                    ),
                  ),
                ),
                Positioned(
                  top: 0,
                  bottom: 0,
                  left: box.maxWidth * _slider / 100 - 1,
                  child: Container(width: 2, color: Colors.white),
                ),
                Positioned(
                  top: 110,
                  left: box.maxWidth * _slider / 100 - 20,
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Color(0x4D000000),
                          offset: Offset(0, 4),
                          blurRadius: 12,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.code_rounded,
                      size: 22,
                      color: Color(0xFF10131A),
                    ),
                  ),
                ),
                Positioned(
                  left: 10,
                  bottom: 10,
                  child: Text(
                    f.done ? 'Drag to compare' : 'Preview · drag to compare',
                    style: AppText.style(
                      12,
                      weight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _tag(Color bg, Widget child) => Container(
    height: 26,
    padding: const EdgeInsets.symmetric(horizontal: 10),
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(8),
    ),
    child: child,
  );
}
