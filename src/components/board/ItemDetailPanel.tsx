'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  Clock, 
  User, 
  Calendar, 
  Tag, 
  Send, 
  Smile, 
  MessageSquare, 
  History, 
  Trash2,
  Sparkles,
  Layers
} from 'lucide-react';
import { BoardItem } from '../../types';

export const ItemDetailPanel: React.FC = () => {
  const { 
    selectedItem, 
    closeItemDetail, 
    selectNextItem, 
    selectPrevItem, 
    updateBoardItem, 
    deleteBoardItem, 
    addItemComment, 
    toggleCommentReaction,
    boardGroups,
    activeBoard
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);

  useEffect(() => {
    if (selectedItem) {
      setTitle(selectedItem.title);
      setDescription(selectedItem.description || '');
      setIsStatusOpen(false);
      setIsPriorityOpen(false);
    }
  }, [selectedItem]);

  if (!selectedItem) return null;

  const currentGroup = boardGroups.find((g) => g.id === selectedItem.group_id);

  const statusOptions: { label: BoardItem['status']; color: string; icon: string; className: string }[] = [
    { label: 'Working on it', color: '#f59e0b', icon: '⚡', className: 'working' },
    { label: 'In Review', color: '#8b5cf6', icon: '🟣', className: 'review' },
    { label: 'Done', color: '#10b981', icon: '🟢', className: 'done' },
    { label: 'Stuck', color: '#ef4444', icon: '🔴', className: 'stuck' },
    { label: 'Pending', color: '#64748b', icon: '⏳', className: 'pending' },
  ];

  const priorityOptions: BoardItem['priority'][] = ['urgent', 'high', 'medium', 'low'];

  const handleTitleBlur = () => {
    if (title.trim() && title !== selectedItem.title) {
      updateBoardItem(selectedItem.id, { title: title.trim() });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== selectedItem.description) {
      updateBoardItem(selectedItem.id, { description });
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addItemComment(selectedItem.id, newComment.trim());
    setNewComment('');
  };

  return (
    <div className="panel-overlay" id="item-detail-overlay" onClick={closeItemDetail}>
      <aside 
        className="item-drawer glass-panel animate-slide-in-right" 
        id="item-detail-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Drawer Header & Sequential Navigation */}
        <div className="drawer-header">
          <div className="header-left">
            <span className="board-pill">
              <Layers size={13} />
              {activeBoard?.name || 'Board Item'}
            </span>
            <span className="group-crumb" style={{ color: currentGroup?.color }}>
              • {currentGroup?.name || 'Group'}
            </span>
          </div>

          <div className="header-nav-actions">
            <button
              id="detail-prev-item-btn"
              type="button"
              className="icon-btn"
              onClick={selectPrevItem}
              title="Previous Item (↑)"
            >
              <ChevronUp size={16} />
            </button>
            <button
              id="detail-next-item-btn"
              type="button"
              className="icon-btn"
              onClick={selectNextItem}
              title="Next Item (↓)"
            >
              <ChevronDown size={16} />
            </button>
            <button
              id="detail-close-btn"
              type="button"
              className="icon-btn close-btn"
              onClick={closeItemDetail}
              title="Close Panel (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Body */}
        <div className="drawer-body">
          {/* Editable Title */}
          <div className="title-section">
            <input
              id="detail-item-title"
              type="text"
              className="item-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Task name..."
            />
          </div>

          {/* Properties Grid */}
          <div className="properties-grid">
            {/* Status Property */}
            <div className="property-row">
              <span className="property-label">Status</span>
              <div className="property-value relative">
                <button
                  id="detail-status-trigger"
                  type="button"
                  className={`status-badge ${statusOptions.find((s) => s.label === selectedItem.status)?.className || 'working'}`}
                  onClick={() => setIsStatusOpen(!isStatusOpen)}
                >
                  <span>{statusOptions.find((s) => s.label === selectedItem.status)?.icon}</span>
                  <span>{selectedItem.status}</span>
                  <ChevronDown size={12} />
                </button>

                {isStatusOpen && (
                  <div className="dropdown-popover glass-panel animate-pop-in" id="detail-status-menu">
                    {statusOptions.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        className={`dropdown-option ${selectedItem.status === s.label ? 'active' : ''}`}
                        onClick={() => {
                          updateBoardItem(selectedItem.id, {
                            status: s.label,
                            status_color: s.color,
                          });
                          setIsStatusOpen(false);
                        }}
                      >
                        <span className="option-icon">{s.icon}</span>
                        <span>{s.label}</span>
                        {selectedItem.status === s.label && <Check size={14} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Priority Property */}
            <div className="property-row">
              <span className="property-label">Priority</span>
              <div className="property-value relative">
                <button
                  id="detail-priority-trigger"
                  type="button"
                  className={`badge badge-${selectedItem.priority}`}
                  onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                >
                  <span>{selectedItem.priority}</span>
                  <ChevronDown size={10} />
                </button>

                {isPriorityOpen && (
                  <div className="dropdown-popover glass-panel animate-pop-in" id="detail-priority-menu">
                    {priorityOptions.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`dropdown-option ${selectedItem.priority === p ? 'active' : ''}`}
                        onClick={() => {
                          updateBoardItem(selectedItem.id, { priority: p });
                          setIsPriorityOpen(false);
                        }}
                      >
                        <span className={`badge badge-${p}`}>{p}</span>
                        {selectedItem.priority === p && <Check size={14} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assignee Property */}
            <div className="property-row">
              <span className="property-label">Assignee</span>
              <div className="property-value">
                <div className="assignee-chip">
                  <img
                    src={selectedItem.assignee.avatar}
                    alt={selectedItem.assignee.name}
                    className="assignee-avatar"
                  />
                  <span>{selectedItem.assignee.name}</span>
                </div>
              </div>
            </div>

            {/* Due Date Property */}
            <div className="property-row">
              <span className="property-label">Due Date</span>
              <div className="property-value">
                <div className="date-chip">
                  <Calendar size={13} className="text-muted" />
                  <span className="font-mono text-xs">{selectedItem.due_date}</span>
                </div>
              </div>
            </div>

            {/* Tags Property */}
            <div className="property-row">
              <span className="property-label">Tags</span>
              <div className="property-value tags-row">
                {selectedItem.tags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="drawer-divider" />

          {/* Description Editor */}
          <div className="section-block">
            <h4 className="section-heading">Description & Specifications</h4>
            <textarea
              id="detail-item-description"
              className="description-textarea"
              placeholder="Add comprehensive specifications, acceptance criteria, or links..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              rows={4}
            />
          </div>

          <div className="drawer-divider" />

          {/* Updates & Comments Feed */}
          <div className="section-block">
            <div className="feed-header">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-primary" />
                <h4 className="section-heading mb-0">Team Updates & Discussion</h4>
              </div>
              <span className="text-xs text-muted font-mono">{selectedItem.comments.length} updates</span>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="comment-form" id="detail-comment-form">
              <input
                id="detail-comment-input"
                type="text"
                className="input-field comment-input"
                placeholder="Write an update, @mention a teammate, or drop notes..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button
                id="detail-comment-submit-btn"
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!newComment.trim()}
              >
                <Send size={13} />
                <span>Post</span>
              </button>
            </form>

            {/* Comments List */}
            <div className="comments-list" id="detail-comments-list">
              {selectedItem.comments.length === 0 ? (
                <div className="empty-feed-hint">
                  <p>No comments yet. Start the conversation with your team!</p>
                </div>
              ) : (
                selectedItem.comments.map((comm) => (
                  <div key={comm.id} className="comment-card" id={`comment-${comm.id}`}>
                    <div className="comment-top">
                      <img src={comm.author_avatar} alt={comm.author_name} className="comment-avatar" />
                      <div className="comment-meta">
                        <span className="author-name">{comm.author_name}</span>
                        <span className="timestamp font-mono text-xs">{comm.timestamp}</span>
                      </div>
                    </div>
                    <p className="comment-text">{comm.content}</p>

                    {/* Emoji Reactions */}
                    <div className="reactions-row">
                      {comm.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          className="reaction-pill"
                          onClick={() => toggleCommentReaction(selectedItem.id, comm.id, r.emoji)}
                        >
                          <span>{r.emoji}</span>
                          <span className="reaction-count font-mono">{r.count}</span>
                        </button>
                      ))}
                      <div className="reaction-pickers">
                        {['👍', '❤️', '🚀', '👀'].map((em) => (
                          <button
                            key={em}
                            type="button"
                            className="mini-emoji-btn"
                            onClick={() => toggleCommentReaction(selectedItem.id, comm.id, em)}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="drawer-divider" />

          {/* Activity Timeline */}
          <div className="section-block">
            <div className="flex items-center gap-2 mb-3">
              <History size={16} className="text-muted" />
              <h4 className="section-heading mb-0">Activity History</h4>
            </div>

            <div className="activity-timeline">
              {selectedItem.activities.map((act) => (
                <div key={act.id} className="activity-row">
                  <div className="activity-dot" />
                  <div className="activity-details">
                    <span className="act-author font-semibold">{act.author_name}</span>
                    <span className="act-action">{act.action}</span>
                    <span className="act-time font-mono text-xs text-muted">{act.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Footer Actions */}
        <div className="drawer-footer">
          <button
            id="detail-delete-btn"
            type="button"
            className="btn btn-ghost text-danger btn-sm"
            onClick={() => {
              if (confirm(`Delete item "${selectedItem.title}"?`)) {
                deleteBoardItem(selectedItem.id);
              }
            }}
          >
            <Trash2 size={14} />
            <span>Delete Item</span>
          </button>
          <span className="font-mono text-xs text-muted">ID: {selectedItem.id}</span>
        </div>
      </aside>

      <style jsx>{`
        .panel-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 12, 0.45);
          backdrop-filter: blur(4px);
          z-index: 500;
          display: flex;
          justify-content: flex-end;
        }

        .item-drawer {
          width: 100%;
          max-width: var(--item-panel-width);
          height: 100vh;
          background: var(--bg-surface);
          border-left: 1px solid var(--border-default);
          box-shadow: -10px 0 40px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* Header */
        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 22px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-subtle);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .board-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .group-crumb {
          font-size: 12px;
          font-weight: 600;
        }

        .header-nav-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .icon-btn {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .icon-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .close-btn:hover {
          color: var(--danger);
          background: var(--danger-bg);
        }

        /* Body */
        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .title-section {
          width: 100%;
        }

        .item-title-input {
          width: 100%;
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 6px 8px;
          transition: all var(--transition-fast);
          letter-spacing: -0.015em;
        }
        .item-title-input:hover {
          border-color: var(--border-subtle);
        }
        .item-title-input:focus {
          background: var(--bg-subtle);
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }

        /* Properties Grid */
        .properties-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--bg-subtle);
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
        }

        .property-row {
          display: grid;
          grid-template-columns: 100px 1fr;
          align-items: center;
          font-size: 13px;
        }

        .property-label {
          color: var(--text-muted);
          font-weight: 500;
        }

        .relative {
          position: relative;
        }

        .assignee-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
        }

        .assignee-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
        }

        .date-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .dropdown-popover {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          width: 180px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 10px;
          box-shadow: var(--shadow-md);
          padding: 6px;
          z-index: 100;
        }

        .dropdown-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          text-align: left;
        }
        .dropdown-option:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .dropdown-option.active {
          color: var(--primary-light);
          font-weight: 600;
        }

        .ml-auto {
          margin-left: auto;
        }

        .drawer-divider {
          height: 1px;
          background: var(--border-subtle);
        }

        .section-block {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-heading {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .mb-0 { margin-bottom: 0; }
        .mb-3 { margin-bottom: 12px; }

        .description-textarea {
          width: 100%;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 10px;
          padding: 12px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-primary);
          resize: vertical;
          transition: all var(--transition-fast);
        }
        .description-textarea:focus {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px var(--primary-glow);
          background: var(--bg-surface);
        }

        /* Comments Feed */
        .feed-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .comment-form {
          display: flex;
          gap: 8px;
        }

        .comment-input {
          flex: 1;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .comment-card {
          padding: 12px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
        }

        .comment-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .comment-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
        }

        .author-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .timestamp {
          color: var(--text-muted);
          margin-left: 6px;
        }

        .comment-text {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 8px;
        }

        .reactions-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .reaction-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: 12px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          font-size: 11px;
          color: var(--text-primary);
        }
        .reaction-pill:hover {
          border-color: var(--primary);
        }

        .reaction-pickers {
          display: flex;
          gap: 2px;
          margin-left: 6px;
        }

        .mini-emoji-btn {
          font-size: 13px;
          padding: 2px 5px;
          border-radius: 4px;
          transition: transform var(--transition-fast);
        }
        .mini-emoji-btn:hover {
          transform: scale(1.2);
          background: var(--bg-hover);
        }

        .empty-feed-hint {
          padding: 16px;
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
        }

        /* Activity Timeline */
        .activity-timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-left: 2px solid var(--border-subtle);
          margin-left: 8px;
          padding-left: 14px;
        }

        .activity-row {
          display: flex;
          align-items: flex-start;
          position: relative;
        }

        .activity-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary);
          position: absolute;
          left: -19px;
          top: 6px;
        }

        .activity-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
        }

        .act-action {
          color: var(--text-secondary);
        }

        /* Footer */
        .drawer-footer {
          padding: 14px 22px;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      `}</style>
    </div>
  );
};
