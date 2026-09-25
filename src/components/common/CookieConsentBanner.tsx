'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Cookie, Settings2, Check, X } from 'lucide-react';
import { getStoredConsent, saveConsent, CookieConsentPreferences } from '../../lib/analytics';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    // Delay slightly to prevent hydration mismatch and abrupt appearance
    const timer = setTimeout(() => {
      const consent = getStoredConsent();
      if (!consent.responded) {
        setIsVisible(true);
      }
    }, 600);

    const handleCustomOpen = () => {
      const consent = getStoredConsent();
      setAnalyticsEnabled(consent.analytics);
      setShowPreferences(true);
      setIsVisible(true);
    };

    window.addEventListener('happytf:open_cookie_preferences', handleCustomOpen);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('happytf:open_cookie_preferences', handleCustomOpen);
    };
  }, []);

  const handleAcceptAll = () => {
    saveConsent({ analytics: true, marketing: false });
    setIsVisible(false);
    setShowPreferences(false);
  };

  const handleRejectNonEssential = () => {
    saveConsent({ analytics: false, marketing: false });
    setIsVisible(false);
    setShowPreferences(false);
  };

  const handleSaveCustom = () => {
    saveConsent({ analytics: analyticsEnabled, marketing: false });
    setIsVisible(false);
    setShowPreferences(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="cookie-banner-root animate-slide-up"
      role="region"
      aria-label="Cookie consent management"
      id="happytf-cookie-banner"
    >
      <div className="cookie-banner-card glass-panel">
        {!showPreferences ? (
          /* Quick Banner View */
          <div className="banner-content-row">
            <div className="cookie-icon-box">
              <Cookie size={20} className="text-primary" />
            </div>

            <div className="cookie-text-col">
              <h3 className="cookie-title">Privacy & Cookie Preferences</h3>
              <p className="cookie-desc">
                HappyTF uses essential cookies to authenticate your workspace session and secure your data.
                We also offer privacy-first analytics to improve collaborative workflows.{' '}
                <Link href="/privacy" className="cookie-link">
                  Read Privacy Policy
                </Link>{' '}
                and{' '}
                <Link href="/terms" className="cookie-link">
                  Terms of Service
                </Link>
                .
              </p>
            </div>

            <div className="cookie-actions-group">
              <button
                type="button"
                className="btn-preferences"
                onClick={() => setShowPreferences(true)}
                aria-label="Customize cookie preferences"
              >
                <Settings2 size={14} />
                <span>Customize</span>
              </button>

              <button
                type="button"
                className="btn-essential"
                onClick={handleRejectNonEssential}
              >
                Essential Only
              </button>

              <button
                type="button"
                className="btn-accept-all"
                onClick={handleAcceptAll}
              >
                <Check size={15} />
                <span>Accept All</span>
              </button>
            </div>
          </div>
        ) : (
          /* Preferences Modal / Expanded View */
          <div className="preferences-expanded animate-fade-in">
            <div className="pref-header">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" />
                <h3 className="text-sm font-bold text-white">Customize Cookie & Data Settings</h3>
              </div>
              <button
                type="button"
                className="close-pref-btn"
                onClick={() => setShowPreferences(false)}
                aria-label="Close preferences"
              >
                <X size={16} />
              </button>
            </div>

            <div className="pref-categories-list">
              <div className="pref-item">
                <div className="pref-info">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">Strictly Necessary Cookies</span>
                    <span className="badge-required">Required</span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Crucial for session state, workspace authentication, and security token protection. Cannot be disabled.
                  </p>
                </div>
                <input type="checkbox" checked disabled className="pref-toggle" />
              </div>

              <div className="pref-item">
                <div className="pref-info">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">Privacy-First Analytics</span>
                    <span className="badge-optional">Optional</span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Aggregated telemetry to measure feature usage and performance metrics without recording personal identifiers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="toggle-analytics-consent"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  className="pref-toggle clickable"
                />
              </div>
            </div>

            <div className="pref-footer-actions">
              <button
                type="button"
                className="btn-essential"
                onClick={handleRejectNonEssential}
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                className="btn-accept-all"
                onClick={handleSaveCustom}
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .cookie-banner-root {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 32px);
          max-width: 980px;
          z-index: 9999;
          pointer-events: none;
        }

        .cookie-banner-card {
          pointer-events: auto;
          padding: 16px 20px;
          border-radius: var(--radius-lg);
          background: rgba(18, 24, 38, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(99, 102, 241, 0.25);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.15);
        }

        .banner-content-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .cookie-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          flex-shrink: 0;
        }

        .cookie-text-col {
          flex: 1;
          min-width: 0;
        }

        .cookie-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 3px;
        }

        .cookie-desc {
          font-size: 12px;
          line-height: 1.45;
          color: var(--text-secondary);
        }

        :global(.cookie-link) {
          color: var(--primary-light);
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color var(--transition-fast);
        }
        :global(.cookie-link:hover) {
          color: #ffffff;
        }

        .cookie-actions-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-preferences {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          background: transparent;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          padding: 7px 12px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .btn-preferences:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
          border-color: var(--text-muted);
        }

        .btn-essential {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          padding: 7px 14px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .btn-essential:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .btn-accept-all {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
          background: var(--primary);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 7px 16px;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
          transition: all var(--transition-fast);
        }
        .btn-accept-all:hover {
          background: var(--primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.5);
        }

        /* Expanded Preferences */
        .preferences-expanded {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .pref-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .close-pref-btn {
          color: var(--text-muted);
          padding: 4px;
          border-radius: 6px;
          cursor: pointer;
          background: transparent;
          border: none;
        }
        .close-pref-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .pref-categories-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pref-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          gap: 16px;
        }

        .badge-required {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(99, 102, 241, 0.2);
          color: var(--primary-light);
        }

        .badge-optional {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
        }

        .pref-toggle {
          width: 18px;
          height: 18px;
          accent-color: var(--primary);
          flex-shrink: 0;
        }
        .pref-toggle.clickable {
          cursor: pointer;
        }

        .pref-footer-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 8px;
        }

        @media (max-width: 768px) {
          .cookie-banner-root {
            bottom: 12px;
            width: calc(100% - 20px);
          }
          .banner-content-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .cookie-actions-group {
            width: 100%;
            flex-wrap: wrap;
          }
          .btn-preferences, .btn-essential, .btn-accept-all {
            flex: 1;
            justify-content: center;
            padding: 9px 12px;
          }
        }
      `}</style>
    </div>
  );
};
