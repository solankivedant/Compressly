import 'package:flutter/material.dart';

/// Compressly design tokens (Claude Design system "Compressly", colour v2).
///
/// Three hues, dark-first: cobalt = action, lime = freed space, coral =
/// still-to-free. Green only for confirmed savings, amber for warnings.
@immutable
class CTokens extends ThemeExtension<CTokens> {
  const CTokens({
    required this.brightness,
    required this.primary,
    required this.onPrimary,
    required this.primaryContainer,
    required this.onPrimaryContainer,
    required this.accent,
    required this.onAccent,
    required this.accentContainer,
    required this.onAccentContainer,
    required this.tertiary,
    required this.onTertiary,
    required this.tertiaryContainer,
    required this.onTertiaryContainer,
    required this.success,
    required this.onSuccess,
    required this.successContainer,
    required this.warning,
    required this.warningContainer,
    required this.error,
    required this.onError,
    required this.errorContainer,
    required this.background,
    required this.card,
    required this.sheet,
    required this.sunken,
    required this.raised,
    required this.scrim,
    required this.textPrimary,
    required this.textMuted,
    required this.textDisabled,
    required this.borderSubtle,
    required this.borderDefault,
  });

  final Brightness brightness;
  final Color primary, onPrimary, primaryContainer, onPrimaryContainer;
  final Color accent, onAccent, accentContainer, onAccentContainer;
  final Color tertiary, onTertiary, tertiaryContainer, onTertiaryContainer;
  final Color success, onSuccess, successContainer;
  final Color warning, warningContainer;
  final Color error, onError, errorContainer;
  final Color background, card, sheet, sunken, raised, scrim;
  final Color textPrimary, textMuted, textDisabled;
  final Color borderSubtle, borderDefault;

  Color get ringTrack => primaryContainer;
  Color get ringUsed => primary;
  Color get ringFreeable => tertiary;
  Color get ringFreed => accent;

  /// Brand lime used on dark camera/preview overlays in both themes.
  static const lime = Color(0xFFC6F432);
  static const night950 = Color(0xFF090B10);

  static const dark = CTokens(
    brightness: Brightness.dark,
    primary: Color(0xFF4D6BFF),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFF1C2658),
    onPrimaryContainer: Color(0xFFB9C5FF),
    accent: Color(0xFFC6F432),
    onAccent: Color(0xFF090B10),
    accentContainer: Color(0xFF26330B),
    onAccentContainer: Color(0xFFD9FA74),
    tertiary: Color(0xFFFF6A3D),
    onTertiary: Color(0xFF090B10),
    tertiaryContainer: Color(0xFF3D1A0F),
    onTertiaryContainer: Color(0xFFFF9B7A),
    success: Color(0xFF22C55E),
    onSuccess: Color(0xFF04150A),
    successContainer: Color(0xFF0D2A1A),
    warning: Color(0xFFFFB020),
    warningContainer: Color(0xFF3A2A08),
    error: Color(0xFFF04438),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFF3A1210),
    background: Color(0xFF090B10),
    card: Color(0xFF151922),
    sheet: Color(0xFF1C212C),
    sunken: Color(0xFF1C212C),
    raised: Color(0xFF2A303D),
    scrim: Color(0x99000000),
    textPrimary: Color(0xFFF2F4F8),
    textMuted: Color(0xFFA3AAB8),
    textDisabled: Color(0xFF5A6273),
    borderSubtle: Color(0xFF1C212C),
    borderDefault: Color(0xFF2A303D),
  );

  static const light = CTokens(
    brightness: Brightness.light,
    primary: Color(0xFF2443E6),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFC7D0FF),
    onPrimaryContainer: Color(0xFF14257A),
    accent: Color(0xFFC6F432),
    onAccent: Color(0xFF090B10),
    accentContainer: Color(0xFFD4F06A),
    onAccentContainer: Color(0xFF2E4600),
    tertiary: Color(0xFFC43A10),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFFFC2AD),
    onTertiaryContainer: Color(0xFF6E1F06),
    success: Color(0xFF15803D),
    onSuccess: Color(0xFFFFFFFF),
    successContainer: Color(0xFFBBF0CF),
    warning: Color(0xFF9A5800),
    warningContainer: Color(0xFFFFD98A),
    error: Color(0xFFD92D20),
    onError: Color(0xFFFFFFFF),
    errorContainer: Color(0xFFFFD3CF),
    background: Color(0xFFECEEF2),
    card: Color(0xFFFFFFFF),
    sheet: Color(0xFFFFFFFF),
    sunken: Color(0xFFE1E4EA),
    raised: Color(0xFFE1E4EA),
    scrim: Color(0x80090B10),
    textPrimary: Color(0xFF10131A),
    textMuted: Color(0xFF5A6273),
    textDisabled: Color(0xFFA3AAB8),
    borderSubtle: Color(0xFFE1E4EA),
    borderDefault: Color(0xFFCDD2DB),
  );

  /// Sticky footer: hairline on top plus a soft upward shadow.
  List<BoxShadow> get stickyShadow => [
    BoxShadow(color: borderSubtle, offset: const Offset(0, -1)),
    const BoxShadow(
      color: Color(0x0F0B1215),
      offset: Offset(0, -6),
      blurRadius: 16,
    ),
  ];

  static const sheetShadow = [
    BoxShadow(color: Color(0x240B1215), offset: Offset(0, -8), blurRadius: 32),
  ];

  static const liftShadow = [
    BoxShadow(color: Color(0x40000000), offset: Offset(0, 12), blurRadius: 32),
  ];

  @override
  CTokens copyWith() => this;

  @override
  CTokens lerp(CTokens? other, double t) =>
      other == null || t < 0.5 ? this : other;
}

/// Spacing, radii and motion (4-pt grid).
abstract final class Space {
  static const s1 = 4.0;
  static const s2 = 8.0;
  static const s3 = 12.0;
  static const s4 = 16.0;
  static const s6 = 24.0;
  static const s8 = 32.0;
  static const screen = 16.0;
  static const tapTarget = 48.0;

  static const radiusButton = 12.0;
  static const radiusCard = 16.0;
  static const radiusSheet = 24.0;
  static const radiusThumb = 8.0;
}

abstract final class Motion {
  static const fast = Duration(milliseconds: 120);
  static const screen = Duration(milliseconds: 200);
  static const screenLong = Duration(milliseconds: 250);
  static const countUp = Duration(milliseconds: 1200);
  static const standard = Cubic(.2, 0, 0, 1);
  static const decelerate = Cubic(0, 0, 0, 1);

  static Duration of(BuildContext context, Duration d) =>
      MediaQuery.of(context).disableAnimations ? Duration.zero : d;
}

/// One family, a handful of roles. Every number uses tabular figures.
abstract final class AppText {
  static const tabular = [FontFeature.tabularFigures()];

  static TextStyle style(
    double size, {
    FontWeight weight = FontWeight.w400,
    Color? color,
    double? height,
    double spacing = 0,
    bool tabular = false,
  }) => TextStyle(
    fontSize: size,
    fontWeight: weight,
    color: color,
    height: height == null ? null : height / size,
    letterSpacing: spacing * size,
    fontFeatures: tabular ? AppText.tabular : null,
  );
}

extension TokensX on BuildContext {
  CTokens get c => Theme.of(this).extension<CTokens>()!;
}

ThemeData buildTheme(CTokens t) {
  final scheme = ColorScheme(
    brightness: t.brightness,
    primary: t.primary,
    onPrimary: t.onPrimary,
    primaryContainer: t.primaryContainer,
    onPrimaryContainer: t.onPrimaryContainer,
    secondary: t.accent,
    onSecondary: t.onAccent,
    tertiary: t.tertiary,
    onTertiary: t.onTertiary,
    error: t.error,
    onError: t.onError,
    surface: t.card,
    onSurface: t.textPrimary,
    surfaceContainerHighest: t.raised,
    outline: t.borderDefault,
    outlineVariant: t.borderSubtle,
  );
  return ThemeData(
    useMaterial3: true,
    brightness: t.brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: t.background,
    extensions: [t],
    splashFactory: InkRipple.splashFactory,
    textTheme: Typography.material2021().englishLike.apply(
      bodyColor: t.textPrimary,
      displayColor: t.textPrimary,
    ),
    iconTheme: IconThemeData(color: t.textPrimary, size: 24),
  );
}
