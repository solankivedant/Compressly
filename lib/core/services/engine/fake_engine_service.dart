import 'dart:async';

import '../../domain/media_item.dart';
import '../../domain/preset.dart';
import 'demo_data.dart';
import 'engine_service.dart';

/// Simulated engine for UI work without a phone
/// (`flutter run -d windows --dart-define=FAKE_SERVICES=true`).
class FakeEngineService extends EngineService {
  FakeEngineService();

  List<MediaItem> _items = List.of(demoItems);
  double _freed = 36.8;
  double _pending = 0;
  List<MediaItem> _pendingBatch = const [];
  double _scan = 0;
  List<MediaItem> _batch = const [];
  double _queue = 0;
  bool _paused = false;
  double _used = 0.8;
  double _limit = 2;
  Timer? _scanTimer;
  Timer? _queueTimer;

  // Mirrors the bundled tunables; the real values come from Remote Config.
  static const _estimates = {
    Preset.high: (storagePct: 40, qualityDrop: 1),
    Preset.balanced: (storagePct: 55, qualityDrop: 3),
    Preset.max: (storagePct: 65, qualityDrop: 6),
  };

  // Other compressible files outside the demo list.
  static const _otherStillToFree = 22.4;

  @override
  List<MediaItem> get items => _items;
  @override
  double get freedGb => _freed;
  @override
  int get compressedCount => 286 + _items.where((x) => x.done).length;
  @override
  double get pendingGb => _pending;
  @override
  List<MediaItem> get pendingBatch => _pendingBatch;
  @override
  double get stillToFreeGb =>
      _items.where((x) => !x.done).fold(0.0, (t, x) => t + x.savingGb) +
      _otherStillToFree;
  @override
  double get deviceTotalGb => 128;
  @override
  double get deviceUsedGb => 124 - _freed;
  @override
  PresetEstimate presetEstimate(Preset preset) => _estimates[preset]!;

  @override
  double get scanProgress => _scan;

  @override
  void startScan() {
    _scanTimer?.cancel();
    _scan = 0;
    notifyListeners();
    _scanTimer = Timer.periodic(const Duration(milliseconds: 60), (t) {
      _scan = (_scan + 0.04).clamp(0, 1);
      if (_scan >= 1) t.cancel();
      notifyListeners();
    });
  }

  @override
  ScanSummary get scanSummary =>
      (usedGb: 104, freeableGb: 38.4, videosGb: 31.2, photosGb: 7.2);

  @override
  List<MediaItem> get batch => _batch;
  @override
  double get queueProgress => _queue;
  @override
  bool get paused => _paused;

  @override
  void startQueue(List<MediaItem> files) {
    _queueTimer?.cancel();
    _batch = List.unmodifiable(files);
    _queue = 0;
    _paused = false;
    notifyListeners();
    _queueTimer = Timer.periodic(const Duration(milliseconds: 50), (t) {
      if (_paused) return;
      _queue = (_queue + 0.016).clamp(0, _batch.length.toDouble());
      if (_queue >= _batch.length) {
        t.cancel();
        _used += _batch.fold(0.0, (s, x) => s + x.savingGb);
      }
      notifyListeners();
    });
  }

  @override
  void setPaused(bool value) {
    _paused = value;
    notifyListeners();
  }

  void _markDone(List<MediaItem> files) {
    final ids = {for (final f in files) f.id};
    _items = [
      for (final x in _items) ids.contains(x.id) ? x.copyWith(done: true) : x,
    ];
  }

  @override
  double removeOriginals(List<MediaItem> files, {required bool fromPending}) {
    final gb = files.fold(0.0, (t, x) => t + x.savingGb);
    _markDone(files);
    _freed += gb;
    if (fromPending) {
      _pending = 0;
      _pendingBatch = const [];
    }
    notifyListeners();
    return gb;
  }

  @override
  double keepBoth(List<MediaItem> files, {required bool fromPending}) {
    final gb = files.fold(0.0, (t, x) => t + x.savingGb);
    _markDone(files);
    if (!fromPending) {
      _pending += gb;
      _pendingBatch = [..._pendingBatch, ...files];
    }
    notifyListeners();
    return gb;
  }

  @override
  double get allowanceUsedGb => _used;
  @override
  double get allowanceLimitGb => _limit;

  @override
  void addAllowance(double gb) {
    _limit += gb;
    notifyListeners();
  }

  @override
  List<HistoryGroup> get history => demoHistory;

  @override
  void dispose() {
    _scanTimer?.cancel();
    _queueTimer?.cancel();
    super.dispose();
  }
}
