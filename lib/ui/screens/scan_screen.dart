import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_scope.dart';
import '../../app/router.dart';
import '../../app/theme.dart';
import '../widgets/savings.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  late final AppScope _s = AppScope.of(context);
  Timer? _done;

  @override
  void initState() {
    super.initState();
    _s.engine.addListener(_onEngine);
    _s.engine.startScan();
  }

  void _onEngine() {
    final s = _s;
    if (s.engine.scanProgress < 1 || _done != null) return;
    _done = Timer(const Duration(milliseconds: 400), () {
      s.prefs.update((p) => p.onboarded = true);
      s.router.reset(AppScreen.result);
    });
  }

  @override
  void dispose() {
    _s.engine.removeListener(_onEngine);
    _done?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final engine = _s.engine;
    return Center(
      child: ListenableBuilder(
        listenable: engine,
        builder: (context, _) {
          final p = engine.scanProgress * 100;
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              StorageRing(
                total: 100,
                used: 0,
                freeable: p,
                value: '${(p * 12.3).round()}',
                unit: '',
                caption: 'items checked',
                size: 250,
                stroke: 30,
              ),
              const SizedBox(height: 24),
              Text(
                'Looking through your gallery',
                style: AppText.style(
                  20,
                  weight: FontWeight.w700,
                  color: c.textPrimary,
                ),
              ),
              Text(
                'Usually under 30 seconds',
                style: AppText.style(14, color: c.textMuted),
              ),
            ],
          );
        },
      ),
    );
  }
}
