'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Command, Keyboard } from 'lucide-react';

export const KeyboardShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useApp();

  if (!isShortcutsModalOpen) return null;

  const categories = [
    {
      name: 'Global Navigation',
      shortcuts: [
        { keys: ['⌘', 'K'], desc: 'Open Command Palette' },
        { keys: ['?'], desc: 'Open Keyboard Shortcuts Cheat Sheet' },
        { keys: ['['], desc: 'Toggle Sidebar Collapse' },
        { keys: ['Esc'], desc: 'Close open dialogs or detail panel' },
      ],
    },
    {
      name: 'Item Detail & Board Navigation',
      shortcuts: [
        { keys: ['S'], desc: 'Quick cycle status (Working on it → Review → Done)' },
        { keys: ['↑'], desc: 'Navigate to Previous Item in panel' },
        { keys: ['↓'], desc: 'Navigate to Next Item in panel' },
        { keys: ['Enter'], desc: 'Create new item inline / Submit update' },
        { keys: ['Tab'], desc: 'Jump to next input cell' },
      ],
    },
    {
      name: 'Creation & Quick Actions',
      shortcuts: [
        { keys: ['⌘', 'J'], desc: 'Open AI Sprint Copilot & Smart Spec Generator' },
        { keys: ['⌘', 'E'], desc: 'Open Data Portability, CSV Import & Audit Vault' },
        { keys: ['C'], desc: 'Quick create new issue / task' },
        { keys: ['B'], desc: 'Create new board modal' },
        { keys: ['M'], desc: 'Inspect Workspace Memory & Context (/profile, /areas, /people)' },
        { keys: ['⌘', '/'], desc: 'Toggle shortcut cheat sheet' },
        { keys: ['Click Row'], desc: 'Open 520px Item Detail Drawer' },
      ],
    },
  ];

  return (
    <div 
      className="modal-overlay" 
      id="shortcuts-modal-overlay" 
      onClick={() => setShortcutsModalOpen(false)}
    >
      <div 
        className="modal-card glass-panel animate-pop-in" 
        id="shortcuts-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={() => setShortcutsModalOpen(false)}
          id="close-shortcuts-btn"
        >
          <X size={18} />
        </button>

        <div className="modal-header">
          <div className="modal-badge">
            <Keyboard size={14} className="text-primary" />
            <span>Power User Ergonomics</span>
          </div>
          <h2>Keyboard Shortcuts</h2>
          <p className="modal-subtitle">Navigate, create, and manage your work without lifting your hands from the keys.</p>
        </div>

        <div className="shortcuts-grid">
          {categories.map((cat) => (
            <div key={cat.name} className="shortcut-category">
              <h4 className="cat-title">{cat.name}</h4>
              <div className="shortcut-list">
                {cat.shortcuts.map((s, idx) => (
                  <div key={idx} className="shortcut-row">
                    <span className="shortcut-desc">{s.desc}</span>
                    <div className="keys-row">
                      {s.keys.map((k) => (
                        <kbd key={k} className="kbd-chip">{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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

        .modal-card {
          width: 100%;
          max-width: 580px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 20px;
          padding: 32px;
          position: relative;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75);
        }

        .modal-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          color: var(--text-muted);
          padding: 6px;
          border-radius: 8px;
          transition: all var(--transition-fast);
        }
        .modal-close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .modal-header {
          margin-bottom: 24px;
        }

        .modal-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 9999px;
          background: var(--primary-glow);
          color: var(--primary-light);
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .modal-header h2 {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .modal-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .shortcuts-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .cat-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 10px;
        }

        .shortcut-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--bg-subtle);
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
        }

        .shortcut-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }

        .shortcut-desc {
          color: var(--text-secondary);
        }

        .keys-row {
          display: flex;
          gap: 4px;
        }

        .kbd-chip {
          padding: 3px 7px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          color: var(--text-primary);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
};
