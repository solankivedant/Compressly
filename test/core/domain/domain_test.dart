import 'package:compressly/core/domain/byte_format.dart';
import 'package:compressly/core/domain/paywall_policy.dart';
import 'package:compressly/core/domain/quality_words.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('formatGb', () {
    test('one decimal from 1 GB up', () {
      expect(formatGb(1.8), '1.8 GB');
      expect(formatGb(38.4), '38.4 GB');
    });
    test('whole megabytes below 1 GB', () {
      expect(formatGb(0.64), '640 MB');
      expect(formatGb(0.024), '24 MB');
    });
  });

  test('qualityWords never shows numbers', () {
    expect(qualityWords(3), 'Looks identical');
    expect(qualityWords(4), 'Very close');
  });

  group('FR-26 shouldShowPaywall', () {
    test('free user under the allowance compresses', () {
      expect(shouldShowPaywall(isPro: false, usedGb: 1.2, limitGb: 2), isFalse);
    });
    test('free user at the allowance sees the paywall', () {
      expect(shouldShowPaywall(isPro: false, usedGb: 2, limitGb: 2), isTrue);
    });
    test('Pro never sees it', () {
      expect(shouldShowPaywall(isPro: true, usedGb: 9, limitGb: 2), isFalse);
    });
  });
}
