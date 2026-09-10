import './globals.css';
import type { Metadata } from 'next';
import { SITE } from '@/lib/site-config';
import { withBasePath } from '@/lib/app-config';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.title,
  description: SITE.description,
  alternates: { canonical: SITE.url },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    url: SITE.url,
  },
  twitter: {
    card: 'summary',
    title: SITE.title,
    description: SITE.description,
  },
  icons: { icon: { url: withBasePath('/icon.svg'), type: 'image/svg+xml' } },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
