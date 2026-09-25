'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Home, Search, ArrowRight, LayoutGrid } from 'lucide-react';

export default function NotFoundPage() {
  const triggerSearch = () => {
    // Dispatch keyboard event for ⌘K / Ctrl+K
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="notfound-root" id="not-found-page">
      <div className="notfound-card glass-panel animate-pop-in">
        <div className="notfound-badge">
          <Compass size={16} className="text-primary" />
          <span>Error 404 · Route Not Found</span>
        </div>

        <div className="glitch-number-wrapper">
          <h1 className="glitch-number font-mono">404</h1>
        </div>

        <h2>Workspace Item or Page Not Found</h2>
        <p className="notfound-subtext">
          The board, task card, or URL you were looking for may have been archived, renamed, or does not exist in this workspace.
        </p>

        <div className="notfound-actions">
          <Link href="/" className="btn-return-home">
            <Home size={16} />
            <span>Return to Workspace Dashboard</span>
            <ArrowRight size={14} />
          </Link>

          <button
            type="button"
            className="btn-search-cmd"
            onClick={triggerSearch}
          >
            <Search size={15} />
            <span>Search Work OS</span>
            <span className="kbd font-mono">⌘K</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .notfound-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-canvas);
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .notfound-root::before {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .notfound-card {
          max-width: 560px;
          width: 100%;
          padding: 48px 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(18, 24, 38, 0.9);
          border: 1px solid rgba(99, 102, 241, 0.3);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15);
          position: relative;
          z-index: 10;
        }

        .notfound-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          font-size: 12px;
          font-weight: 600;
          color: var(--primary-light);
          margin-bottom: 20px;
        }

        .glitch-number-wrapper {
          position: relative;
          margin-bottom: 12px;
        }

        .glitch-number {
          font-size: 96px;
          font-weight: 800;
          letter-spacing: -0.05em;
          line-height: 1;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        h2 {
          font-size: 22px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 12px;
        }

        .notfound-subtext {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-secondary);
          margin-bottom: 32px;
          max-width: 440px;
        }

        .notfound-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        :global(.btn-return-home) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 20px;
          border-radius: 10px;
          background: var(--primary);
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
          transition: all var(--transition-fast);
        }
        :global(.btn-return-home:hover) {
          background: var(--primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.55);
        }

        .btn-search-cmd {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 11px 20px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .btn-search-cmd:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: var(--primary-light);
        }

        .kbd {
          font-size: 11px;
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--text-muted);
        }

        @media (max-width: 600px) {
          .notfound-card {
            padding: 32px 20px;
          }
          .glitch-number {
            font-size: 72px;
          }
          h2 {
            font-size: 19px;
          }
        }
      `}</style>
    </div>
  );
}
