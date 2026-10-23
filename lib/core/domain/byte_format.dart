/// Formats a size given in gigabytes the way every screen shows it:
/// one decimal in GB from 1 GB up, whole megabytes below.
String formatGb(double gb) =>
    gb >= 1 ? '${gb.toStringAsFixed(1)} GB' : '${(gb * 1000).round()} MB';
