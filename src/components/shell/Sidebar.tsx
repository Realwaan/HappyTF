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
  FolderPlus,
  Keyboard,
  Folder,
  FolderOpen
} from 'lucide-react';
import { IconBadge } from '../common/IconBadge';

export const Sidebar: React.FC = () => {
  const { 
    workspaces, 
    currentWorkspace, 
    switchWorkspace, 
    recentBoards, 
    folders,
    createFolder,
    toggleFolderCollapse,
    deleteFolder,
    isSidebarCollapsed, 
    isMobileSidebarOpen,
    setMobileSidebarOpen,
    toggleSidebar, 
    setCreateWorkspaceOpen, 
    setWorkspaceSettingsOpen,
    setOnboardingOpen,
    setCreateBoardOpen,
    activeView,
    activeBoardId,
    navigateToBoard,
    navigateToHome,
    setShortcutsModalOpen,
    boardViewMode,
    setBoardViewMode,
  } = useApp();

  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsWsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <>
      {isMobileSidebarOpen && (
        <div 
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside 
        className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileSidebarOpen ? 'mobile-open' : ''}`}
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
              backgroundColor: currentWorkspace?.brand_color ? `${currentWorkspace.brand_color}18` : 'rgba(62, 207, 142, 0.15)',
              borderColor: currentWorkspace?.brand_color ? `${currentWorkspace.brand_color}40` : 'var(--border-subtle)'
            }}
          >
            <IconBadge 
              nameOrEmoji={currentWorkspace?.icon_emoji || 'zap'} 
              size={15} 
              color={currentWorkspace?.brand_color || 'var(--primary)'} 
            />
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
                  <div className="ws-item-icon-wrap" style={{ color: ws.brand_color || 'var(--primary)' }}>
                    <IconBadge nameOrEmoji={ws.icon_emoji} size={15} color={ws.brand_color} />
                  </div>
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
        {/* Core Workspace Views */}
        <div className="nav-top-section">
          <button
            type="button"
            onClick={navigateToHome}
            className={`nav-link ${activeView === 'home' ? 'active' : ''}`}
            id="nav-home-link"
            title="Home & My Work"
          >
            <Home size={18} />
            {!isSidebarCollapsed && <span>My Work</span>}
          </button>

          <button
            type="button"
            id="nav-dashboards-link"
            className={`nav-link ${activeView === 'board' && boardViewMode === 'dashboard' ? 'active' : ''}`}
            title="Dashboards & Sprint Analytics"
            onClick={() => {
              if (activeBoardId) {
                navigateToBoard(activeBoardId);
                setBoardViewMode('dashboard');
              } else if (recentBoards.length > 0) {
                navigateToBoard(recentBoards[0].id);
                setBoardViewMode('dashboard');
              }
            }}
          >
            <PieChart size={18} />
            {!isSidebarCollapsed && (
              <div className="nav-label-with-badge">
                <span>Dashboards</span>
                <span className="feature-pill font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Live</span>
              </div>
            )}
          </button>

          <button
            type="button"
            id="nav-templates-link"
            className="nav-link"
            title="Board Templates"
            onClick={() => setCreateBoardOpen(true)}
          >
            <Layers size={18} />
            {!isSidebarCollapsed && (
              <div className="nav-label-with-badge">
                <span>Templates</span>
                <span className="count-badge font-mono">5</span>
              </div>
            )}
          </button>
        </div>

        {/* Structural Hierarchy: Folders & Boards Section */}
        <div className="nav-group">
          {!isSidebarCollapsed ? (
            <div className="nav-group-header">
              <span className="group-title">WORKSPACES & FOLDERS</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  className="icon-action-btn"
                  onClick={() => setIsCreatingFolder(true)}
                  title="New Folder"
                >
                  <FolderPlus size={14} />
                </button>
                <button
                  id="sidebar-add-board-btn"
                  type="button"
                  className="icon-action-btn"
                  onClick={() => setCreateBoardOpen(true)}
                  title="Add Board"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="nav-group-divider" />
          )}

          {isCreatingFolder && !isSidebarCollapsed && (
            <div style={{ padding: '6px 8px', marginBottom: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Folder size={13} style={{ color: '#3ecf8e', flexShrink: 0 }} />
              <input
                type="text"
                autoFocus
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    createFolder(newFolderName.trim());
                    setNewFolderName('');
                    setIsCreatingFolder(false);
                  } else if (e.key === 'Escape') {
                    setIsCreatingFolder(false);
                  }
                }}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '11px', width: '100%' }}
              />
            </div>
          )}

          <div className="boards-list">
            {/* 1. Folders with nested boards */}
            {folders.map((f) => {
              const folderBoards = recentBoards.filter((b) => b.folder_id === f.id);
              return (
                <div key={f.id} className="sidebar-folder-node" style={{ marginBottom: '4px' }}>
                  <div
                    className="folder-tree-header"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      transition: 'background 0.15s ease',
                    }}
                    title={f.name}
                    onClick={() => toggleFolderCollapse(f.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {f.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </span>
                      <span style={{ color: f.color || '#3ecf8e' }}>
                        {f.collapsed ? <Folder size={13} /> : <FolderOpen size={13} />}
                      </span>
                      {!isSidebarCollapsed && (
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.name}
                        </span>
                      )}
                    </div>
                    {!isSidebarCollapsed && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
                        {folderBoards.length}
                      </span>
                    )}
                  </div>

                  {!f.collapsed && (
                    <div style={{ paddingLeft: isSidebarCollapsed ? '0' : '14px', borderLeft: isSidebarCollapsed ? 'none' : '1px solid rgba(255,255,255,0.08)', marginLeft: isSidebarCollapsed ? '0' : '12px', marginTop: '2px' }}>
                      {folderBoards.map((b) => (
                        <button
                          key={b.id}
                          id={`sidebar-board-${b.id}`}
                          type="button"
                          className={`board-nav-item ${activeBoardId === b.id && activeView === 'board' ? 'active' : ''}`}
                          title={b.name}
                          onClick={() => navigateToBoard(b.id)}
                          style={{ margin: '1px 0' }}
                        >
                          <span className="board-icon-wrap">
                            <IconBadge nameOrEmoji={b.icon_emoji} size={13} />
                          </span>
                          {!isSidebarCollapsed && (
                            <span className="board-name">{b.name}</span>
                          )}
                        </button>
                      ))}
                      {folderBoards.length === 0 && !isSidebarCollapsed && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 6px', fontStyle: 'italic' }}>
                          No boards in folder
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. Direct Boards (outside folders) */}
            {recentBoards.filter((b) => !b.folder_id).map((b) => (
              <button
                key={b.id}
                id={`sidebar-board-${b.id}`}
                type="button"
                className={`board-nav-item ${activeBoardId === b.id && activeView === 'board' ? 'active' : ''}`}
                title={b.name}
                onClick={() => navigateToBoard(b.id)}
              >
                <span className="board-icon-wrap">
                  <IconBadge nameOrEmoji={b.icon_emoji} size={14} />
                </span>
                {!isSidebarCollapsed && (
                  <span className="board-name">{b.name}</span>
                )}
              </button>
            ))}

            {recentBoards.length === 0 && folders.length === 0 && !isSidebarCollapsed && (
              <div style={{ padding: '12px 8px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>No boards in workspace</p>
                <button
                  type="button"
                  onClick={() => setCreateBoardOpen(true)}
                  style={{
                    fontSize: '11px',
                    color: 'var(--primary)',
                    background: 'rgba(62, 207, 142, 0.08)',
                    border: '1px solid rgba(62, 207, 142, 0.2)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={12} />
                  <span>Create Board</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 3. Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="footer-left">
          <button
            id="sidebar-onboarding-tour-btn"
            type="button"
            className="footer-btn"
            onClick={() => setOnboardingOpen(true)}
            title="Setup Wizard"
          >
            <Sparkles size={16} className="text-primary" />
            {!isSidebarCollapsed && <span>Setup Wizard</span>}
          </button>

          <button
            id="sidebar-shortcuts-btn"
            type="button"
            className="footer-btn"
            onClick={() => setShortcutsModalOpen(true)}
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard size={15} className="text-secondary" />
            {!isSidebarCollapsed && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>?</span>}
          </button>
        </div>

        <button
          id="sidebar-collapse-toggle-btn"
          type="button"
          className="collapse-btn"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expand Sidebar ([)' : 'Collapse Sidebar ([)'}
          aria-label="Toggle sidebar collapse"
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Sub-footer Legal & Cookie Links */}
      {!isSidebarCollapsed && (
        <div className="sidebar-legal-bar">
          <a href="/privacy" className="legal-link-mini" title="Privacy Policy">Privacy</a>
          <span className="dot-sep">·</span>
          <a href="/terms" className="legal-link-mini" title="Terms of Service">Terms</a>
          <span className="dot-sep">·</span>
          <button
            type="button"
            className="legal-btn-mini"
            onClick={() => window.dispatchEvent(new CustomEvent('happytf:open_cookie_preferences'))}
            title="Manage Cookie Preferences"
          >
            Cookies
          </button>
        </div>
      )}

      <style jsx>{`
        .app-sidebar {
          width: var(--sidebar-width);
          min-width: var(--sidebar-width);
          background: var(--bg-subtle);
          border-right: 1px solid var(--border-subtle);
          height: 100%;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: width var(--transition-normal), min-width var(--transition-normal);
          position: relative;
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
          flex-shrink: 0;
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
          flex-shrink: 0;
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
          min-height: 0;
          padding: 12px 10px;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-top-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-link {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
          text-align: left;
        }
        .nav-link:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .nav-link.active {
          background: var(--bg-elevated);
          color: var(--primary-light);
          font-weight: 600;
          border-left: 3px solid var(--primary);
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
          margin-bottom: 8px;
        }

        .nav-group-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 8px 6px;
        }

        .nav-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 10px;
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
          padding: 3px;
          border-radius: 4px;
          transition: all var(--transition-fast);
          display: inline-flex;
          align-items: center;
          justify-content: center;
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
          transition: all var(--transition-fast);
          text-align: left;
          width: 100%;
        }
        .board-nav-item:hover {
          background: var(--bg-hover);
        }
        .board-nav-item.active {
          background: var(--bg-elevated);
          color: var(--primary-light);
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .board-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: color var(--transition-fast);
          flex-shrink: 0;
        }
        .board-nav-item:hover .board-icon-wrap {
          color: var(--text-primary);
        }
        .board-nav-item.active .board-icon-wrap {
          color: var(--primary-light);
        }

        .ws-item-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .board-name {
          font-size: 13px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .board-nav-item.active .board-name {
          color: var(--text-primary);
        }

        /* Footer */
        .sidebar-footer {
          padding: 12px 14px;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-shrink: 0;
          background: var(--bg-subtle);
        }

        .footer-left {
          display: flex;
          align-items: center;
          gap: 4px;
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
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .collapse-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .sidebar-legal-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 14px;
          font-size: 11px;
          color: var(--text-muted);
          background: var(--bg-canvas);
          border-top: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .legal-link-mini {
          color: var(--text-muted);
          text-decoration: none;
          transition: color var(--transition-fast);
        }
        .legal-link-mini:hover {
          color: var(--text-primary);
          text-decoration: underline;
        }

        .legal-btn-mini {
          background: transparent;
          border: none;
          padding: 0;
          font-size: 11px;
          color: var(--text-muted);
          cursor: pointer;
          transition: color var(--transition-fast);
        }
        .legal-btn-mini:hover {
          color: var(--text-primary);
          text-decoration: underline;
        }

        .dot-sep {
          color: var(--border-default);
        }

        /* Collapsed Sidebar Rules */
        .app-sidebar.collapsed .ws-switcher-container {
          padding: 12px 8px;
          display: flex;
          justify-content: center;
        }
        .app-sidebar.collapsed .ws-switcher-btn {
          justify-content: center;
          padding: 4px 0;
        }
        .app-sidebar.collapsed .ws-dropdown-menu {
          left: calc(100% + 8px);
          top: 8px;
          width: 250px;
        }
        .app-sidebar.collapsed .sidebar-nav {
          padding: 12px 6px;
        }
        .app-sidebar.collapsed .nav-link {
          justify-content: center;
          padding: 9px 0;
        }
        .app-sidebar.collapsed .board-nav-item {
          justify-content: center;
          padding: 7px 0;
        }
        .app-sidebar.collapsed .folder-tree-header {
          justify-content: center;
          padding: 6px 0;
        }
        .app-sidebar.collapsed .sidebar-footer {
          flex-direction: column;
          padding: 10px 6px;
          gap: 6px;
        }
        .app-sidebar.collapsed .footer-left {
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }
        .app-sidebar.collapsed .footer-btn {
          justify-content: center;
          padding: 6px 0;
          width: 100%;
        }
        .app-sidebar.collapsed .collapse-btn {
          width: 100%;
          justify-content: center;
        }
      `}</style>
    </aside>
    </>
  );
};
