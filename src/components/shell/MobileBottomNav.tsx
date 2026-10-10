'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Layers, 
  Kanban, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Sparkles, 
  BarChart3, 
  Zap, 
  Bot, 
  Settings, 
  Volume2, 
  VolumeX, 
  X,
  ChevronRight,
  Inbox
} from 'lucide-react';
import { playClickSound, isSoundEnabled, setSoundEnabled } from '../../lib/soundFx';

export const MobileBottomNav: React.FC = () => {
  const { 
    activeView, 
    activeBoard, 
    recentBoards, 
    navigateToHome, 
    navigateToBoard, 
    setQuickTaskOpen, 
    setCreateBoardOpen, 
    setCommandPaletteOpen,
    setAiCopilotOpen,
    setColumnarModalOpen,
    setAutomationModalOpen,
    setDiscordModalOpen,
    setWorkspaceSettingsOpen
  } = useApp();

  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [soundActive, setSoundActive] = useState(() => isSoundEnabled());

  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) playClickSound();
  };

  const handleQuickAdd = () => {
    playClickSound();
    if (activeView === 'board') {
      setQuickTaskOpen(true);
    } else {
      setCreateBoardOpen(true);
    }
  };

  const handleNavHome = () => {
    playClickSound();
    navigateToHome();
  };

  const handleNavBoard = () => {
    playClickSound();
    if (activeBoard) {
      navigateToBoard(activeBoard.id);
    } else if (recentBoards.length > 0) {
      navigateToBoard(recentBoards[0].id);
    } else {
      setCreateBoardOpen(true);
    }
  };

  const handleNavSearch = () => {
    playClickSound();
    setCommandPaletteOpen(true);
  };

  const handleToggleMore = () => {
    playClickSound();
    setIsMoreSheetOpen((prev) => !prev);
  };

  return (
    <>
      <nav 
        className="mobile-bottom-nav" 
        id="mobile-bottom-nav" 
        aria-label="Mobile Navigation"
      >
        {/* 1. Home / My Work */}
        <button
          id="mobile-nav-home-btn"
          type="button"
          className={`mobile-nav-item ${activeView === 'home' ? 'active' : ''}`}
          onClick={handleNavHome}
          aria-label="My Work"
        >
          <div className="nav-icon-wrapper">
            <Layers size={19} />
          </div>
          <span className="nav-label">My Work</span>
        </button>

        {/* 2. Board View */}
        <button
          id="mobile-nav-board-btn"
          type="button"
          className={`mobile-nav-item ${activeView === 'board' ? 'active' : ''}`}
          onClick={handleNavBoard}
          aria-label="Active Board"
        >
          <div className="nav-icon-wrapper">
            <Kanban size={19} />
          </div>
          <span className="nav-label truncate max-w-[64px]">
            {activeBoard ? activeBoard.name.split(' ')[0] : 'Board'}
          </span>
        </button>

        {/* 3. Center Floating Quick Add Action (FAB) */}
        <button
          id="mobile-nav-add-btn"
          type="button"
          className="mobile-fab-btn"
          onClick={handleQuickAdd}
          title={activeView === 'board' ? 'New Task' : 'New Board'}
          aria-label={activeView === 'board' ? 'Create new task' : 'Create new board'}
        >
          <Plus size={22} className="fab-icon" />
        </button>

        {/* 4. Search & Jump */}
        <button
          id="mobile-nav-search-btn"
          type="button"
          className="mobile-nav-item"
          onClick={handleNavSearch}
          aria-label="Search"
        >
          <div className="nav-icon-wrapper">
            <Search size={19} />
          </div>
          <span className="nav-label">Search</span>
        </button>

        {/* 5. More Actions Sheet */}
        <button
          id="mobile-nav-more-btn"
          type="button"
          className={`mobile-nav-item ${isMoreSheetOpen ? 'active' : ''}`}
          onClick={handleToggleMore}
          aria-label="More Features"
        >
          <div className="nav-icon-wrapper">
            <MoreHorizontal size={19} />
          </div>
          <span className="nav-label">More</span>
        </button>
      </nav>

      {/* Slide-up Bottom Action Sheet */}
      {isMoreSheetOpen && (
        <div 
          className="mobile-sheet-overlay animate-fade-in" 
          id="mobile-more-sheet-overlay"
          onClick={() => setIsMoreSheetOpen(false)}
        >
          <div 
            className="mobile-action-sheet animate-slide-in-up" 
            id="mobile-action-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="sheet-drag-handle" />

            <div className="sheet-header">
              <span className="sheet-title">Workspace Tools</span>
              <button 
                type="button" 
                className="sheet-close-btn"
                onClick={() => setIsMoreSheetOpen(false)}
                aria-label="Close sheet"
              >
                <X size={16} />
              </button>
            </div>

            <div className="sheet-grid">
              <button
                type="button"
                className="sheet-action-card"
                onClick={() => {
                  setIsMoreSheetOpen(false);
                  setAiCopilotOpen(true);
                }}
              >
                <div className="sheet-card-icon bg-emerald-500/15 text-emerald-400">
                  <Sparkles size={18} />
                </div>
                <div className="sheet-card-text">
                  <span className="card-name">AI Copilot</span>
                  <span className="card-desc">Sprint Spec & Stories</span>
                </div>
              </button>

              <button
                type="button"
                className="sheet-action-card"
                onClick={() => {
                  setIsMoreSheetOpen(false);
                  setColumnarModalOpen(true);
                }}
              >
                <div className="sheet-card-icon bg-indigo-500/15 text-indigo-400">
                  <BarChart3 size={18} />
                </div>
                <div className="sheet-card-text">
                  <span className="card-name">Analytics</span>
                  <span className="card-desc">WASM Columnar Metrics</span>
                </div>
              </button>

              <button
                type="button"
                className="sheet-action-card"
                onClick={() => {
                  setIsMoreSheetOpen(false);
                  setAutomationModalOpen(true);
                }}
              >
                <div className="sheet-card-icon bg-amber-500/15 text-amber-400">
                  <Zap size={18} />
                </div>
                <div className="sheet-card-text">
                  <span className="card-name">Automate</span>
                  <span className="card-desc">IFTTT Workflow Rules</span>
                </div>
              </button>

              <button
                type="button"
                className="sheet-action-card"
                onClick={() => {
                  setIsMoreSheetOpen(false);
                  setDiscordModalOpen(true);
                }}
              >
                <div className="sheet-card-icon bg-[#5865F2]/20 text-[#8ea1e1]">
                  <Bot size={18} />
                </div>
                <div className="sheet-card-text">
                  <span className="card-name">CapStoneFlow</span>
                  <span className="card-desc">Discord Bot Integration</span>
                </div>
              </button>
            </div>

            {/* Switch Boards Quick Row */}
            {recentBoards.length > 1 && (
              <div className="sheet-boards-section">
                <span className="section-label">Switch Board</span>
                <div className="boards-chip-list">
                  {recentBoards.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`board-chip ${b.id === activeBoard?.id ? 'active' : ''}`}
                      onClick={() => {
                        navigateToBoard(b.id);
                        setIsMoreSheetOpen(false);
                      }}
                    >
                      <Kanban size={13} className="text-primary-light" />
                      <span className="truncate max-w-[130px]">{b.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Row Utilities */}
            <div className="sheet-footer-row">
              <button
                type="button"
                className="sheet-util-btn"
                onClick={handleToggleSound}
              >
                {soundActive ? <Volume2 size={16} className="text-primary" /> : <VolumeX size={16} className="text-slate-400" />}
                <span>{soundActive ? 'Sound FX On' : 'Sound FX Muted'}</span>
              </button>

              <button
                type="button"
                className="sheet-util-btn"
                onClick={() => {
                  setIsMoreSheetOpen(false);
                  setWorkspaceSettingsOpen(true);
                }}
              >
                <Settings size={16} className="text-primary-light" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mobile-bottom-nav {
          display: none;
        }

        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex;
            align-items: center;
            justify-content: space-around;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: calc(62px + env(safe-area-inset-bottom, 0px));
            padding-bottom: env(safe-area-inset-bottom, 0px);
            background: rgba(13, 16, 26, 0.94);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.5);
            z-index: 1000;
          }

          .mobile-nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            height: 100%;
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            transition: all var(--transition-fast);
            padding: 4px 0;
          }

          .mobile-nav-item:hover,
          .mobile-nav-item.active {
            color: var(--primary);
          }

          .nav-icon-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 22px;
            transition: transform var(--transition-fast);
          }

          .mobile-nav-item:active .nav-icon-wrapper {
            transform: scale(0.9);
          }

          .nav-label {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: -0.01em;
          }

          .mobile-fab-btn {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: var(--primary);
            color: var(--on-primary);
            border: 3px solid rgba(13, 16, 26, 0.94);
            box-shadow: 0 4px 16px var(--primary-glow), 0 2px 6px rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transform: translateY(-12px);
            transition: transform var(--transition-fast), box-shadow var(--transition-fast);
            flex-shrink: 0;
          }

          .mobile-fab-btn:active {
            transform: translateY(-10px) scale(0.95);
          }

          .fab-icon {
            stroke-width: 2.5;
          }

          /* Action Sheet */
          .mobile-sheet-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            z-index: 2000;
            display: flex;
            align-items: flex-end;
          }

          .mobile-action-sheet {
            width: 100%;
            background: var(--bg-surface);
            border-top: 1px solid var(--border-default);
            border-radius: 20px 20px 0 0;
            padding: 12px 18px calc(24px + env(safe-area-inset-bottom, 0px));
            box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            gap: 16px;
            max-height: 80vh;
            overflow-y: auto;
          }

          .sheet-drag-handle {
            width: 38px;
            height: 4px;
            border-radius: 999px;
            background: var(--border-subtle);
            margin: 0 auto;
          }

          .sheet-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .sheet-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--text-primary);
          }

          .sheet-close-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            padding: 4px;
            border-radius: 6px;
            cursor: pointer;
          }

          .sheet-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .sheet-action-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            background: var(--bg-subtle);
            border: 1px solid var(--border-subtle);
            border-radius: 12px;
            cursor: pointer;
            text-align: left;
            transition: all var(--transition-fast);
          }

          .sheet-action-card:active {
            background: var(--bg-hover);
            transform: scale(0.98);
          }

          .sheet-card-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .sheet-card-text {
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .card-name {
            font-size: 13px;
            font-weight: 700;
            color: var(--text-primary);
          }

          .card-desc {
            font-size: 10px;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .sheet-boards-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-top: 4px;
            border-top: 1px solid var(--border-subtle);
          }

          .section-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .boards-chip-list {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 4px;
            -webkit-overflow-scrolling: touch;
          }

          .board-chip {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: var(--bg-subtle);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            font-size: 12px;
            color: var(--text-secondary);
            cursor: pointer;
            white-space: nowrap;
          }

          .board-chip.active {
            border-color: var(--primary);
            color: var(--primary);
            background: rgba(62, 207, 142, 0.1);
          }

          .sheet-footer-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding-top: 10px;
            border-top: 1px solid var(--border-subtle);
          }

          .sheet-util-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px;
            background: var(--bg-subtle);
            border: 1px solid var(--border-subtle);
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            cursor: pointer;
          }

          .sheet-util-btn:active {
            background: var(--bg-hover);
          }
        }
      `}</style>
    </>
  );
};
