'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Inbox, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Code, 
  Globe, 
  Clock, 
  Search,
  ArrowRight
} from 'lucide-react';
import { playClickSound, playCompleteSound } from '../../lib/soundFx';

interface IntakeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardTitle: string;
  workspaceName?: string;
}

export const IntakeShareModal: React.FC<IntakeShareModalProps> = ({
  isOpen,
  onClose,
  boardId,
  boardTitle,
  workspaceName = 'HappyTF Workspace',
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'embed' | 'lookup'>('link');
  const [lookupTicketId, setLookupTicketId] = useState('');
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://happytf.app';
  const portalUrl = `${origin}/intake?board=${encodeURIComponent(boardId)}`;
  const embedSnippet = `<iframe\n  src="${portalUrl}"\n  width="100%"\n  height="700"\n  frameborder="0"\n  style="border-radius: 12px; border: 1px solid #1e293b;"\n></iframe>`;

  const handleCopyLink = () => {
    playClickSound();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(portalUrl);
      setCopiedLink(true);
      playCompleteSound();
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyEmbed = () => {
    playClickSound();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(embedSnippet);
      setCopiedEmbed(true);
      playCompleteSound();
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedEmbed(false), 2500);
    }
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupTicketId.trim()) return;
    window.open(`/track/${encodeURIComponent(lookupTicketId.trim())}`, '_blank');
  };

  return (
    <div 
      className="intake-share-backdrop animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intake-share-title"
      id="intake-share-modal"
    >
      <div 
        className="intake-share-modal glass-panel animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div className="header-icon-pill">
              <Inbox size={18} className="text-cyan-400" />
            </div>
            <div>
              <h3 id="intake-share-title" className="modal-title">
                Public Work Intake Portal
              </h3>
              <p className="modal-subtitle">
                Receive external bug reports and requests directly into <span className="font-semibold text-slate-200">{boardTitle}</span>
              </p>
            </div>
          </div>
          <button 
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            <Globe size={13} />
            <span>Public Share Link</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'embed' ? 'active' : ''}`}
            onClick={() => setActiveTab('embed')}
          >
            <Code size={13} />
            <span>Embed Widget</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'lookup' ? 'active' : ''}`}
            onClick={() => setActiveTab('lookup')}
          >
            <Search size={13} />
            <span>Client Tracker Lookup</span>
          </button>
        </div>

        {/* Tab 1: Share Link */}
        {activeTab === 'link' && (
          <div className="tab-content animate-fade-in">
            <div className="info-callout">
              <Sparkles size={15} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                Requesters can submit tickets without creating an account. Each submission generates an encrypted tracking receipt and lands in this board&apos;s triage group with calculated SLA.
              </div>
            </div>

            <div className="link-section">
              <label className="input-label">Public Form URL</label>
              <div className="url-input-group">
                <input
                  type="text"
                  readOnly
                  value={portalUrl}
                  className="url-input font-mono"
                  id="intake-share-url-input"
                />
                <button
                  type="button"
                  id="intake-copy-link-btn"
                  className={`copy-btn ${copiedLink ? 'copied' : ''}`}
                  onClick={handleCopyLink}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="features-grid">
              <div className="feature-item">
                <ShieldCheck size={14} className="text-emerald-400" />
                <div>
                  <div className="feature-title">No Account Required</div>
                  <div className="feature-desc">Frictionless public submission for external clients</div>
                </div>
              </div>
              <div className="feature-item">
                <Clock size={14} className="text-cyan-400" />
                <div>
                  <div className="feature-title">Dynamic SLA Clocks</div>
                  <div className="feature-desc">Priority-based response targets (2h urgent to 168h low)</div>
                </div>
              </div>
              <div className="feature-item">
                <Zap size={14} className="text-amber-400" />
                <div>
                  <div className="feature-title">OCC v2 Sync</div>
                  <div className="feature-desc">Instantly updates your board with live socket notifications</div>
                </div>
              </div>
            </div>

            <div className="modal-actions-row">
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="intake-open-portal-btn"
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <span>Open Intake Portal</span>
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Embed Widget */}
        {activeTab === 'embed' && (
          <div className="tab-content animate-fade-in">
            <p className="text-xs text-slate-300 mb-2">
              Embed HappyTF&apos;s request intake form inside your internal docs, client dashboard, or marketing portal.
            </p>
            <div className="code-box">
              <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap">{embedSnippet}</pre>
              <button
                type="button"
                className={`embed-copy-btn ${copiedEmbed ? 'copied' : ''}`}
                onClick={handleCopyEmbed}
              >
                {copiedEmbed ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedEmbed ? 'Copied HTML' : 'Copy HTML'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Client Tracker Lookup */}
        {activeTab === 'lookup' && (
          <div className="tab-content animate-fade-in">
            <p className="text-xs text-slate-300 mb-3">
              Preview the external customer tracking view for any ticket reference (e.g. <span className="font-mono text-cyan-300">TK-1001</span> or <span className="font-mono text-cyan-300">TK-IN-8492</span>).
            </p>
            <form onSubmit={handleLookupSubmit} className="lookup-form">
              <div className="url-input-group">
                <input
                  type="text"
                  placeholder="Enter Ticket # (e.g., TK-1001)"
                  value={lookupTicketId}
                  onChange={(e) => setLookupTicketId(e.target.value)}
                  className="url-input font-mono"
                  id="intake-lookup-input"
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm flex items-center gap-1"
                  disabled={!lookupTicketId.trim()}
                >
                  <span>Track</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <style jsx>{`
        .intake-share-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 16px;
        }

        .intake-share-modal {
          width: 100%;
          max-width: 540px;
          border-radius: 16px;
          background: var(--bg-surface, #0f131f);
          border: 1px solid var(--border-default, #1e2638);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          border-bottom: 1px solid var(--border-subtle, #1e2638);
          background: var(--bg-subtle, #0b0e17);
        }

        .header-icon-pill {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(6, 182, 212, 0.12);
          border: 1px solid rgba(6, 182, 212, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .modal-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary, #f8fafc);
          margin: 0;
        }

        .modal-subtitle {
          font-size: 12px;
          color: var(--text-secondary, #94a3b8);
          margin: 2px 0 0;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted, #64748b);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: all var(--transition-fast);
        }
        .modal-close-btn:hover {
          color: var(--text-primary, #f8fafc);
          background: rgba(255, 255, 255, 0.06);
        }

        .modal-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-subtle, #1e2638);
          padding: 0 20px;
          gap: 16px;
          background: var(--bg-surface, #0f131f);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary, #94a3b8);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .tab-btn:hover {
          color: var(--text-primary, #f8fafc);
        }
        .tab-btn.active {
          color: var(--primary-light, #3ecf8e);
          border-bottom-color: var(--primary-light, #3ecf8e);
        }

        .tab-content {
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .info-callout {
          display: flex;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(6, 182, 212, 0.08);
          border: 1px solid rgba(6, 182, 212, 0.2);
        }

        .link-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .url-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px;
          border-radius: 8px;
          background: var(--bg-canvas, #07090e);
          border: 1px solid var(--border-default, #1e2638);
        }

        .url-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary, #f8fafc);
          font-size: 12px;
          padding: 6px 10px;
          outline: none;
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          background: rgba(6, 182, 212, 0.15);
          border: 1px solid rgba(6, 182, 212, 0.3);
          color: #22d3ee;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .copy-btn:hover {
          background: rgba(6, 182, 212, 0.25);
        }
        .copy-btn.copied {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.4);
          color: #34d399;
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle, #1e2638);
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .feature-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary, #f8fafc);
        }

        .feature-desc {
          font-size: 11px;
          color: var(--text-muted, #64748b);
          margin-top: 1px;
        }

        .modal-actions-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border-subtle, #1e2638);
        }

        .code-box {
          position: relative;
          padding: 14px;
          border-radius: 10px;
          background: var(--bg-canvas, #07090e);
          border: 1px solid var(--border-default, #1e2638);
        }

        .embed-copy-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border-subtle, #1e2638);
          color: var(--text-primary, #f8fafc);
          font-size: 11px;
          cursor: pointer;
        }
        .embed-copy-btn.copied {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }
      `}</style>
    </div>
  );
};
