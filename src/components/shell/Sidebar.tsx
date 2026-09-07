'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Home, 
  LayoutGrid, 
  PieChart, 
  Layers, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings, 
  Sparkles, 
  Check, 
  Hash, 
  FolderPlus,
  HelpCircle
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    workspaces, 
    currentWorkspace, 
    switchWorkspace, 
    recentBoards, 
    isSidebarCollapsed, 
    toggleSidebar, 
    setCreateWorkspaceOpen, 
    setWorkspaceSettingsOpen,
    setOnboardingOpen,
    createBoard
  } = useApp();

  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsWsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCreateBoardPrompt = () => {
    const name = prompt('Name your new board:');
    if (name?.trim()) {
      createBoard(name.trim(), '📋', 'Workspace tracking board');
    }
  };

  return (
    <aside 
      className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
      id="app-sidebar"
    >
      {/* 1. Workspace Switcher Header */}
      <div className="ws-switcher-container" ref={dropdownRef}>
        <button
          id="ws-switcher-trigger"
          type="button"
          className="ws-switcher-btn"
          onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
          title={currentWorkspace?.name}
        >
          <div 
            className="ws-icon-badge" 
            style={{ 
              backgroundColor: currentWorkspace?.brand_color ? `${currentWorkspace.brand_color}25` : 'rgba(99, 102, 241, 0.2)',
              borderColor: currentWorkspace?.brand_color || 'var(--primary)'
            }}
          >
            <span>{currentWorkspace?.icon_emoji || '⚡'}</span>
          </div>
          {!isSidebarCollapsed && (
            <div className="ws-text-col">
              <span className="ws-name">{currentWorkspace?.name || 'HappyTF Workspace'}</span>
              <span className="ws-badge-role">Free Tier · 5 seats</span>
            </div>
          )}
          {!isSidebarCollapsed && (
            <ChevronDown size={14} className={`chevron-icon ${isWsDropdownOpen ? 'rotate' : ''}`} />
          )}
        </button>

        {/* Workspace Dropdown */}
        {isWsDropdownOpen && (
          <div className="ws-dropdown-menu glass-panel animate-pop-in" id="ws-dropdown-menu">
            <div className="dropdown-header">
              <span className="text-xs text-muted">Your Workspaces</span>
            </div>
            <div className="ws-list">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  id={`switch-ws-btn-${ws.id}`}
                  type="button"
                  className={`ws-item-btn ${ws.id === currentWorkspace?.id ? 'active' : ''}`}
                  onClick={() => {
                    switchWorkspace(ws.id);
                    setIsWsDropdownOpen(false);
                  }}
                >
                  <span className="ws-item-emoji">{ws.icon_emoji}</span>
                  <div className="ws-item-info">
                    <span className="ws-item-name">{ws.name}</span>
                    <span className="text-xs text-muted">{ws.member_count || 1} members</span>
                  </div>
                  {ws.id === currentWorkspace?.id && <Check size={14} className="text-primary" />}
                </button>
              ))}
            </div>

            <div className="dropdown-actions">
              <button
                id="sidebar-create-ws-btn"
                type="button"
                className="dropdown-action-btn"
                onClick={() => {
                  setIsWsDropdownOpen(false);
                  setCreateWorkspaceOpen(true);
                }}
              >
                <FolderPlus size={15} />
                <span>Create New Workspace</span>
              </button>
              <button
                id="sidebar-ws-settings-btn"
                type="button"
                className="dropdown-action-btn"
                onClick={() => {
                  setIsWsDropdownOpen(false);
                  setWorkspaceSettingsOpen(true);
                }}
              >
                <Settings size={15} />
                <span>Workspace Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Navigation Links */}
      <nav className="sidebar-nav" id="sidebar-main-nav">
        <a 
          href="#home" 
          className="nav-link active" 
          id="nav-home-link"
          title="Home & My Work"
        >
          <Home size={18} />
          {!isSidebarCollapsed && <span>My Work</span>}
        </a>

        {/* Boards Section */}
        <div className="nav-group">
          {!isSidebarCollapsed && (
            <div className="nav-group-header">
              <span className="group-title">BOARDS</span>
              <button
                id="sidebar-add-board-btn"
                type="button"
                className="icon-action-btn"
                onClick={handleCreateBoardPrompt}
                title="Add Board"
              >
                <Plus size={14} />
              </button>
            </div>
          )}

          <div className="boards-list">
            {recentBoards.map((b) => (
              <button
                key={b.id}
                id={`sidebar-board-${b.id}`}
                type="button"
                className="board-nav-item"
                title={b.name}
                onClick={() => alert(`Navigating to ${b.name}`)}
              >
                <span className="board-emoji">{b.icon_emoji}</span>
                {!isSidebarCollapsed && (
                  <span className="board-name">{b.name}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboards & Templates Navigation */}
        <a 
          href="#dashboards" 
          className="nav-link" 
          id="nav-dashboards-link"
          title="Dashboards"
        >
          <PieChart size={18} />
          {!isSidebarCollapsed && (
            <div className="nav-label-with-badge">
              <span>Dashboards</span>
              <span className="feature-pill">Month 8</span>
            </div>
          )}
        </a>

        <a 
          href="#templates" 
          className="nav-link" 
          id="nav-templates-link"
          title="Templates"
        >
          <Layers size={18} />
          {!isSidebarCollapsed && (
            <div className="nav-label-with-badge">
              <span>Templates</span>
              <span className="count-badge">10</span>
            </div>
          )}
        </a>
      </nav>

      {/* 3. Sidebar Footer & Collapse Toggle */}
      <div className="sidebar-footer">
        <button
          id="sidebar-onboarding-tour-btn"
          type="button"
          className="footer-btn"
          onClick={() => setOnboardingOpen(true)}
          title="Restart Onboarding Wizard"
        >
          <Sparkles size={16} className="text-primary" />
          {!isSidebarCollapsed && <span>Setup Wizard</span>}
        </button>

        <button
          id="sidebar-collapse-toggle-btn"
          type="button"
          className="collapse-btn"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle sidebar collapse"
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <style jsx>{`
        .app-sidebar {
          width: var(--sidebar-width);
          min-width: var(--sidebar-width);
          background: var(--bg-subtle);
          border-right: 1px solid var(--border-subtle);
          height: 100vh;
          display: flex;
          flex-direction: column;
          transition: width var(--transition-normal), min-width var(--transition-normal);
          position: sticky;
          top: 0;
          z-index: 100;
          user-select: none;
        }

        .app-sidebar.collapsed {
          width: var(--sidebar-collapsed-width);
          min-width: var(--sidebar-collapsed-width);
        }

        /* Workspace Switcher */
        .ws-switcher-container {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border-subtle);
          position: relative;
        }

        .ws-switcher-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 8px;
          border-radius: 10px;
          transition: background var(--transition-fast);
          text-align: left;
        }
        .ws-switcher-btn:hover {
          background: var(--bg-hover);
        }

        .ws-icon-badge {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border: 1px solid transparent;
          flex-shrink: 0;
        }

        .ws-text-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .ws-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ws-badge-role {
          font-size: 11px;
          color: var(--text-muted);
        }

        :global(.chevron-icon) {
          color: var(--text-muted);
          transition: transform var(--transition-fast);
        }
        :global(.chevron-icon.rotate) {
          transform: rotate(180deg);
        }

        /* Dropdown menu */
        .ws-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 14px;
          width: 250px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 14px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
          z-index: 1000;
          overflow: hidden;
        }

        .dropdown-header {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .ws-list {
          max-height: 200px;
          overflow-y: auto;
          padding: 6px;
        }

        .ws-item-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          transition: background var(--transition-fast);
          text-align: left;
        }
        .ws-item-btn:hover {
          background: var(--bg-hover);
        }
        .ws-item-btn.active {
          background: var(--bg-elevated);
        }

        .ws-item-emoji {
          font-size: 18px;
        }

        .ws-item-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .ws-item-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .dropdown-actions {
          padding: 6px;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-subtle);
        }

        .dropdown-action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .dropdown-action-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        /* Navigation */
        .sidebar-nav {
          flex: 1;
          padding: 14px 10px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .nav-link:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .nav-link.active {
          background: var(--bg-elevated);
          color: var(--primary-light);
          font-weight: 600;
        }

        .nav-label-with-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .feature-pill {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
        }

        .count-badge {
          font-size: 11px;
          padding: 1px 6px;
          border-radius: 10px;
          background: var(--bg-elevated);
          color: var(--text-muted);
        }

        /* Groups & Boards */
        .nav-group {
          margin-top: 14px;
          margin-bottom: 10px;
        }

        .nav-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 12px;
          margin-bottom: 4px;
        }

        .group-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.06em;
        }

        .icon-action-btn {
          color: var(--text-muted);
          padding: 2px;
          border-radius: 4px;
          transition: all var(--transition-fast);
        }
        .icon-action-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .boards-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .board-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 12px;
          border-radius: 8px;
          transition: background var(--transition-fast);
          text-align: left;
        }
        .board-nav-item:hover {
          background: var(--bg-hover);
        }

        .board-emoji {
          font-size: 15px;
        }

        .board-name {
          font-size: 13px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Footer */
        .sidebar-footer {
          padding: 14px;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-shrink: 0;
          background: var(--bg-subtle);
        }

        .footer-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          padding: 6px 10px;
          border-radius: 8px;
          transition: all var(--transition-fast);
        }
        .footer-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .collapse-btn {
          color: var(--text-muted);
          padding: 6px;
          border-radius: 8px;
          transition: all var(--transition-fast);
        }
        .collapse-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
      `}</style>
    </aside>
  );
};
