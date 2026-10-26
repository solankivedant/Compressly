import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Compressly Web Tester',
  description: 'Test Compressly photo and video presets and compare the results side by side.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
