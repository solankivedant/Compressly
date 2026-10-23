import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../core/domain/byte_format.dart';
import '../../core/domain/history_entry.dart';
import '../widgets/file_row.dart';
import '../widgets/layout.dart';
import '../widgets/status_chip.dart';

enum _Filter { all, saved, kept }

/// What happened to each file, grouped by day (FR-22).
class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  _Filter _filter = _Filter.all;

  bool _matches(HistoryEntry r) => switch (_filter) {
    _Filter.all => true,
    _Filter.saved => r.outcome == HistoryOutcome.saved,
    _Filter.kept => r.outcome != HistoryOutcome.saved,
  };

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final all = s.engine.history;
    final saved = [
      for (final g in all)
        for (final r in g.rows)
          if (r.outcome == HistoryOutcome.saved) r,
    ];
    final freed = saved.fold(0.0, (t, r) => t + r.beforeGb - r.afterGb);
    final groups = [
      for (final g in all)
        if (g.rows.any(_matches))
          (label: g.label, rows: g.rows.where(_matches).toList()),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ScreenHeader(
          title: 'History',
          subtitle: '${saved.length} files freed ${formatGb(freed)} this month',
          onBack: s.router.back,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Wrap(
            spacing: 8,
            children: [
              for (final (f, label) in [
                (_Filter.all, 'All'),
                (_Filter.saved, 'Saved'),
                (_Filter.kept, 'Kept as is'),
              ])
                StatusChip(
                  label,
                  tone: _filter == f ? ChipTone.solid : ChipTone.neutral,
                  onTap: () => setState(() => _filter = f),
                ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            children: [
              for (final g in groups) ...[
                LabeledCard(
                  label: g.label,
                  padding: EdgeInsets.zero,
                  children: [
                    for (final r in g.rows)
                      FileRow(
                        kind: r.kind,
                        title: r.title,
                        hue: r.hue,
                        before: formatGb(r.beforeGb),
                        after: formatGb(r.afterGb),
                        quality: r.outcome == HistoryOutcome.saved
                            ? 'Looks identical'
                            : null,
                        meta: r.outcome == HistoryOutcome.saved ? null : r.note,
                        savingPct: r.savingPct,
                      ),
                  ],
                ),
                const SizedBox(height: 16),
              ],
              const Center(child: TrustBadge()),
            ],
          ),
        ),
      ],
    );
  }
}
