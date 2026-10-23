import 'byte_format.dart';
import 'media_kind.dart';

/// One photo or video as the UI sees it. Sizes are in gigabytes.
class MediaItem {
  const MediaItem({
    required this.id,
    required this.kind,
    required this.title,
    required this.meta,
    required this.beforeGb,
    required this.afterGb,
    required this.savingPct,
    required this.qualityDrop,
    required this.hue,
    this.duration,
    this.done = false,
  });

  final int id;
  final MediaKind kind;
  final String title;

  /// Resolution, frame rate and length, e.g. "4K · 30 fps · 2:14".
  final String meta;
  final String? duration;
  final double beforeGb;
  final double afterGb;
  final int savingPct;
  final int qualityDrop;

  /// Placeholder thumbnail hue until real thumbnails arrive.
  final double hue;
  final bool done;

  bool get isVideo => kind == MediaKind.video;
  double get savingGb => beforeGb - afterGb;
  String get before => formatGb(beforeGb);
  String get after => formatGb(afterGb);

  MediaItem copyWith({double? afterGb, int? savingPct, bool? done}) =>
      MediaItem(
        id: id,
        kind: kind,
        title: title,
        meta: meta,
        duration: duration,
        beforeGb: beforeGb,
        afterGb: afterGb ?? this.afterGb,
        savingPct: savingPct ?? this.savingPct,
        qualityDrop: qualityDrop,
        hue: hue,
        done: done ?? this.done,
      );
}
