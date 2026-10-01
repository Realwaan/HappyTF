'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Users, 
  Copy, 
  Check, 
  ExternalLink, 
  Mail, 
  UserPlus, 
  ShieldCheck, 
  Radio, 
  Sparkles,
  Zap,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PresenceUser, SIMULATED_TEAMMATES } from '../../lib/supabase/useRealtimeTickets';
import { getSafeAvatar } from '../../lib/avatarHelper';

interface InviteCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: PresenceUser[];
  onSimulateJoin: (user: PresenceUser) => void;
  onSimulateLeave: (userId: string) => void;
  onBroadcastAction: (action: 'join' | 'leave' | 'view' | 'claim' | 'status_change', message: string) => void;
}

export const InviteCollaboratorsModal: React.FC<InviteCollaboratorsModalProps> = ({
  isOpen,
  onClose,
  onlineUsers,
  onSimulateJoin,
  onSimulateLeave,
  onBroadcastAction,
}) => {
  const { 
    activeBoard, 
    currentUser, 
    inviteMember, 
    currentWorkspace 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'link' | 'email' | 'presence'>('link');
  const [copied, setCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'member' | 'viewer' | 'admin'>('member');
  const [emailInput, setEmailInput] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emailTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard navigation & a11y dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clean up asynchronous timers on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
    };
  }, []);

  if (!isOpen || !activeBoard) return null;

  // Generate shareable join link with origin and metadata
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const joinUrl = `${origin}/?join_board=${activeBoard.id}&board_name=${encodeURIComponent(
    activeBoard.name
  )}&ws_id=${encodeURIComponent(currentWorkspace?.id || '')}&ws_name=${encodeURIComponent(
    currentWorkspace?.name || 'Workspace'
  )}&role=${selectedRole}&inviter=${encodeURIComponent(
    currentUser?.full_name || 'Team Lead'
  )}`;

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(joinUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = joinUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = joinUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
      } catch {
        setCopied(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  const handleOpenInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(joinUrl, '_blank');
    }
  };

  const handleSendEmailInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) return;

    inviteMember(cleanEmail, selectedRole);
    setEmailSuccess(`Invitation sent to ${cleanEmail}!`);
    setEmailInput('');
    if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
    emailTimeoutRef.current = setTimeout(() => setEmailSuccess(''), 4000);

    onBroadcastAction('join', `Invited new collaborator ${cleanEmail} to ${activeBoard.name}`);
  };

  return (
    <div className="invite-modal-overlay animate-fade-in" id="invite-collaborators-overlay" onClick={onClose}>
      <div 
        className="invite-modal-card glass-panel animate-pop-in" 
        id="invite-collaborators-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
        aria-describedby="invite-modal-desc"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-invite-modal-btn"
          type="button"
          className="invite-close-btn"
          onClick={onClose}
          title="Close modal"
          aria-label="Close modal"
        >
          <X size={17} />
        </button>

        {/* Modal Header */}
        <div className="invite-header">
          <div className="invite-badge">
            <Radio size={12} className="pulse-icon" />
            <span>Realtime Multi-User Engine</span>
          </div>
          <h2 className="invite-title" id="invite-modal-title">Invite & Realtime Collaborators</h2>
          <p className="invite-subtitle" id="invite-modal-desc">
            Share this board with teammates or simulate live multiplayer presence in real-time.
          </p>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="invite-tabs-bar">
          <button
            type="button"
            className={`invite-tab-btn ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            <Copy size={13} />
            <span>Share Join Link</span>
          </button>

          <button
            type="button"
            className={`invite-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            <Mail size={13} />
            <span>Invite by Email</span>
          </button>

          <button
            type="button"
            className={`invite-tab-btn ${activeTab === 'presence' ? 'active' : ''}`}
            onClick={() => setActiveTab('presence')}
          >
            <Users size={13} />
            <span>Live Presence ({onlineUsers.length})</span>
            <span className="live-dot" />
          </button>
        </div>

        {/* ================= TAB 1: SHARE JOIN LINK ================= */}
        {activeTab === 'link' && (
          <div className="tab-pane">
            <div className="invite-box">
              <div className="invite-row-split">
                <label className="invite-field-label">
                  <ShieldCheck size={14} className="text-primary" />
                  <span>Invite Link Permissions</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="invite-select"
                >
                  <option value="member">Member (Can edit tasks & sub-items)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                  <option value="admin">Admin (Full management privileges)</option>
                </select>
              </div>

              {/* Robust, Non-Overlapping Input Row */}
              <div className="link-input-group">
                <input
                  type="text"
                  readOnly
                  value={joinUrl}
                  className="link-input-text"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  id="invite-modal-copy-btn"
                  onClick={handleCopyLink}
                  className={`link-copy-button ${copied ? 'copied' : ''}`}
                >
                  {copied ? (
                    <>
                      <Check size={13} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="invite-row-split meta-row">
                <span className="hint-text">
                  Anyone with this URL joins this board and connects to your session in realtime.
                </span>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="open-tab-btn"
                >
                  <span>Open in 2nd Tab to Test</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>

            <div className="info-banner">
              <Zap size={16} className="text-primary info-icon" />
              <div className="info-text-col">
                <div className="info-heading">Instant Multi-User Collaboration</div>
                <div className="info-desc">
                  When a teammate or separate browser tab opens this link, presence is synchronized through Supabase WebSockets (or BroadcastChannel locally). Both participants see live ticket edits, claims, and active viewing indicators instantly.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: INVITE BY EMAIL ================= */}
        {activeTab === 'email' && (
          <form onSubmit={handleSendEmailInvite} className="tab-pane">
            <div className="invite-box">
              <label className="invite-field-label">Teammate Email Address</label>
              <div className="email-input-row">
                <div className="email-input-wrap">
                  <Mail size={14} className="email-icon" />
                  <input
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="email-input"
                  />
                </div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="invite-select"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  className="send-invite-btn"
                >
                  <UserPlus size={13} />
                  <span>Send Invite</span>
                </button>
              </div>

              {emailSuccess && (
                <div className="success-banner">
                  <Check size={14} />
                  <span>{emailSuccess}</span>
                </div>
              )}
            </div>

            <div className="invite-box">
              <div className="teammate-list-title">Workspace Members in {currentWorkspace?.name || 'Workspace'}</div>
              <div className="teammates-scroll-list">
                {onlineUsers.map((user) => (
                  <div key={user.id} className="teammate-row">
                    <div className="teammate-info">
                      <img src={getSafeAvatar(user.avatar, user.name)} alt={user.name} className="teammate-avatar" />
                      <div>
                        <div className="teammate-name">{user.name}</div>
                        <div className="teammate-email">{user.email}</div>
                      </div>
                    </div>
                    <span className="teammate-role-pill">
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* ================= TAB 3: LIVE PRESENCE & SIMULATOR ================= */}
        {activeTab === 'presence' && (
          <div className="tab-pane">
            {/* Active Online Users Roster */}
            <div className="invite-box">
              <div className="invite-row-split" style={{ marginBottom: 10 }}>
                <span className="invite-field-label">
                  <span className="live-dot" />
                  <span>Currently Online on This Board ({onlineUsers.length})</span>
                </span>
                <span className="realtime-status-pill">WebSocket / Realtime Sync</span>
              </div>

              <div className="presence-scroll-list">
                {onlineUsers.map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  return (
                    <div 
                      key={user.id} 
                      className={`presence-user-card ${isCurrent ? 'current-user' : ''}`}
                    >
                      <div className="presence-user-left">
                        <div className="avatar-wrapper">
                          <img 
                            src={getSafeAvatar(user.avatar, user.name)} 
                            alt={user.name} 
                            className="presence-avatar" 
                            style={{ borderColor: user.color }} 
                          />
                          <span 
                            className="presence-dot" 
                            style={{ backgroundColor: user.color }} 
                          />
                        </div>
                        <div>
                          <div className="presence-name-row">
                            <span className="presence-name">{user.name}</span>
                            {isCurrent && (
                              <span className="you-badge">YOU</span>
                            )}
                            {user.isSimulated && (
                              <span className="simulated-badge">SIMULATED</span>
                            )}
                          </div>
                          <div className="presence-subtext">
                            <span>{user.role}</span>
                            {user.activeItemTitle && (
                              <span className="viewing-pill">
                                • Viewing: {user.activeItemTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="presence-actions">
                        {user.isSimulated && (
                          <button
                            type="button"
                            onClick={() => onSimulateLeave(user.id)}
                            className="disconnect-btn"
                            title="Disconnect simulated user"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <span className="active-tag">Active Now</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulated Teammate Playground */}
            <div className="invite-box">
              <div className="invite-row-split" style={{ marginBottom: 10 }}>
                <span className="invite-field-label">
                  <Sparkles size={13} className="text-purple" />
                  <span>Interactive Multi-User Simulator</span>
                </span>
                <span className="hint-text">Test presence without a 2nd computer</span>
              </div>

              <div className="simulator-grid">
                {SIMULATED_TEAMMATES.map((teammate) => {
                  const isOnline = onlineUsers.some((u) => u.id === teammate.id);
                  return (
                    <div key={teammate.id} className="simulator-card">
                      <div className="simulator-card-left">
                        <img src={getSafeAvatar(teammate.avatar, teammate.name)} alt={teammate.name} className="simulator-avatar" />
                        <div>
                          <div className="simulator-name">{teammate.name}</div>
                          <div className="simulator-role">{teammate.role}</div>
                        </div>
                      </div>

                      {isOnline ? (
                        <button
                          type="button"
                          onClick={() => onSimulateLeave(teammate.id)}
                          className="sim-action-btn disconnect"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSimulateJoin(teammate)}
                          className="sim-action-btn join"
                        >
                          + Join Board
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => onBroadcastAction('status_change', 'Taylor Chen marked TK-1024 as Done')}
                  className="broadcast-action-btn"
                >
                  <RefreshCw size={12} />
                  <span>Simulate Collaborative Action Broadcast</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="invite-footer">
          <div className="footer-board-label">
            Active Board: <span className="board-name-highlight">{activeBoard.name}</span>
          </div>
          <button
            type="button"
            className="done-btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>

      <style jsx>{`
        .invite-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 12, 0.82);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 20px;
        }

        .invite-modal-card {
          width: 100%;
          max-width: 620px;
          max-height: 90vh;
          overflow-y: auto;
          background: #0d111d;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 26px;
          position: relative;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05);
          color: #f8fafc;
        }

        .invite-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .invite-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .invite-header {
          margin-bottom: 18px;
        }

        .invite-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 9999px;
          background: rgba(62, 207, 142, 0.12);
          border: 1px solid rgba(62, 207, 142, 0.25);
          color: #3ecf8e;
          font-size: 11px;
          font-family: var(--font-mono, monospace);
        }

        .pulse-icon {
          animation: pulse 1.5s infinite;
        }

        .invite-title {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 8px 0 0 0;
        }

        .invite-subtitle {
          font-size: 12px;
          color: #94a3b8;
          margin: 4px 0 0 0;
        }

        .invite-tabs-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 12px;
          margin-bottom: 18px;
        }

        .invite-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .invite-tab-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }
        .invite-tab-btn.active {
          background: rgba(62, 207, 142, 0.15);
          color: #3ecf8e;
          border-color: rgba(62, 207, 142, 0.3);
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #3ecf8e;
          box-shadow: 0 0 6px #3ecf8e;
        }

        .tab-pane {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .invite-box {
          background: rgba(18, 24, 38, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .invite-row-split {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .invite-field-label {
          font-size: 12px;
          font-weight: 600;
          color: #e2e8f0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .invite-select {
          background: #121826;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          padding: 6px 10px;
          color: #f1f5f9;
          font-size: 12px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .invite-select:focus {
          border-color: #3ecf8e;
        }

        /* Fixed Link Box: Clean, No Overlap Input Group */
        .link-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(5, 7, 12, 0.85);
          border: 1px solid rgba(62, 207, 142, 0.35);
          border-radius: 8px;
          padding: 5px 6px 5px 12px;
          box-shadow: 0 0 16px rgba(62, 207, 142, 0.06);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .link-input-group:focus-within {
          border-color: #3ecf8e;
          box-shadow: 0 0 0 2px rgba(62, 207, 142, 0.25);
        }

        .link-input-text {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          color: #3ecf8e;
          font-family: var(--font-mono, monospace);
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          cursor: text;
        }

        .link-copy-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;
          background: #3ecf8e;
          color: #0a0c10;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s ease;
          box-shadow: 0 2px 8px rgba(62, 207, 142, 0.3);
        }
        .link-copy-button:hover {
          background: #24b47e;
          transform: translateY(-1px);
        }
        .link-copy-button.copied {
          background: #10b981;
          color: #ffffff;
        }

        .meta-row {
          padding-top: 2px;
        }

        .hint-text {
          font-size: 11px;
          color: #94a3b8;
        }

        .open-tab-btn {
          font-size: 11px;
          color: #3ecf8e;
          background: transparent;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: color 0.15s ease;
        }
        .open-tab-btn:hover {
          color: #4ade80;
          text-decoration: underline;
        }

        .info-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(62, 207, 142, 0.06);
          border: 1px solid rgba(62, 207, 142, 0.18);
        }

        .info-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .info-text-col {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .info-heading {
          font-size: 12px;
          font-weight: 600;
          color: #3ecf8e;
        }

        .info-desc {
          font-size: 11px;
          color: #94a3b8;
          line-height: 1.45;
        }

        /* Tab 2: Email */
        .email-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .email-input-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          position: relative;
        }

        .email-icon {
          position: absolute;
          left: 10px;
          color: #64748b;
          pointer-events: none;
        }

        .email-input {
          width: 100%;
          background: #121826;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          padding: 7px 12px 7px 32px;
          color: #f1f5f9;
          font-size: 12px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .email-input:focus {
          border-color: #3ecf8e;
        }

        .send-invite-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;
          background: #3ecf8e;
          color: #0a0c10;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .send-invite-btn:hover {
          background: #24b47e;
        }

        .success-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          background: rgba(62, 207, 142, 0.12);
          border: 1px solid rgba(62, 207, 142, 0.3);
          color: #3ecf8e;
          font-size: 12px;
        }

        .teammate-list-title {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .teammates-scroll-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 160px;
          overflow-y: auto;
        }

        .teammate-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .teammate-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .teammate-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
        }

        .teammate-name {
          font-size: 12px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .teammate-email {
          font-size: 10px;
          color: #94a3b8;
        }

        .teammate-role-pill {
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 10px;
          font-family: var(--font-mono, monospace);
          text-transform: uppercase;
          background: #1e293b;
          color: #cbd5e1;
        }

        /* Tab 3: Presence */
        .realtime-status-pill {
          font-size: 11px;
          font-family: var(--font-mono, monospace);
          color: #3ecf8e;
        }

        .presence-scroll-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 180px;
          overflow-y: auto;
        }

        .presence-user-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(18, 24, 38, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.15s ease;
        }
        .presence-user-card.current-user {
          background: rgba(62, 207, 142, 0.08);
          border-color: rgba(62, 207, 142, 0.25);
        }

        .presence-user-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar-wrapper {
          position: relative;
        }

        .presence-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid #3ecf8e;
        }

        .presence-dot {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          border: 2px solid #0d111d;
        }

        .presence-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .presence-name {
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
        }

        .you-badge {
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 9px;
          font-family: var(--font-mono, monospace);
          font-weight: 700;
          background: rgba(62, 207, 142, 0.2);
          color: #3ecf8e;
        }

        .simulated-badge {
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 9px;
          font-family: var(--font-mono, monospace);
          background: rgba(168, 85, 247, 0.2);
          color: #c084fc;
        }

        .presence-subtext {
          font-size: 10px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .viewing-pill {
          color: #3ecf8e;
          font-family: var(--font-mono, monospace);
        }

        .presence-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .disconnect-btn {
          background: transparent;
          border: none;
          color: #fb7185;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.15s ease;
        }
        .disconnect-btn:hover {
          background: rgba(244, 63, 94, 0.15);
        }

        .active-tag {
          font-size: 10px;
          font-family: var(--font-mono, monospace);
          color: #3ecf8e;
          background: rgba(62, 207, 142, 0.12);
          border: 1px solid rgba(62, 207, 142, 0.25);
          padding: 2px 7px;
          border-radius: 9999px;
        }

        /* Simulator Grid */
        .simulator-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        @media (max-width: 520px) {
          .simulator-grid {
            grid-template-columns: 1fr;
          }
        }

        .simulator-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(18, 24, 38, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .simulator-card-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .simulator-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .simulator-name {
          font-size: 12px;
          font-weight: 500;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .simulator-role {
          font-size: 10px;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sim-action-btn {
          font-size: 10px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .sim-action-btn.join {
          background: rgba(62, 207, 142, 0.15);
          color: #3ecf8e;
          border-color: rgba(62, 207, 142, 0.3);
        }
        .sim-action-btn.join:hover {
          background: rgba(62, 207, 142, 0.25);
        }
        .sim-action-btn.disconnect {
          background: rgba(244, 63, 94, 0.15);
          color: #fb7185;
          border-color: rgba(244, 63, 94, 0.3);
        }
        .sim-action-btn.disconnect:hover {
          background: rgba(244, 63, 94, 0.25);
        }

        .broadcast-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #818cf8;
          background: transparent;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: color 0.15s ease;
        }
        .broadcast-action-btn:hover {
          color: #a5b4fc;
          text-decoration: underline;
        }

        .invite-footer {
          margin-top: 20px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-board-label {
          font-size: 11px;
          font-family: var(--font-mono, monospace);
          color: #94a3b8;
        }

        .board-name-highlight {
          color: #3ecf8e;
          font-weight: 600;
        }

        .done-btn {
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f1f5f9;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .done-btn:hover {
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        .text-primary {
          color: #3ecf8e;
        }
        .text-purple {
          color: #c084fc;
        }
      `}</style>
    </div>
  );
};
