import type { MetadataRoute } from 'next';

/** Lets the site be added to a phone's home screen and opened like an app (also needed for notifications on iPhone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Compressly',
    short_name: 'Compressly',
    description: 'Free up photo and video storage at the same resolution.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ECEEF2',
    theme_color: '#ECEEF2',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
