'use client';

import React, { useState } from 'react';
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
  Eye,
  CheckCircle2,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PresenceUser, SIMULATED_TEAMMATES } from '../../lib/supabase/useRealtimeTickets';

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

  if (!isOpen || !activeBoard) return null;

  // Generate shareable join link with origin
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const joinUrl = `${origin}/?join_board=${activeBoard.id}&role=${selectedRole}&inviter=${encodeURIComponent(
    currentUser?.full_name || 'Alex Rivera'
  )}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(joinUrl, '_blank');
    }
  };

  const handleSendEmailInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    inviteMember(emailInput.trim(), selectedRole);
    setEmailSuccess(`Invitation sent to ${emailInput.trim()}!`);
    setEmailInput('');
    setTimeout(() => setEmailSuccess(''), 4000);

    onBroadcastAction('join', `Invited new collaborator ${emailInput.trim()} to ${activeBoard.name}`);
  };

  return (
    <div className="modal-overlay" id="invite-collaborators-overlay" onClick={onClose}>
      <div 
        className="modal-card glass-panel animate-pop-in max-w-[620px] w-full max-h-[90vh] overflow-y-auto" 
        id="invite-collaborators-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-invite-modal-btn"
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          title="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-badge flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono w-fit">
            <Radio size={12} className="text-emerald-400 animate-pulse" />
            <span>Realtime Multi-User Engine</span>
          </div>
          <h2 className="text-xl font-bold mt-2 text-white">Invite & Realtime Collaborators</h2>
          <p className="text-secondary text-xs mt-1">
            Share this board with teammates or simulate live multiplayer presence in real-time.
          </p>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-5">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'link' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => setActiveTab('link')}
          >
            <Copy size={13} />
            <span>Share Join Link</span>
          </button>

          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'email' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => setActiveTab('email')}
          >
            <Mail size={13} />
            <span>Invite by Email</span>
          </button>

          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'presence' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => setActiveTab('presence')}
          >
            <Users size={13} />
            <span>Live Presence ({onlineUsers.length})</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>

        {/* ================= TAB 1: SHARE JOIN LINK ================= */}
        {activeTab === 'link' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Invite Link Permissions</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-200 px-2.5 py-1 focus:outline-none focus:border-emerald-500"
                >
                  <option value="member">Member (Can edit tasks & sub-items)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                  <option value="admin">Admin (Full management privileges)</option>
                </select>
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value={joinUrl}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 pr-24 select-all focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`absolute right-1.5 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                    copied 
                      ? 'bg-emerald-500 text-black font-semibold' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
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

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Anyone with this URL joins this board and connects to your session in realtime.
                </span>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium hover:underline"
                >
                  <span>Open in 2nd Tab to Test</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-3">
              <Zap size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-emerald-300">Instant Multi-User Collaboration</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  When a teammate or separate browser tab opens this link, presence is synchronized through Supabase WebSockets (or BroadcastChannel locally). Both participants see live ticket edits, claims, and active viewing indicators instantly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: INVITE BY EMAIL ================= */}
        {activeTab === 'email' && (
          <form onSubmit={handleSendEmailInvite} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Teammate Email Address</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-emerald-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs font-semibold px-4 whitespace-nowrap"
                >
                  <UserPlus size={13} />
                  <span>Send Invite</span>
                </button>
              </div>
            </div>

            {emailSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{emailSuccess}</span>
              </div>
            )}

            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-400 mb-2">Workspace Teammates in {currentWorkspace?.name || 'Workspace'}</p>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {onlineUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                      <div>
                        <div className="font-medium text-white">{user.name}</div>
                        <div className="text-[10px] text-slate-400">{user.email}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300">
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
          <div className="space-y-5">
            {/* Active Online Users Roster */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Currently Online on This Board ({onlineUsers.length})</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400">WebSocket / Realtime Sync</span>
              </div>

              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {onlineUsers.map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  return (
                    <div 
                      key={user.id} 
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                        isCurrent 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-slate-900/60 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-7 h-7 rounded-full object-cover border" 
                            style={{ borderColor: user.color }} 
                          />
                          <span 
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black" 
                            style={{ backgroundColor: user.color }} 
                          />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                                YOU
                              </span>
                            )}
                            {user.isSimulated && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300">
                                SIMULATED
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{user.role}</span>
                            {user.activeItemTitle && (
                              <span className="text-emerald-400/90 font-mono">
                                • Viewing: {user.activeItemTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {user.isSimulated && (
                          <button
                            type="button"
                            onClick={() => onSimulateLeave(user.id)}
                            className="text-xs text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded"
                            title="Disconnect simulated user"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Active Now
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulated Teammate Playground */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-400" />
                  <span>Interactive Multi-User Simulator</span>
                </span>
                <span className="text-[11px] text-slate-400">Test presence without a 2nd computer</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {SIMULATED_TEAMMATES.map((teammate) => {
                  const isOnline = onlineUsers.some((u) => u.id === teammate.id);
                  return (
                    <div 
                      key={teammate.id}
                      className="p-2.5 rounded-lg bg-slate-900/80 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <img src={teammate.avatar} alt={teammate.name} className="w-6 h-6 rounded-full object-cover" />
                        <div>
                          <div className="text-xs font-medium text-white">{teammate.name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{teammate.role}</div>
                        </div>
                      </div>

                      {isOnline ? (
                        <button
                          type="button"
                          onClick={() => onSimulateLeave(teammate.id)}
                          className="px-2 py-1 rounded text-[10px] font-medium bg-rose-500/15 text-rose-400 border border-rose-500/25 hover:bg-rose-500/25 transition-all"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSimulateJoin(teammate)}
                          className="px-2 py-1 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all"
                        >
                          + Join Board
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onBroadcastAction('status_change', 'Taylor Chen marked TK-1024 as Done')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5"
                >
                  <RefreshCw size={11} />
                  <span>Simulate Collaborative Action Broadcast</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="modal-actions mt-6 pt-3 border-t border-white/10 flex justify-between items-center">
          <div className="text-[11px] font-mono text-slate-400">
            Active Board: <span className="text-emerald-400 font-semibold">{activeBoard.name}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm text-xs"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
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

        .modal-card {
          width: 100%;
          background: #0b0f19;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 26px;
          position: relative;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        .modal-close-btn {
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

        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
      `}</style>
    </div>
  );
};
