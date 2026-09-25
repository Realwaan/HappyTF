/**
 * Privacy-First Analytics and Telemetry Service
 * Compliant with GDPR, ePrivacy Directive, and CCPA
 */

export const CONSENT_STORAGE_KEY = 'happytf_cookie_consent_v1';

export interface CookieConsentPreferences {
  essential: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  responded: boolean;
  updatedAt: string;
}

export const DEFAULT_CONSENT: CookieConsentPreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  responded: false,
  updatedAt: new Date().toISOString(),
};

/**
 * Retrieve current cookie preferences safely in SSR/Browser
 */
export function getStoredConsent(): CookieConsentPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_CONSENT;
  }
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return DEFAULT_CONSENT;
    return JSON.parse(raw) as CookieConsentPreferences;
  } catch {
    return DEFAULT_CONSENT;
  }
}

/**
 * Save user cookie preferences
 */
export function saveConsent(preferences: Partial<CookieConsentPreferences>): CookieConsentPreferences {
  const updated: CookieConsentPreferences = {
    ...getStoredConsent(),
    ...preferences,
    essential: true,
    responded: true,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('happytf:consent_updated', { detail: updated }));
    } catch {
      // Storage unavailable or blocked
    }
  }

  return updated;
}

/**
 * Track custom user events strictly when analytics consent is granted
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const consent = getStoredConsent();
  if (!consent.analytics) {
    // Strictly respect consent: do not log or dispatch tracking payload
    return;
  }

  const payload = {
    event: eventName,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
    properties: properties || {},
  };

  // Safe developer inspection in dev mode
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[Analytics Tracker] ${eventName}:`, payload);
  }

  // Hook for production providers (e.g. PostHog, Plausible, or custom endpoint)
  try {
    const customWindow = window as unknown as { plausible?: (event: string, opts?: unknown) => void };
    if (typeof customWindow.plausible === 'function') {
      customWindow.plausible(eventName, { props: properties });
    }
  } catch {
    // Analytics sink failed gracefully
  }
}

/**
 * Track page view strictly when analytics consent is granted
 */
export function trackPageView(path: string): void {
  trackEvent('page_view', { path });
}
