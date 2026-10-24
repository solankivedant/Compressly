import type { Metadata, Viewport } from 'next';
import Shell from '@/components/Shell';
import { LibraryProvider } from '@/components/useLibrary';
import './globals.css';

export const metadata: Metadata = {
  title: 'Compressly',
  description: 'Free up photo and video storage at the same resolution. Web version for testing.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#090B10',
};

// Dark is the app's default. Runs before paint so there's no flash.
const themeScript = `try{var t=localStorage.getItem('theme')||'dark';if(t==='system')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
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
