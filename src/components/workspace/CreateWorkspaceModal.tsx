'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Layers, Check, ArrowRight } from 'lucide-react';
import { AVAILABLE_ICONS, IconBadge } from '../common/IconBadge';
import { isDeployed } from '@/lib/environment';

export const CreateWorkspaceModal: React.FC = () => {
  const { isCreateWorkspaceOpen, setCreateWorkspaceOpen, createWorkspace } = useApp();
  const [name, setName] = useState('');
  const [iconEmoji, setIconEmoji] = useState('briefcase');
  const [brandColor, setBrandColor] = useState('#3ecf8e');

  if (!isCreateWorkspaceOpen) return null;

  const colors = ['#3ecf8e', '#24b47e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createWorkspace(name.trim(), iconEmoji, brandColor);
    setName('');
    setCreateWorkspaceOpen(false);
  };

  return (
    <div className="modal-overlay" id="create-workspace-overlay">
      <div className="modal-card glass-panel animate-pop-in" id="create-workspace-modal">
        <button
          id="close-create-ws-btn"
          type="button"
          className="modal-close-btn"
          onClick={() => setCreateWorkspaceOpen(false)}
        >
          <X size={18} />
        </button>

        <div className="modal-header">
          <div className="modal-badge">
            <Layers size={13} />
            <span>Workspace Setup</span>
          </div>
          <h2>Create Workspace</h2>
          <p className="text-secondary text-sm">
            Workspaces are dedicated spaces for teams, projects, and shared boards.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="new-ws-name">Workspace Name</label>
            <div className="ws-name-input-group">
              <div className="icon-display-box" style={{ color: brandColor }}>
                <IconBadge nameOrEmoji={iconEmoji} size={18} color={brandColor} />
              </div>
              <input
                id="new-ws-name"
                type="text"
                className="input-field"
                placeholder={isDeployed() ? "Workspace name" : "e.g. Core Infrastructure & API"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="style-pickers">
            <div className="picker-col">
              <label className="text-xs text-muted">Workspace Icon</label>
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

            <div className="picker-col">
              <label className="text-xs text-muted">Accent Color</label>
              <div className="color-list">
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

          <div className="modal-actions">
            <button
              id="cancel-create-ws-btn"
              type="button"
              className="btn btn-secondary"
              onClick={() => setCreateWorkspaceOpen(false)}
            >
              Cancel
            </button>
            <button
              id="submit-create-ws-btn"
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim()}
            >
              <span>Create Workspace</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
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
          padding: 20px;
        }

        .modal-card {
          width: 100%;
          max-width: 460px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 18px;
          padding: 30px;
          position: relative;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
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
          margin-bottom: 22px;
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
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .ws-name-input-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .icon-display-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }

        .style-pickers {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .picker-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .icon-picker-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .icon-choice-btn {
          width: 30px;
          height: 30px;
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
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--transition-fast);
        }
        .color-btn.selected {
          transform: scale(1.15);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};
