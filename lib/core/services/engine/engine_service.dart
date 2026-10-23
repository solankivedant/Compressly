import 'package:flutter/foundation.dart';

import '../../domain/history_entry.dart';
import '../../domain/media_item.dart';
import '../../domain/preset.dart';

typedef HistoryGroup = ({String label, List<HistoryEntry> rows});
typedef PresetEstimate = ({int storagePct, int qualityDrop});
typedef ScanSummary = ({
  double usedGb,
  double freeableGb,
  double videosGb,
  double photosGb,
});

/// Everything the UI reads from or asks of the compression engine.
/// The native Room DB is the source of truth; this is a read-through view.
abstract class EngineService extends ChangeNotifier {
  List<MediaItem> get items;

  /// Space confirmed freed: originals actually deleted (FR-28).
  double get freedGb;
  int get compressedCount;

  /// Compressed, original still kept, waiting for the user to remove it.
  double get pendingGb;
  List<MediaItem> get pendingBatch;
  double get stillToFreeGb;
  double get deviceTotalGb;
  double get deviceUsedGb;

  PresetEstimate presetEstimate(Preset preset);

  /// 0..1 while the first library scan runs.
  double get scanProgress;
  void startScan();

  /// What the first scan found, for the Savings result screen.
  ScanSummary get scanSummary;

  List<MediaItem> get batch;

  /// 0..batch.length; the integer part is the number of finished files.
  double get queueProgress;
  bool get paused;
  bool get queueFinished => batch.isNotEmpty && queueProgress >= batch.length;
  void startQueue(List<MediaItem> files);
  void setPaused(bool value);

  /// Removes originals for [files] (after the system dialog) and returns the
  /// gigabytes freed.
  double removeOriginals(List<MediaItem> files, {required bool fromPending});

  /// Keeps originals for now and returns the gigabytes now pending.
  double keepBoth(List<MediaItem> files, {required bool fromPending});

  double get allowanceUsedGb;
  double get allowanceLimitGb;
  void addAllowance(double gb);

  List<HistoryGroup> get history;
}
