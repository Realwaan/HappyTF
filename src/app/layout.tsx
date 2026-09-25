import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import { AppProvider } from '../context/AppContext';
import { CookieConsentBanner } from '../components/common/CookieConsentBanner';
import { AnalyticsProvider } from '../components/common/AnalyticsProvider';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-jb',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://happytf.work';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#07090e' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'HappyTF Work OS — Collaborative Agile & Sprint Management',
    template: '%s | HappyTF Work OS',
  },
  description: 'Enterprise-grade collaborative work management, multi-workspace Kanban boards, sprint backlogs, and agile team execution platform.',
  keywords: [
    'work management',
    'sprint planning',
    'kanban board',
    'project management',
    'agile tool',
    'team collaboration',
    'happytf',
    'work os',
  ],
  authors: [{ name: 'HappyTF Engineering Team', url: siteUrl }],
  creator: 'HappyTF',
  publisher: 'HappyTF',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'HappyTF Work OS',
    title: 'HappyTF Work OS — Collaborative Agile & Sprint Management',
    description: 'Enterprise-grade collaborative work management, multi-workspace Kanban boards, and agile team execution platform.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'HappyTF Work OS — Collaborative Agile & Sprint Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HappyTF Work OS — Collaborative Agile & Sprint Management',
    description: 'Enterprise-grade collaborative work management, multi-workspace Kanban boards, and agile team execution platform.',
    creator: '@happytf',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <AnalyticsProvider>
          <AppProvider>
            {children}
            <CookieConsentBanner />
          </AppProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
