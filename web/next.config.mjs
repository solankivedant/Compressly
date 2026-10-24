import os from 'node:os';

// This computer's Wi-Fi / LAN addresses, so a phone on the same network may load the dev site (npm run phone).
const lanHosts = Object.values(os.networkInterfaces())
  .flat()
  .filter((n) => n && n.family === 'IPv4' && !n.internal)
  .map((n) => n.address);

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp', 'web-push'],
  allowedDevOrigins: lanHosts,
  devIndicators: false, // the floating Next.js badge covers the phone's bottom bar
  // A separate build folder lets a test copy run beside your own `npm run dev` without the two clashing.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Flutter's own web files (index.html, manifest.json, icons/) live in this folder too; Next.js ignores them.
};

export default nextConfig;
