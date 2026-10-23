import 'media_kind.dart';

enum HistoryOutcome { saved, kept, skipped }

class HistoryEntry {
  const HistoryEntry({
    required this.kind,
    required this.title,
    required this.hue,
    required this.beforeGb,
    required this.afterGb,
    required this.outcome,
    this.savingPct,
    this.note,
  });

  final MediaKind kind;
  final String title;
  final double hue;
  final double beforeGb;
  final double afterGb;
  final HistoryOutcome outcome;
  final int? savingPct;

  /// Why a file was kept or skipped, in plain words.
  final String? note;
}
