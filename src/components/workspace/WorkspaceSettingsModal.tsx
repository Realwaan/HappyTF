'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WorkspaceRole } from '../../types';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { 
  X, 
  Settings, 
  Users, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Mail, 
  Shield, 
  Check, 
  Save,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { AVAILABLE_ICONS, IconBadge } from '../common/IconBadge';

export const WorkspaceSettingsModal: React.FC = () => {
  const { 
    isWorkspaceSettingsOpen, 
    setWorkspaceSettingsOpen, 
    currentWorkspace, 
    workspaces, 
    updateWorkspace, 
    deleteWorkspace, 
    members, 
    inviteMember, 
    updateMemberRole, 
    removeMember,
    currentUser,
    activeSettingsTab
  } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'danger'>(activeSettingsTab === 'danger' ? 'danger' : activeSettingsTab === 'members' ? 'members' : 'general');
  const [name, setName] = useState(currentWorkspace?.name || '');
  const [iconEmoji, setIconEmoji] = useState(currentWorkspace?.icon_emoji || 'zap');
  const [brandColor, setBrandColor] = useState(currentWorkspace?.brand_color || '#3ecf8e');

  // Invite input state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isWorkspaceSettingsOpen || !currentWorkspace) return null;

  const colors = ['#3ecf8e', '#24b47e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkspace(currentWorkspace.id, {
      name: name.trim() || currentWorkspace.name,
      icon_emoji: iconEmoji,
      brand_color: brandColor,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return;
    inviteMember(inviteEmail.trim(), inviteRole);
    setInviteEmail('');
    setInviteSuccess(true);
    setTimeout(() => setInviteSuccess(false), 2500);
  };

  return (
    <div className="modal-overlay" id="workspace-settings-overlay">
      <div className="settings-modal glass-panel animate-pop-in" id="workspace-settings-modal">
        {/* Sidebar Nav inside settings */}
        <div className="settings-sidebar">
          <div className="settings-header">
            <div className="ws-settings-icon-box" style={{ color: currentWorkspace.brand_color }}>
              <IconBadge nameOrEmoji={currentWorkspace.icon_emoji} size={18} color={currentWorkspace.brand_color} />
            </div>
            <div className="ws-meta">
              <h3>{currentWorkspace.name}</h3>
              <span className="text-xs text-muted">Workspace Settings</span>
            </div>
          </div>

          <nav className="settings-nav">
            <button
              id="tab-settings-general"
              type="button"
              className={`nav-item ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <Settings size={16} />
              <span>General Details</span>
            </button>
            <button
              id="tab-settings-members"
              type="button"
              className={`nav-item ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <Users size={16} />
              <span>Team & Members ({members.length})</span>
            </button>
            <button
              id="tab-settings-danger"
              type="button"
              className={`nav-item danger-tab ${activeTab === 'danger' ? 'active' : ''}`}
              onClick={() => setActiveTab('danger')}
            >
              <ShieldAlert size={16} />
              <span>Danger Zone</span>
            </button>
          </nav>
        </div>

        {/* Content Pane */}
        <div className="settings-content">
          <button
            id="close-settings-btn"
            type="button"
            className="modal-close-btn"
            onClick={() => setWorkspaceSettingsOpen(false)}
          >
            <X size={18} />
          </button>

          {/* TAB 1: General */}
          {activeTab === 'general' && (
            <div className="tab-pane animate-fade-in" id="pane-general">
              <h2>Workspace Overview</h2>
              <p className="tab-subtitle">Manage organization branding, name, and visual icon identifiers.</p>

              <form onSubmit={handleSaveGeneral} className="settings-form">
                <div className="form-group">
                  <label htmlFor="settings-ws-name">Workspace Name</label>
                  <input
                    id="settings-ws-name"
                    type="text"
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="style-grid">
                  <div className="form-group">
                    <label>Workspace Icon</label>
                    <div className="icon-picker-grid">
                      {AVAILABLE_ICONS.map((ic) => (
                        <button
                          key={ic.id}
                          type="button"
                          className={`icon-choice-btn ${iconEmoji === ic.id ? 'selected' : ''}`}
                          onClick={() => setIconEmoji(ic.id)}
                          title={ic.label}
                        >
                          <IconBadge nameOrEmoji={ic.id} size={15} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Brand Theme Color</label>
                    <div className="color-row">
                      {colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`color-btn ${brandColor === c ? 'selected' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setBrandColor(c)}
                        >
                          {brandColor === c && <Check size={12} color="#ffffff" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="settings-footer">
                  {savedNotice && (
                    <span className="save-notice text-xs" id="general-save-notice">
                      <Check size={14} /> Changes saved successfully!
                    </span>
                  )}
                  <button
                    id="save-general-settings-btn"
                    type="submit"
                    className="btn btn-primary"
                  >
                    <Save size={16} />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Members */}
          {activeTab === 'members' && (
            <div className="tab-pane animate-fade-in" id="pane-members">
              <h2>Team & Members</h2>
              <p className="tab-subtitle">Invite team members and manage role-based permission tiers.</p>

              {/* Invite box */}
              <form onSubmit={handleSendInvite} className="invite-box" id="invite-member-form">
                <div className="invite-inputs">
                  <div className="input-wrapper email-input-wrap">
                    <Mail size={16} className="input-icon" />
                    <input
                      id="invite-member-email"
                      type="email"
                      className="input-field with-icon"
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <select
                    id="invite-member-role"
                    className="select-field"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>
                  <button
                    id="submit-invite-btn"
                    type="submit"
                    className="btn btn-primary"
                  >
                    <Plus size={16} />
                    <span>Invite</span>
                  </button>
                </div>
                {inviteSuccess && (
                  <p className="invite-success-text text-xs" id="invite-success-text">
                    <Check size={14} /> Invitation dispatched with instant access token!
                  </p>
                )}
              </form>

              {/* Member list */}
              <div className="member-list" id="member-list-container">
                {members.map((member, idx) => (
                  <div key={member.id ? `${member.id}-${member.user_id || idx}` : `member-${idx}`} className="member-row" id={`member-row-${member.id}`}>
                    <div className="member-info">
                      <img
                        src={getSafeAvatar(member.profile?.avatar_url, member.profile?.full_name)}
                        alt={member.profile?.full_name || 'Member'}
                        className="member-avatar"
                      />
                      <div className="member-details">
                        <div className="member-name-row">
                          <span className="member-name">{member.profile?.full_name || member.user_id}</span>
                          {member.user_id === currentUser?.id && (
                            <span className="you-pill">You</span>
                          )}
                        </div>
                        <span className="member-email">{member.profile?.email || 'member@happytf.dev'}</span>
                      </div>
                    </div>

                    <div className="member-actions">
                      <select
                        className="select-field select-role"
                        value={member.role}
                        disabled={member.role === 'owner' && member.user_id === currentUser?.id}
                        onChange={(e) => updateMemberRole(member.id, e.target.value as WorkspaceRole)}
                        id={`role-select-${member.id}`}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>

                      {member.role !== 'owner' && (
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeMember(member.id)}
                          title="Remove from workspace"
                          id={`remove-member-${member.id}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Danger Zone */}
          {activeTab === 'danger' && (
            <div className="tab-pane animate-fade-in" id="pane-danger">
              <div className="danger-header">
                <AlertTriangle size={24} className="text-danger" />
                <div>
                  <h2>Danger Zone</h2>
                  <p className="tab-subtitle">Destructive actions for this workspace and its associated data.</p>
                </div>
              </div>

              <div className="danger-card">
                <div className="danger-action-info">
                  <h4>Leave this workspace</h4>
                  <p className="text-secondary text-xs">
                    You will lose access to all boards, items, and team updates in {currentWorkspace.name}.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary text-danger"
                  id="leave-workspace-btn"
                  onClick={() => {
                    if (confirm(`Are you sure you want to leave ${currentWorkspace.name}?`)) {
                      deleteWorkspace(currentWorkspace.id);
                    }
                  }}
                >
                  <LogOut size={16} />
                  <span>Leave Workspace</span>
                </button>
              </div>

              <div className="danger-card danger-delete">
                <div className="danger-action-info">
                  <h4>Delete this workspace permanently</h4>
                  <p className="text-secondary text-xs">
                    Irreversible action. All boards, groups, items, and member permissions will be deleted.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary text-danger"
                  id="delete-workspace-btn"
                  onClick={() => {
                    if (confirm(`WARNING: Type to confirm deletion of "${currentWorkspace.name}". All data will be permanently wiped.`)) {
                      deleteWorkspace(currentWorkspace.id);
                    }
                  }}
                >
                  <Trash2 size={16} />
                  <span>Delete Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 12, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 24px;
        }

        .settings-modal {
          width: 100%;
          max-width: 820px;
          min-height: 520px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 20px;
          display: flex;
          overflow: hidden;
          position: relative;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
        }

        .settings-sidebar {
          width: 240px;
          background: var(--bg-subtle);
          border-right: 1px solid var(--border-subtle);
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .settings-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .ws-emoji {
          font-size: 26px;
          padding: 6px;
          background: var(--bg-elevated);
          border-radius: 10px;
        }

        .ws-meta h3 {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 130px;
        }

        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          text-align: left;
        }
        .nav-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .nav-item.active {
          background: var(--bg-elevated);
          color: var(--primary-light);
          border-left: 3px solid var(--primary);
        }
        .nav-item.danger-tab:hover, .nav-item.danger-tab.active {
          color: var(--danger);
        }

        .settings-content {
          flex: 1;
          padding: 32px;
          position: relative;
          overflow-y: auto;
        }

        .modal-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          color: var(--text-muted);
          padding: 6px;
          border-radius: 8px;
          transition: all var(--transition-fast);
        }
        .modal-close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .tab-pane h2 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .tab-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .style-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .ws-settings-icon-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .icon-picker-grid, .color-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }

        .icon-choice-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .icon-choice-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-highlight);
          background: var(--bg-elevated);
        }
        .icon-choice-btn.selected {
          border-color: var(--primary);
          background: rgba(62, 207, 142, 0.18);
          color: var(--primary);
        }

        .color-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--transition-fast);
        }
        .color-btn.selected {
          transform: scale(1.15);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
        }

        .settings-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
        }

        .save-notice {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--success);
          font-weight: 500;
        }

        /* Invite box */
        .invite-box {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 24px;
        }

        .invite-inputs {
          display: flex;
          gap: 10px;
        }

        .email-input-wrap {
          flex: 1;
        }

        .select-field {
          padding: 8px 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 13px;
        }

        .invite-success-text {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--success);
          margin-top: 10px;
        }

        /* Member list */
        .member-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 280px;
          overflow-y: auto;
        }

        .member-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          transition: background var(--transition-fast);
        }
        .member-row:hover {
          background: var(--bg-elevated);
        }

        .member-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .member-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--border-default);
        }

        .member-details {
          display: flex;
          flex-direction: column;
        }

        .member-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .member-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .you-pill {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 4px;
          background: var(--primary-glow);
          color: var(--primary-light);
          font-weight: 600;
        }

        .member-email {
          font-size: 12px;
          color: var(--text-muted);
        }

        .member-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .select-role {
          font-size: 12px;
          padding: 6px 10px;
        }

        .remove-btn {
          color: var(--text-muted);
          padding: 6px;
          border-radius: 6px;
          transition: all var(--transition-fast);
        }
        .remove-btn:hover {
          color: var(--danger);
          background: var(--danger-bg);
        }

        /* Danger Tab */
        .danger-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .danger-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          margin-bottom: 14px;
        }

        .danger-delete {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.04);
        }

        .danger-action-info h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
};
