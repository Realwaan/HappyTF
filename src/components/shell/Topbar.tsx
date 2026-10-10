'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { NotificationsPopover } from './NotificationsPopover';
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  UserPlus, 
  User, 
  Settings, 
  Sparkles, 
  LogOut, 
  LogIn,
  Keyboard,
  Layers,
  Menu,
  Plus,
  PanelLeft,
  Volume2,
  VolumeX
} from 'lucide-react';
import { IconBadge } from '../common/IconBadge';
import { 
  isSoundEnabled, 
  setSoundEnabled, 
  playClickSound,
  playTransitionSound,
  playCompleteSound,
  playUrgentSound
} from '../../lib/soundFx';

interface TopbarProps {
  onOpenAuth: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenAuth }) => {
  const { 
    currentUser, 
    currentWorkspace, 
    unreadCount, 
    theme, 
    toggleTheme, 
    setCommandPaletteOpen, 
    setWorkspaceSettingsOpen,
    setCreateWorkspaceOpen,
    setCreateBoardOpen,
    setQuickTaskOpen,
    setOnboardingOpen,
    logout,
    activeView,
    activeBoard,
    boardGroups,
    addBoardItem,
    navigateToHome,
    setShortcutsModalOpen,
    toggleMobileSidebar,
    isSidebarCollapsed,
    toggleSidebar
  } = useApp();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSoundPopoverOpen, setIsSoundPopoverOpen] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const soundPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    if (next) playClickSound();
  };

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (soundPopoverRef.current && !soundPopoverRef.current.contains(target as Node) && !target.closest('#topbar-sound-toggle')) {
        setIsSoundPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="app-topbar glass-panel" id="app-topbar">
      {/* 1. Left section: Current Context & Mobile Hamburger */}
      <div className="topbar-left">
        <button
          id="topbar-mobile-hamburger"
          type="button"
          className="mobile-menu-trigger icon-tool-btn"
          onClick={toggleMobileSidebar}
          title="Open Navigation"
          aria-label="Toggle mobile menu navigation"
        >
          <Menu size={18} />
        </button>

        {/* Desktop Sidebar Toggle Button */}
        <button
          id="topbar-desktop-sidebar-toggle"
          type="button"
          className="desktop-sidebar-toggle icon-tool-btn"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+\\)" : "Collapse Sidebar (Ctrl+\\)"}
          aria-label="Toggle sidebar collapse"
        >
          <PanelLeft size={16} />
        </button>

        <div className="breadcrumb-pill">
          <span className="ws-indicator">
            <IconBadge 
              nameOrEmoji={currentWorkspace?.icon_emoji || 'zap'} 
              size={13} 
              color={currentWorkspace?.brand_color || 'var(--primary)'} 
            />
          </span>
          <button type="button" className="breadcrumb-link" onClick={navigateToHome} aria-label="Go to workspace home">
            {currentWorkspace?.name || 'Workspace'}
          </button>
          <span className="breadcrumb-divider">/</span>
          {activeView === 'home' ? (
            <span className="breadcrumb-current">My Work</span>
          ) : (
            <span className="breadcrumb-current flex items-center gap-1.5">
              <IconBadge nameOrEmoji={activeBoard?.icon_emoji || 'kanban'} size={13} />
              <span>{activeBoard?.name || 'Board'}</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Center: ⌘K Global Command Search */}
      <div className="topbar-center">
        <button
          id="topbar-search-trigger"
          type="button"
          className="search-palette-trigger"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search boards, items, or run command (⌘K)"
        >
          <Search size={15} className="search-icon" />
          <span className="search-text">Search boards, items, or jump to...</span>
          <span className="kbd-shortcut font-mono">
            <kbd>⌘</kbd>
            <kbd>K</kbd>
          </span>
        </button>
      </div>

      {/* 3. Right: Actions & User Menu */}
      <div className="topbar-right">
        {/* Primary Call-to-Action Group */}
        <div className="topbar-cta-group">
          <button
            id="topbar-primary-cta"
            type="button"
            className="btn btn-primary btn-sm topbar-cta-btn"
            onClick={() => {
              if (activeView === 'board') {
                setQuickTaskOpen(true);
              } else {
                setCreateBoardOpen(true);
              }
            }}
            title={activeView === 'board' ? 'Create new task (C)' : 'Create new board (B)'}
            aria-label={activeView === 'board' ? 'Create new task' : 'Create new board'}
          >
            <Plus size={14} />
            <span className="cta-label font-semibold">
              {activeView === 'board' ? 'New Issue' : 'New Board'}
            </span>
          </button>

          {/* Quick Invite Button */}
          <button
            id="topbar-invite-btn"
            type="button"
            className="btn btn-secondary btn-sm topbar-invite-btn"
            onClick={() => setWorkspaceSettingsOpen(true, 'members')}
            aria-label="Invite team members"
          >
            <UserPlus size={14} className="text-primary" />
            <span>Invite</span>
          </button>
        </div>

        <div className="topbar-v-divider" />

        {/* Utility Tools Group */}
        <div className="topbar-tools-group">
          {/* Mobile Search Button (Visible on screens <= 768px) */}
          <button
            id="topbar-mobile-search-btn"
            type="button"
            className="icon-tool-btn mobile-only-tool"
            onClick={() => setCommandPaletteOpen(true)}
            title="Search (⌘K)"
            aria-label="Search boards, items, or jump to..."
          >
            <Search size={16} />
          </button>

          {/* Keyboard Shortcuts Trigger */}
          <button
            id="topbar-shortcuts-btn"
            type="button"
            className="icon-tool-btn desktop-only-tool"
            onClick={() => setShortcutsModalOpen(true)}
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard size={16} />
          </button>

          {/* Sound Effects Toggle & Preferences Popover */}
          <div className="sound-anchor" ref={soundPopoverRef}>
            <button
              id="topbar-sound-toggle"
              type="button"
              className="icon-tool-btn"
              onClick={() => setIsSoundPopoverOpen(!isSoundPopoverOpen)}
              title="Sound & Haptic Preferences"
              aria-label="Sound & Haptic Preferences"
            >
              {soundEnabled ? (
                <Volume2 size={16} style={{ color: 'var(--primary)' }} />
              ) : (
                <VolumeX size={16} style={{ color: 'var(--text-muted)' }} />
              )}
            </button>

            {isSoundPopoverOpen && (
              <div 
                className="sound-settings-popover glass-panel animate-pop-in" 
                id="sound-settings-popover"
              >
                <div className="sound-popover-header">
                  <div className="flex items-center gap-2">
                    <Volume2 size={14} className="text-primary" />
                    <span className="font-semibold text-xs text-primary-light uppercase tracking-wider">Audio & Haptics</span>
                  </div>
                  <span className={`status-pill font-mono text-[10px] ${soundEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800'}`}>
                    {soundEnabled ? 'ACTIVE' : 'MUTED'}
                  </span>
                </div>

                <div className="sound-master-row">
                  <div className="sound-info">
                    <span className="sound-title">Sound Effects</span>
                    <span className="sound-desc">Subtle tactile clicks and milestone fanfares</span>
                  </div>
                  <button
                    id="sound-master-switch-btn"
                    type="button"
                    className={`sound-switch-toggle ${soundEnabled ? 'active' : ''}`}
                    onClick={toggleSound}
                    aria-label="Toggle all sound effects"
                  >
                    <span className="switch-thumb" />
                  </button>
                </div>

                <div className="sound-divider" />

                <div className="sound-test-section">
                  <span className="sound-section-label">Preview Sound Effects</span>
                  <div className="sound-test-grid">
                    <button
                      id="sound-test-click-btn"
                      type="button"
                      className="sound-test-chip"
                      onClick={() => playClickSound()}
                      title="Mechanical tactile click"
                    >
                      <span>Click</span>
                      <kbd className="font-mono text-[9px]">440Hz</kbd>
                    </button>
                    <button
                      id="sound-test-transition-btn"
                      type="button"
                      className="sound-test-chip"
                      onClick={() => playTransitionSound()}
                      title="Status transition chord"
                    >
                      <span>Transition</span>
                      <kbd className="font-mono text-[9px]">E4-A4</kbd>
                    </button>
                    <button
                      id="sound-test-complete-btn"
                      type="button"
                      className="sound-test-chip"
                      onClick={() => playCompleteSound()}
                      title="Sprint milestone fanfare"
                    >
                      <span>Complete</span>
                      <kbd className="font-mono text-[9px]">C5-C6</kbd>
                    </button>
                    <button
                      id="sound-test-urgent-btn"
                      type="button"
                      className="sound-test-chip sound-urgent-chip"
                      onClick={() => playUrgentSound()}
                      title="Urgent alert buzzer"
                    >
                      <span>Urgent</span>
                      <kbd className="font-mono text-[9px]">D5-A4</kbd>
                    </button>
                  </div>
                </div>

                <div className="sound-divider" />

                <div className="sound-haptics-status">
                  <div className="haptics-indicator-dot" />
                  <span className="text-[11px] text-muted">
                    Haptics: <strong>Active</strong> (10-30ms pulse on mobile)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            id="topbar-theme-toggle"
            type="button"
            className="icon-tool-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} style={{ color: '#f59e0b' }} /> : <Moon size={16} style={{ color: '#6366f1' }} />}
          </button>

          {/* Notifications Bell */}
          <div className="notifications-anchor">
            <button
              id="topbar-notifications-btn"
              type="button"
              className="icon-tool-btn"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              title="Notifications"
              aria-label="Open notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && <span className="bell-badge font-mono">{unreadCount}</span>}
            </button>

            <NotificationsPopover
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>
        </div>

        <div className="topbar-v-divider" />

        {/* User Profile Avatar & Menu */}
        <div className="profile-anchor" ref={profileMenuRef}>
          {currentUser ? (
            <button
              id="topbar-profile-btn"
              type="button"
              className="user-profile-btn"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              title={`${currentUser.full_name} (${currentUser.job_role || 'Member'})`}
              aria-label="Open profile settings menu"
            >
              <img
                src={getSafeAvatar(currentUser.avatar_url, currentUser.full_name)}
                alt={currentUser.full_name}
                className="user-avatar"
              />
              <span className="online-dot" />
            </button>
          ) : (
            <button
              id="topbar-signin-btn"
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onOpenAuth}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
          )}

          {/* Profile Dropdown */}
          {isProfileMenuOpen && currentUser && (
            <div className="profile-dropdown-menu glass-panel animate-pop-in" id="profile-dropdown-menu">
              <div className="profile-card">
                <img
                  src={getSafeAvatar(currentUser.avatar_url, currentUser.full_name)}
                  alt={currentUser.full_name}
                  className="dropdown-avatar"
                />
                <div className="profile-meta">
                  <span className="profile-name">{currentUser.full_name}</span>
                  <span className="profile-role">{currentUser.job_role || 'Workspace Member'}</span>
                  <span className="profile-email text-xs text-muted font-mono">{currentUser.email}</span>
                </div>
              </div>

              <div className="menu-divider" />

              <div className="menu-links">
                <button
                  id="profile-onboarding-link"
                  type="button"
                  className="menu-item-btn"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setOnboardingOpen(true);
                  }}
                >
                  <Sparkles size={15} className="text-primary" />
                  <span>Onboarding Wizard</span>
                </button>
                <button
                  id="profile-settings-link"
                  type="button"
                  className="menu-item-btn"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setWorkspaceSettingsOpen(true, 'general');
                  }}
                >
                  <Settings size={15} />
                  <span>Workspace Settings</span>
                </button>
                <button
                  id="profile-auth-switch-link"
                  type="button"
                  className="menu-item-btn"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenAuth();
                  }}
                >
                  <User size={15} />
                  <span>Switch / New Account</span>
                </button>
              </div>

              <div className="menu-divider" />

              <button
                id="profile-logout-btn"
                type="button"
                className="menu-item-btn logout-btn"
                onClick={() => {
                  logout();
                  setIsProfileMenuOpen(false);
                }}
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .app-topbar {
          height: var(--topbar-height);
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          position: sticky;
          top: 0;
          z-index: 90;
        }

        .topbar-left {
          display: flex;
          align-items: center;
        }

        .desktop-sidebar-toggle {
          margin-right: 8px;
          display: flex;
        }
        @media (max-width: 768px) {
          .desktop-sidebar-toggle {
            display: none;
          }
        }

        .breadcrumb-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .ws-indicator {
          font-size: 16px;
        }

        .breadcrumb-link {
          font-weight: 600;
          color: var(--text-primary);
          transition: color var(--transition-fast);
        }
        .breadcrumb-link:hover {
          color: var(--primary);
        }

        .breadcrumb-divider {
          color: var(--text-muted);
        }

        .breadcrumb-current {
          color: var(--primary);
          font-weight: 600;
        }

        /* Center Command trigger */
        .topbar-center {
          flex: 1;
          max-width: 480px;
          min-width: 160px;
          margin: 0 16px;
        }

        .search-palette-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 14px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          transition: all var(--transition-fast);
        }
        .search-palette-trigger:hover {
          background: var(--bg-elevated);
          border-color: var(--border-highlight);
          color: var(--text-secondary);
        }

        .search-text {
          flex: 1;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }

        .kbd-shortcut {
          display: flex;
          gap: 3px;
        }
        .kbd-shortcut kbd {
          padding: 2px 5px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 10px;
          color: var(--text-muted);
        }

        /* Right actions */
        .topbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .topbar-cta-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .topbar-tools-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .topbar-v-divider {
          width: 1px;
          height: 20px;
          background: var(--border-default);
          margin: 0 4px;
          opacity: 0.6;
          flex-shrink: 0;
        }

        .topbar-invite-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }

        .topbar-cta-btn {
          background: var(--primary) !important;
          color: var(--on-primary) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25), 0 0 14px var(--primary-glow) !important;
          border: 1px solid rgba(0, 0, 0, 0.15) !important;
          font-weight: 600 !important;
          letter-spacing: -0.01em;
          transition: all var(--transition-fast);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .topbar-cta-btn svg {
          color: var(--on-primary) !important;
          stroke: var(--on-primary) !important;
        }
        .topbar-cta-btn:hover {
          background: var(--primary-hover) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(62, 207, 142, 0.35) !important;
        }

        .topbar-cta-kbd {
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.28);
          font-size: 10px;
          font-weight: 700;
          color: inherit;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .icon-tool-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          position: relative;
        }
        .icon-tool-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .bell-badge {
          position: absolute;
          top: 3px;
          right: 3px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 8px;
          background: var(--danger);
          color: #ffffff;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notifications-anchor, .profile-anchor, .sound-anchor {
          position: relative;
        }

        .sound-settings-popover {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 290px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 14px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
          z-index: 1000;
          padding: 14px;
        }

        .sound-popover-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .sound-master-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .sound-info {
          display: flex;
          flex-direction: column;
        }

        .sound-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .sound-desc {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.3;
          margin-top: 2px;
        }

        .sound-switch-toggle {
          width: 38px;
          height: 22px;
          border-radius: 12px;
          background: var(--border-subtle);
          border: 1px solid var(--border-default);
          position: relative;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
          padding: 2px;
        }
        .sound-switch-toggle.active {
          background: var(--primary);
          border-color: var(--primary);
        }

        .switch-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform var(--transition-fast);
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .sound-switch-toggle.active .switch-thumb {
          transform: translateX(16px);
        }

        .sound-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 12px 0;
        }

        .sound-test-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sound-section-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sound-test-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        .sound-test-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          border-radius: 8px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .sound-test-chip:hover {
          background: var(--bg-hover);
          border-color: var(--primary);
          transform: translateY(-1px);
        }
        .sound-test-chip:active {
          transform: scale(0.97);
        }

        .sound-urgent-chip:hover {
          border-color: #ef4444;
        }

        .sound-haptics-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 2px;
        }

        .haptics-indicator-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 6px var(--success);
        }

        .user-profile-btn {
          position: relative;
          padding: 2px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--transition-fast);
        }
        .user-profile-btn:hover {
          transform: scale(1.04);
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(62, 207, 142, 0.5);
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
          background-color: var(--bg-surface);
          transition: all var(--transition-fast);
        }
        .user-profile-btn:hover .user-avatar {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(62, 207, 142, 0.35), 0 0 12px rgba(62, 207, 142, 0.3);
        }

        .online-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--success);
          border: 2px solid var(--bg-surface);
          position: absolute;
          bottom: 2px;
          right: 2px;
        }

        .profile-dropdown-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 260px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 14px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
          z-index: 1000;
          padding: 12px;
        }

        .profile-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px;
        }

        .dropdown-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          object-fit: cover;
        }

        .profile-meta {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .profile-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .profile-role {
          font-size: 11px;
          color: var(--primary-light);
        }

        .profile-email {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .menu-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 10px 0;
        }

        .menu-links {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .menu-item-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          text-align: left;
        }
        .menu-item-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .logout-btn:hover {
          color: var(--danger);
          background: var(--danger-bg);
        }

        .mobile-only-tool {
          display: none;
        }

        @media (max-width: 768px) {
          .mobile-only-tool {
            display: inline-flex !important;
          }
          .desktop-only-tool {
            display: none !important;
          }
          .topbar-invite-btn {
            display: none !important;
          }
          .topbar-v-divider {
            display: none !important;
          }
          .topbar-cta-btn {
            padding: 6px 10px !important;
            font-size: 11px !important;
          }
          .breadcrumb-pill {
            max-width: 190px;
          }
        }
      `}</style>
    </header>
  );
};
