import type { Metadata } from 'next';
import { Space_Mono, Syne, DM_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

import { Header, Footer } from '@/components/layout';
import { SITE_CONFIG } from '@/lib/constants';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth';

const syne = Syne({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
  weight: ['700', '800'],
});

const spaceMono = Space_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
});

const dmSans = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.name} | ${SITE_CONFIG.tagline}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  keywords: [
    'VS Code',
    'developer presence',
    'coding activity',
    'developer social',
    'team collaboration',
    'Discord for developers',
    'coding streaks',
    'developer tools',
  ],
  authors: [{ name: SITE_CONFIG.name }],
  creator: SITE_CONFIG.name,
  metadataBase: new URL(SITE_CONFIG.url),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} | ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    images: [
      {
        url: SITE_CONFIG.ogImage,
        width: 1200,
        height: 630,
        alt: `${SITE_CONFIG.name} - ${SITE_CONFIG.tagline}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_CONFIG.name} | ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    images: [SITE_CONFIG.ogImage],
    creator: SITE_CONFIG.links.twitter.replace('https://twitter.com/', '@'),
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${spaceMono.variable} ${dmSans.variable} antialiased`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <div className="relative min-h-screen">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <Toaster position="bottom-right" />
              <div
                className="fixed inset-0 pointer-events-none z-0 opacity-[0.015] dark:opacity-[0.015]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />

              <Header />
              <main>{children}</main>
              <Footer />
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
