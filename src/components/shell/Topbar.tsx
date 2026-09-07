'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { NotificationsPopover } from './NotificationsPopover';
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  UserPlus, 
  ChevronDown, 
  User, 
  Settings, 
  Sparkles, 
  LogOut, 
  LogIn 
} from 'lucide-react';

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
    setOnboardingOpen,
    logout
  } = useApp();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="app-topbar glass-panel" id="app-topbar">
      {/* 1. Left section: Current Context */}
      <div className="topbar-left">
        <div className="breadcrumb-pill">
          <span className="ws-indicator">{currentWorkspace?.icon_emoji || '⚡'}</span>
          <span className="breadcrumb-name">{currentWorkspace?.name || 'Workspace'}</span>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb-current">My Work</span>
        </div>
      </div>

      {/* 2. Center: ⌘K Global Command Search */}
      <div className="topbar-center">
        <button
          id="topbar-search-trigger"
          type="button"
          className="search-palette-trigger"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search or run command"
        >
          <Search size={15} className="search-icon" />
          <span className="search-text">Search boards, items, or jump to...</span>
          <span className="kbd-shortcut">
            <kbd>⌘</kbd>
            <kbd>K</kbd>
          </span>
        </button>
      </div>

      {/* 3. Right: Actions & User Menu */}
      <div className="topbar-right">
        {/* Quick Invite Button */}
        <button
          id="topbar-invite-btn"
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setWorkspaceSettingsOpen(true, 'members')}
        >
          <UserPlus size={14} className="text-primary" />
          <span>Invite</span>
        </button>

        {/* Theme Toggle */}
        <button
          id="topbar-theme-toggle"
          type="button"
          className="icon-tool-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={17} style={{ color: '#f59e0b' }} /> : <Moon size={17} style={{ color: '#6366f1' }} />}
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
            <Bell size={17} />
            {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
          </button>

          <NotificationsPopover
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
          />
        </div>

        {/* User Profile Avatar & Menu */}
        <div className="profile-anchor" ref={profileMenuRef}>
          {currentUser ? (
            <button
              id="topbar-profile-btn"
              type="button"
              className="user-profile-btn"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <img
                src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
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
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name}
                  className="dropdown-avatar"
                />
                <div className="profile-meta">
                  <span className="profile-name">{currentUser.full_name}</span>
                  <span className="profile-role">{currentUser.job_role || 'Workspace Member'}</span>
                  <span className="profile-email text-xs text-muted">{currentUser.email}</span>
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

        .breadcrumb-name {
          font-weight: 600;
          color: var(--text-primary);
        }

        .breadcrumb-divider {
          color: var(--text-muted);
        }

        .breadcrumb-current {
          color: var(--primary-light);
          font-weight: 500;
        }

        /* Center Command trigger */
        .topbar-center {
          flex: 1;
          max-width: 480px;
          margin: 0 20px;
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
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        /* Right actions */
        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .icon-tool-btn {
          width: 34px;
          height: 34px;
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
          top: 4px;
          right: 4px;
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

        .notifications-anchor, .profile-anchor {
          position: relative;
        }

        /* Profile avatar button */
        .user-profile-btn {
          position: relative;
          padding: 2px;
          border-radius: 50%;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--border-default);
          transition: border-color var(--transition-fast);
        }
        .user-profile-btn:hover .user-avatar {
          border-color: var(--primary);
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

        /* Profile dropdown */
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
      `}</style>
    </header>
  );
};
