/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp'],
  // Flutter's own web files (index.html, manifest.json, icons/) live in this folder too; Next.js ignores them.
};

export default nextConfig;
