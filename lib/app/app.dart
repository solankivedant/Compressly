import 'package:flutter/material.dart';

import '../ui/screens/app_shell.dart';
import 'app_scope.dart';
import 'theme.dart';

class CompresslyApp extends StatelessWidget {
  const CompresslyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final prefs = AppScope.of(context).prefs;
    return ListenableBuilder(
      listenable: prefs,
      builder: (context, _) => MaterialApp(
        title: 'Compressly',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(CTokens.light),
        darkTheme: buildTheme(CTokens.dark),
        themeMode: prefs.themeMode,
        home: const AppShell(),
      ),
    );
  }
}
