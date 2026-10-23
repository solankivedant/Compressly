/// Plain words for a measured quality drop (DESIGN §5.3). Main screens never
/// show SSIM numbers; File detail does.
String qualityWords(int qualityDropPct) =>
    qualityDropPct >= 4 ? 'Very close' : 'Looks identical';
