import os from 'node:os';

// This computer's network addresses, so `npm run phone` can be opened from a phone on the same Wi-Fi while developing.
const lanHosts = Object.values(os.networkInterfaces())
  .flat()
  .filter((n) => n && n.family === 'IPv4' && !n.internal)
  .map((n) => n.address);

/**
 * Compressly web runs entirely in the browser of the device that opens it (no server work), so it can be
 * hosted anywhere, e.g. Vercel, and opened on a phone or laptop.
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  allowedDevOrigins: lanHosts,
  devIndicators: false, // the floating Next.js badge covers the phone's bottom bar
  // A separate build folder lets a test copy run beside your own `npm run dev` without the two clashing.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Flutter's own web files (index.html, manifest.json, icons/) live in this folder too; Next.js ignores them.
};

export default nextConfig;
