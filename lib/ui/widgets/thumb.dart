import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Converts an OKLCH colour to sRGB (the design system specifies thumbnail
/// placeholders in OKLCH).
Color oklch(double l, double c, double hueDeg) {
  final h = hueDeg * math.pi / 180;
  final a = c * math.cos(h), b = c * math.sin(h);
  final l1 = math.pow(l + 0.3963377774 * a + 0.2158037573 * b, 3);
  final m1 = math.pow(l - 0.1055613458 * a - 0.0638541728 * b, 3);
  final s1 = math.pow(l - 0.0894841775 * a - 1.2914855480 * b, 3);
  double gamma(num x) {
    final v = x <= 0.0031308 ? 12.92 * x : 1.055 * math.pow(x, 1 / 2.4) - 0.055;
    return v.clamp(0.0, 1.0).toDouble();
  }

  return Color.from(
    alpha: 1,
    red: gamma(4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1),
    green: gamma(-1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1),
    blue: gamma(-0.0041960863 * l1 - 0.7034186147 * m1 + 1.7076147010 * s1),
  );
}

/// Placeholder thumbnail gradient for a media item until real thumbnails
/// are decoded on the phone.
LinearGradient thumbGradient(double hue) => LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [oklch(0.62, 0.12, hue), oklch(0.36, 0.1, hue + 50)],
);

/// Bottom-up dark scrim so white text stays readable on thumbnails.
LinearGradient bottomScrim(double opacity, double stop) => LinearGradient(
  begin: Alignment.bottomCenter,
  end: Alignment.topCenter,
  colors: [
    Colors.black.withValues(alpha: opacity),
    Colors.transparent,
  ],
  stops: [0, stop],
);
