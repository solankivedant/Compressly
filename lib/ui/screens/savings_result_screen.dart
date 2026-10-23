import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/router.dart';
import '../../app/theme.dart';
import '../../core/domain/byte_format.dart';
import '../flows.dart';
import '../widgets/button.dart';
import '../widgets/file_row.dart';
import '../widgets/layout.dart';
import '../widgets/overlays.dart';
import '../widgets/savings.dart';
import '../widgets/status_chip.dart';
import 'file_sheet.dart';

/// First-scan result: "You can free up N GB" (DESIGN §3).
class SavingsResultScreen extends StatefulWidget {
  const SavingsResultScreen({super.key});

  @override
  State<SavingsResultScreen> createState() => _SavingsResultScreenState();
}

class _SavingsResultScreenState extends State<SavingsResultScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _askConsent());
  }

  Future<void> _askConsent() async {
    final prefs = AppScope.of(context).prefs;
    if (prefs.consentAsked || !mounted) return;
    prefs.update((p) => p.consentAsked = true);
    final yes = await showConfirmSheet(
      context,
      title: 'Help make Compressly better?',
      body: 'Share anonymous usage stats. Never file names, photos or locations. You can change this in Settings.',
      primaryLabel: 'Share stats',
      secondaryLabel: 'No thanks',
    );
    prefs.update((p) => p.analytics = yes ?? false);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = AppScope.of(context);
    final scan = s.engine.scanSummary;
    final top5 = s.engine.items.where((x) => !x.done).take(5).toList();
    return Column(
      children: [
        Expanded(
          child: ListView(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Column(
                  children: [
                    Text(
                      'You can free up',
                      style: AppText.style(16, color: c.textMuted),
                    ),
                    const SizedBox(height: 8),
                    StorageRing(
                      total: s.engine.deviceTotalGb,
                      used: scan.usedGb,
                      freeable: scan.freeableGb,
                      size: 220,
                      caption: 'of ${scan.usedGb.round()} GB used',
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      alignment: WrapAlignment.center,
                      children: [
                        StatusChip(
                          'Videos ${formatGb(scan.videosGb)}',
                          icon: Icons.videocam_rounded,
                          tone: ChipTone.primary,
                        ),
                        StatusChip(
                          'Photos ${formatGb(scan.photosGb)}',
                          icon: Icons.photo_rounded,
                          tone: ChipTone.primary,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: CardBox(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                        child: Text(
                          'Biggest 5 files',
                          style: AppText.style(
                            14,
                            weight: FontWeight.w700,
                            color: c.textMuted,
                          ),
                        ),
                      ),
                      for (final x in top5)
                        FileRow(
                          kind: x.kind,
                          title: x.title,
                          meta: x.meta,
                          before: x.before,
                          after: x.after,
                          savingPct: x.savingPct,
                          qualityDrop: x.qualityDrop,
                          hue: x.hue,
                          onTap: () => showFileSheet(context, x.id),
                        ),
                    ],
                  ),
                ),
              ),
              const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: TrustBadge()),
              ),
            ],
          ),
        ),
        ListenableBuilder(
          listenable: s.billing,
          builder: (context, _) => StickyFooter(
            children: [
              CButton(
                'Compress top 5 now',
                size: ButtonSize.lg,
                fullWidth: true,
                onPressed: () => compressNow(s, top5),
              ),
              CButton(
                'Auto-compress while charging',
                variant: ButtonVariant.secondary,
                icon: Icons.bolt_rounded,
                fullWidth: true,
                trailing: s.billing.isPro ? null : const StatusChip.pro(),
                onPressed: () {
                  if (!s.billing.isPro) return s.router.go(AppScreen.paywall);
                  s.prefs.update((p) => p.autoCompress = true);
                  s.router.reset(AppScreen.home);
                },
              ),
              CButton(
                'Choose files',
                variant: ButtonVariant.text,
                fullWidth: true,
                onPressed: () => s.router.go(AppScreen.compress),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
