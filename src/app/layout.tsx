import type { Metadata } from 'next';
import '../styles/globals.css';
import { AppProvider } from '../context/AppContext';

export const metadata: Metadata = {
  title: 'HappyTF Work OS — Collaborative Work Management',
  description: 'Enterprise-grade multi-workspace project management, sprint planning, and collaborative boards platform.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
