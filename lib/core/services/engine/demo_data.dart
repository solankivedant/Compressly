import '../../domain/history_entry.dart';
import '../../domain/media_item.dart';
import '../../domain/media_kind.dart';
import 'engine_service.dart';

const _v = MediaKind.video;
const _p = MediaKind.photo;

/// Sample library used by [FakeEngineService] until the native engine lands.
// dart format off
const demoItems = <MediaItem>[
  MediaItem(id: 1, kind: _v, title: "Priya's birthday", meta: '4K · 30 fps · 2:14', duration: '2:14', beforeGb: 1.8, afterGb: 0.7, savingPct: 61, qualityDrop: 4, hue: 28),
  MediaItem(id: 2, kind: _v, title: 'Goa trip — beach', meta: '4K · 60 fps · 1:32', duration: '1:32', beforeGb: 1.6, afterGb: 0.6, savingPct: 62, qualityDrop: 4, hue: 190),
  MediaItem(id: 3, kind: _v, title: 'School annual day', meta: '4K · 30 fps · 1:51', duration: '1:51', beforeGb: 1.4, afterGb: 0.6, savingPct: 57, qualityDrop: 3, hue: 300),
  MediaItem(id: 4, kind: _v, title: 'Diwali at home', meta: '1080p · 60 fps · 3:05', duration: '3:05', beforeGb: 1.1, afterGb: 0.5, savingPct: 55, qualityDrop: 3, hue: 45),
  MediaItem(id: 5, kind: _v, title: 'Concert clip', meta: '4K · 30 fps · 0:58', duration: '0:58', beforeGb: 0.9, afterGb: 0.4, savingPct: 56, qualityDrop: 3, hue: 250),
  MediaItem(id: 6, kind: _v, title: 'Morning walk', meta: '1080p · 30 fps · 2:40', duration: '2:40', beforeGb: 0.64, afterGb: 0.28, savingPct: 56, qualityDrop: 3, hue: 120, done: true),
  MediaItem(id: 7, kind: _p, title: 'IMG_20260918_0912.jpg', meta: '50 MP', beforeGb: 0.024, afterGb: 0.013, savingPct: 46, qualityDrop: 2, hue: 160, done: true),
  MediaItem(id: 8, kind: _p, title: 'IMG_20260917_1840.jpg', meta: '50 MP', beforeGb: 0.021, afterGb: 0.012, savingPct: 43, qualityDrop: 2, hue: 15),
  MediaItem(id: 9, kind: _v, title: 'Cricket match', meta: '4K · 60 fps · 4:10', duration: '4:10', beforeGb: 3.2, afterGb: 1.3, savingPct: 59, qualityDrop: 3, hue: 95, done: true),
  MediaItem(id: 10, kind: _p, title: 'IMG_20260910_0730.jpg', meta: '50 MP', beforeGb: 0.028, afterGb: 0.015, savingPct: 46, qualityDrop: 2, hue: 210, done: true),
  MediaItem(id: 11, kind: _v, title: 'Wedding sangeet', meta: '4K · 30 fps · 5:02', duration: '5:02', beforeGb: 4.1, afterGb: 1.7, savingPct: 59, qualityDrop: 3, hue: 340, done: true),
  MediaItem(id: 12, kind: _p, title: 'IMG_20260902_1915.jpg', meta: '50 MP', beforeGb: 0.019, afterGb: 0.010, savingPct: 47, qualityDrop: 2, hue: 60),
];

const demoHistory = <HistoryGroup>[
  (label: 'Yesterday', rows: [
    HistoryEntry(kind: _v, title: 'Wedding sangeet', hue: 340, beforeGb: 4.1, afterGb: 1.7, savingPct: 59, outcome: HistoryOutcome.saved),
    HistoryEntry(kind: _p, title: 'Screenshot_0921.png', hue: 230, beforeGb: 0.001, afterGb: 0.001, outcome: HistoryOutcome.kept, note: 'Not worth compressing, kept as is'),
  ]),
  (label: '18 Oct', rows: [
    HistoryEntry(kind: _v, title: 'Cricket match', hue: 95, beforeGb: 3.2, afterGb: 1.3, savingPct: 59, outcome: HistoryOutcome.saved),
    HistoryEntry(kind: _v, title: 'Old WhatsApp video', hue: 150, beforeGb: 0.048, afterGb: 0.048, outcome: HistoryOutcome.kept, note: 'Already efficient, kept as is'),
    HistoryEntry(kind: _v, title: 'Slow-mo dive', hue: 200, beforeGb: 2.2, afterGb: 2.2, outcome: HistoryOutcome.skipped, note: 'Skipped · paused to keep your phone cool'),
  ]),
  (label: '12 Oct', rows: [
    HistoryEntry(kind: _v, title: 'Morning walk', hue: 120, beforeGb: 0.64, afterGb: 0.28, savingPct: 56, outcome: HistoryOutcome.saved),
    HistoryEntry(kind: _p, title: 'IMG_20260918_0912.jpg', hue: 160, beforeGb: 0.024, afterGb: 0.013, savingPct: 46, outcome: HistoryOutcome.saved),
  ]),
];
// dart format on
