'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '../../lib/analytics';

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      trackPageView(pathname);
    }
  }, [pathname]);

  return <>{children}</>;
};
