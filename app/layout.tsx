import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spark — IIT Delhi Dating',
  description: 'Compatibility-first dating for IIT Delhi students',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f0f0f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface">
        <main className="mx-auto max-w-md min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
