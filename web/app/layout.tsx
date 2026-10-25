import type { Metadata, Viewport } from 'next';
import Shell from '@/components/Shell';
import { LibraryProvider } from '@/components/useLibrary';
import './globals.css';

export const metadata: Metadata = {
  title: 'Compressly',
  description: 'Free up photo and video storage at the same resolution. Web version for testing.',
  icons: { icon: '/icon-192.png', apple: '/apple-icon.png' },
  appleWebApp: { capable: true, title: 'Compressly', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // App-like: the compare view has its own pinch zoom, and the page itself shouldn't zoom.
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ECEEF2',
};

// Light is the web default. Runs before paint so there's no flash.
const themeScript = `try{var t=localStorage.getItem('theme')||'light';if(t==='system')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <LibraryProvider>
          <Shell>{children}</Shell>
        </LibraryProvider>
      </body>
    </html>
  );
}
