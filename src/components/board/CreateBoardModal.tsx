'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Kanban, Plus, LayoutGrid, Check, Sparkles, Layers, AlertTriangle, Users, Folder } from 'lucide-react';
import { AVAILABLE_ICONS, IconBadge } from '../common/IconBadge';
import { BOARD_TEMPLATES } from '../../lib/boardTemplates';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_OPTIONS = [
  { id: '#3ecf8e', label: 'Supabase Emerald' },
  { id: '#24b47e', label: 'Deep Emerald' },
  { id: '#3b82f6', label: 'Blue' },
  { id: '#f59e0b', label: 'Amber' },
  { id: '#ef4444', label: 'Rose' },
  { id: '#ec4899', label: 'Pink' },
  { id: '#8b5cf6', label: 'Purple' },
  { id: '#06b6d4', label: 'Cyan' },
];

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ isOpen, onClose }) => {
  const { createBoard } = useApp();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('sprint-agile');
  const [boardName, setBoardName] = useState('Sprint Planning & Agile Delivery');
  const [description, setDescription] = useState('High-velocity two-week sprint tracker with backlog scoping, active delivery, and QA review stages.');
  const [selectedIcon, setSelectedIcon] = useState('kanban');
  const [selectedColor, setSelectedColor] = useState('#3ecf8e');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = BOARD_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setBoardName(tmpl.name);
      setDescription(tmpl.description);
      setSelectedIcon(tmpl.icon);
      setSelectedColor(tmpl.color);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim()) return;
    createBoard(
      boardName.trim(),
      selectedIcon,
      description.trim() || 'Workspace tracking board',
      selectedColor,
      selectedTemplateId
    );
    setBoardName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="board-modal-overlay animate-fade-in" onClick={onClose} id="create-board-modal-overlay">
      <div
        className="board-modal-card glass-panel animate-pop-in"
        onClick={(e) => e.stopPropagation()}
        id="create-board-modal-card"
      >
        <div className="modal-header-row">
          <div className="modal-title-col">
            <div className="modal-category-pill">
              <Kanban size={13} className="text-primary-light" />
              <span>New Board</span>
            </div>
            <h2>Create Workspace Board</h2>
            <p className="text-xs text-muted mt-1">
              Select an agile template or build a custom board with customized groups and fields.
            </p>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="board-modal-form">
          {/* Template Selector Cards */}
          <div className="form-group">
            <label className="flex items-center justify-between">
              <span>Choose Template</span>
              <span className="text-[11px] text-muted font-normal">Pre-configured groups & starter tasks</span>
            </label>
            <div className="template-cards-grid">
              {BOARD_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    className={`template-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                  >
                    <div className="template-card-header">
                      <div className="template-card-icon" style={{ backgroundColor: `${tmpl.color}20`, color: tmpl.color }}>
                        <IconBadge nameOrEmoji={tmpl.icon} size={15} color={tmpl.color} variant="solid" />
                      </div>
                      <div className="template-card-title-box">
                        <span className="template-card-title">{tmpl.name}</span>
                        <span className="template-card-category">{tmpl.category}</span>
                      </div>
                      {isSelected && (
                        <div className="template-check" style={{ color: tmpl.color }}>
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                    <p className="template-card-desc">{tmpl.description}</p>
                    <div className="template-groups-preview">
                      {tmpl.groups.slice(0, 3).map((g, i) => (
                        <span key={i} className="template-group-pill" style={{ borderLeftColor: g.color }}>
                          {g.name}
                        </span>
                      ))}
                      {tmpl.groups.length > 3 && (
                        <span className="template-group-pill text-muted">+{tmpl.groups.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="modal-board-name">Board Title</label>
            <div className="title-input-wrapper">
              <IconBadge
                nameOrEmoji={selectedIcon}
                size={18}
                color={selectedColor}
                variant="subtle"
                className="input-icon-preview"
              />
              <input
                ref={inputRef}
                id="modal-board-name"
                type="text"
                className="input-field board-title-input"
                placeholder="e.g. Q3 Sprint Backlog & Releases"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="modal-board-desc">Description (Optional)</label>
            <input
              id="modal-board-desc"
              type="text"
              className="input-field"
              placeholder="e.g. High-velocity feature delivery and sprint cycles"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Icon Selector (No emojis) */}
          <div className="form-group">
            <label>Board Icon</label>
            <div className="icon-grid">
              {AVAILABLE_ICONS.map((item) => {
                const isSelected = selectedIcon === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`icon-choice-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedIcon(item.id)}
                    title={item.label}
                    aria-label={`Select ${item.label} icon`}
                  >
                    <IconComponent
                      size={16}
                      style={{ color: isSelected ? selectedColor : 'var(--text-secondary)' }}
                    />
                    <span className="icon-name">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div className="form-group">
            <label>Color Accent</label>
            <div className="color-swatch-row">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`color-dot-btn ${selectedColor === c.id ? 'active' : ''}`}
                  style={{ backgroundColor: c.id }}
                  onClick={() => setSelectedColor(c.id)}
                  title={c.label}
                  aria-label={`Select ${c.label} color`}
                >
                  {selectedColor === c.id && <Check size={12} color="#ffffff" />}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary create-action-btn"
              disabled={!boardName.trim()}
            >
              <Plus size={15} />
              <span>Create Board</span>
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .board-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 12, 0.78);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .board-modal-card {
          width: 100%;
          max-width: 580px;
          max-height: 90vh;
          overflow-y: auto;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 28px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }

        .template-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 4px;
        }

        @media (max-width: 540px) {
          .template-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .template-card {
          text-align: left;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 12px;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .template-card:hover {
          background: var(--bg-hover);
          border-color: var(--border-default);
          transform: translateY(-1px);
        }
        .template-card.selected {
          border-color: var(--primary);
          background: rgba(62, 207, 142, 0.08);
          box-shadow: 0 0 0 1px var(--primary);
        }

        .template-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .template-card-icon {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .template-card-title-box {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .template-card-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .template-card-category {
          font-size: 10px;
          color: var(--text-muted);
        }

        .template-check {
          flex-shrink: 0;
        }

        .template-card-desc {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .template-groups-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }

        .template-group-pill {
          font-size: 9px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-left-width: 3px;
          color: var(--text-secondary);
        }

        .modal-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .modal-category-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(62, 207, 142, 0.12);
          border: 1px solid rgba(62, 207, 142, 0.25);
          font-size: 11px;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 6px;
        }

        h2 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .close-btn {
          color: var(--text-muted);
          background: transparent;
          border: none;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .close-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .board-modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .title-input-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .board-title-input {
          flex: 1;
        }

        .input-field {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          transition: all var(--transition-fast);
        }
        .input-field:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(62, 207, 142, 0.25);
        }

        .icon-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .icon-choice-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 6px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .icon-choice-btn:hover {
          background: var(--bg-hover);
          border-color: var(--border-default);
        }
        .icon-choice-btn.selected {
          background: rgba(62, 207, 142, 0.12);
          border-color: var(--primary);
        }

        .icon-name {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .icon-choice-btn.selected .icon-name {
          color: var(--text-primary);
          font-weight: 600;
        }

        .color-swatch-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .color-dot-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--transition-fast);
        }
        .color-dot-btn:hover {
          transform: scale(1.15);
        }
        .color-dot-btn.active {
          border-color: #ffffff;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }

        .modal-footer-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
          padding-top: 14px;
          border-top: 1px solid var(--border-subtle);
        }

        .create-action-btn {
          background: var(--primary) !important;
          color: var(--on-primary) !important;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(62, 207, 142, 0.35);
        }
        .create-action-btn:hover {
          background: var(--primary-hover) !important;
        }
      `}</style>
    </div>
  );
};
