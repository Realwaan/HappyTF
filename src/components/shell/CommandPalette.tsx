'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  LayoutGrid, 
  FolderPlus, 
  UserPlus, 
  Settings, 
  Sun, 
  Moon, 
  Sparkles, 
  Check, 
  ArrowRight,
  Hash,
  X
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { 
    isCommandPaletteOpen, 
    setCommandPaletteOpen, 
    workspaces, 
    currentWorkspace, 
    switchWorkspace, 
    recentBoards, 
    setCreateWorkspaceOpen, 
    setWorkspaceSettingsOpen, 
    setOnboardingOpen,
    toggleTheme, 
    theme,
    createBoard,
    navigateToBoard
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  // Build command items
  const boardCommands = recentBoards.map((b) => ({
    id: `board-${b.id}`,
    category: 'Boards',
    title: b.name,
    subtitle: `${b.item_count} items · updated ${b.updated_at}`,
    icon: <span style={{ fontSize: 16 }}>{b.icon_emoji}</span>,
    action: () => {
      navigateToBoard(b.id);
      setCommandPaletteOpen(false);
    },
  }));

  const workspaceCommands = workspaces.map((w) => ({
    id: `ws-${w.id}`,
    category: 'Switch Workspace',
    title: w.name,
    subtitle: `${w.member_count || 1} team members`,
    icon: <span style={{ fontSize: 16 }}>{w.icon_emoji}</span>,
    action: () => {
      switchWorkspace(w.id);
      setCommandPaletteOpen(false);
    },
  }));

  const actionCommands = [
    {
      id: 'action-create-board',
      category: 'Actions',
      title: 'Create New Board',
      subtitle: 'Add a new project or sprint tracker to this workspace',
      icon: <LayoutGrid size={16} className="text-primary" />,
      action: () => {
        const title = prompt('Enter new board name:');
        if (title?.trim()) {
          createBoard(title.trim(), '🎯', 'Created via Command Palette');
        }
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-invite-team',
      category: 'Actions',
      title: 'Invite Teammate',
      subtitle: 'Add colleagues to collaborate in this workspace',
      icon: <UserPlus size={16} style={{ color: '#10b981' }} />,
      action: () => {
        setCommandPaletteOpen(false);
        setWorkspaceSettingsOpen(true, 'members');
      },
    },
    {
      id: 'action-new-ws',
      category: 'Actions',
      title: 'Create Workspace',
      subtitle: 'Create a new independent organizational workspace',
      icon: <FolderPlus size={16} style={{ color: '#ec4899' }} />,
      action: () => {
        setCommandPaletteOpen(false);
        setCreateWorkspaceOpen(true);
      },
    },
    {
      id: 'action-ws-settings',
      category: 'Actions',
      title: 'Workspace Settings',
      subtitle: 'Manage members, permissions, and danger zone',
      icon: <Settings size={16} style={{ color: '#64748b' }} />,
      action: () => {
        setCommandPaletteOpen(false);
        setWorkspaceSettingsOpen(true, 'general');
      },
    },
    {
      id: 'action-onboarding',
      category: 'Actions',
      title: 'Run Onboarding Wizard',
      subtitle: 'Re-run the 3-step setup walkthrough',
      icon: <Sparkles size={16} style={{ color: '#a855f7' }} />,
      action: () => {
        setCommandPaletteOpen(false);
        setOnboardingOpen(true);
      },
    },
    {
      id: 'action-toggle-theme',
      category: 'Preferences',
      title: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: 'Toggle theme appearance',
      icon: theme === 'dark' ? <Sun size={16} style={{ color: '#f59e0b' }} /> : <Moon size={16} style={{ color: '#6366f1' }} />,
      action: () => {
        toggleTheme();
        setCommandPaletteOpen(false);
      },
    },
  ];

  const allItems = [...boardCommands, ...actionCommands, ...workspaceCommands];
  const filtered = allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <div 
      className="palette-overlay" 
      id="command-palette-overlay"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div 
        className="palette-modal glass-panel animate-pop-in" 
        id="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="search-bar-row">
          <Search size={18} className="search-icon" />
          <input
            ref={inputRef}
            id="command-palette-input"
            type="text"
            className="palette-input"
            placeholder="Type a command, board, or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="kbd-badge">ESC</span>
        </div>

        <div className="results-container" id="palette-results-list">
          {filtered.length === 0 ? (
            <div className="empty-results">
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                className={`result-item ${selectedIndex === idx ? 'selected' : ''}`}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                id={`palette-item-${item.id}`}
              >
                <div className="item-icon-box">{item.icon}</div>
                <div className="item-text">
                  <div className="title-row">
                    <span className="item-title">{item.title}</span>
                    <span className="category-pill">{item.category}</span>
                  </div>
                  <span className="item-sub">{item.subtitle}</span>
                </div>
                {selectedIndex === idx && (
                  <ArrowRight size={14} className="enter-arrow" />
                )}
              </div>
            ))
          )}
        </div>

        <div className="palette-footer">
          <div className="footer-keys">
            <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>esc</kbd> close</span>
          </div>
          <span className="active-ws-hint">
            Active: <strong>{currentWorkspace?.name}</strong>
          </span>
        </div>
      </div>

      <style jsx>{`
        .palette-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 12, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 14vh;
          z-index: 9999;
        }

        .palette-modal {
          width: 100%;
          max-width: 600px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 18px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75);
          overflow: hidden;
        }

        .search-bar-row {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-subtle);
          gap: 12px;
          background: var(--bg-subtle);
        }

        :global(.search-icon) {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .palette-input {
          flex: 1;
          background: transparent;
          border: none;
          font-size: 16px;
          color: var(--text-primary);
          outline: none;
        }
        .palette-input::placeholder {
          color: var(--text-muted);
        }

        .kbd-badge {
          font-size: 11px;
          padding: 2px 6px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .results-container {
          max-height: 380px;
          overflow-y: auto;
          padding: 8px;
        }

        .result-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .result-item.selected {
          background: var(--bg-elevated);
          box-shadow: 0 0 0 1px var(--border-highlight);
        }

        .item-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: var(--bg-subtle);
          flex-shrink: 0;
        }

        .item-text {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .item-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .category-pill {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-muted);
        }

        .item-sub {
          font-size: 11px;
          color: var(--text-secondary);
        }

        :global(.enter-arrow) {
          color: var(--primary-light);
        }

        .empty-results {
          padding: 32px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }

        .palette-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 18px;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-subtle);
          font-size: 11px;
          color: var(--text-muted);
        }

        .footer-keys {
          display: flex;
          gap: 12px;
        }

        kbd {
          padding: 1px 5px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 3px;
          font-family: var(--font-mono);
        }

        .active-ws-hint strong {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};
