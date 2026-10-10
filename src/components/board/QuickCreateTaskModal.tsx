'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { getDefaultBoardGroups } from '../../lib/mock-data';
import { X, CheckSquare, Plus, AlertCircle, Calendar, User } from 'lucide-react';

interface QuickCreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCreateTaskModal: React.FC<QuickCreateTaskModalProps> = ({ isOpen, onClose }) => {
  const { boardGroups, addBoardItem, members, activeBoard, currentUser } = useApp();

  const effectiveGroups = useMemo(() => {
    if (boardGroups && boardGroups.length > 0) return boardGroups;
    const bId = activeBoard?.id || 'default';
    return getDefaultBoardGroups(bId);
  }, [boardGroups, activeBoard?.id]);

  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState(effectiveGroups[0]?.id || '');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [assigneeId, setAssigneeId] = useState(currentUser?.id || members[0]?.user_id || members[0]?.id || '');
  const [dueDate, setDueDate] = useState('Next week');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (!groupId || !effectiveGroups.some((g) => g.id === groupId)) {
        setGroupId(effectiveGroups[0]?.id || '');
      }
      if (currentUser?.id && !assigneeId) {
        setAssigneeId(currentUser.id);
      } else if (!assigneeId && members.length > 0) {
        setAssigneeId(members[0].user_id || members[0].id);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, effectiveGroups, groupId, currentUser, assigneeId, members]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetGroupId = groupId || effectiveGroups[0]?.id;
    if (!title.trim() || !targetGroupId) return;

    const targetMember = members.find((m) => m.user_id === assigneeId || m.id === assigneeId);
    const assignee = targetMember ? {
      id: targetMember.user_id,
      name: targetMember.profile?.full_name || 'Member',
      avatar: getSafeAvatar(targetMember.profile?.avatar_url, targetMember.profile?.full_name),
    } : (currentUser ? {
      id: currentUser.id,
      name: currentUser.full_name,
      avatar: getSafeAvatar(currentUser.avatar_url, currentUser.full_name),
    } : undefined);

    addBoardItem(targetGroupId, title.trim(), {
      priority,
      assignee,
      due_date: dueDate || 'Next week',
    });

    setTitle('');
    onClose();
  };

  return (
    <div className="task-modal-overlay animate-fade-in" onClick={onClose} id="quick-create-task-overlay">
      <div
        className="task-modal-card glass-panel animate-pop-in"
        onClick={(e) => e.stopPropagation()}
        id="quick-create-task-modal"
      >
        <div className="task-modal-header">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-primary-light" />
            <h2 className="text-sm font-bold text-white">Create Issue in {activeBoard?.name || 'Board'}</h2>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-modal-form">
          <div className="form-group">
            <input
              ref={inputRef}
              id="quick-task-title-input"
              type="text"
              className="task-title-input"
              placeholder="Issue title (e.g. Implement OAuth token refresh flow)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="task-meta-grid">
            <div className="meta-field">
              <label htmlFor="select-group-id">Status Column</label>
              <select
                id="select-group-id"
                value={groupId || effectiveGroups[0]?.id}
                onChange={(e) => setGroupId(e.target.value)}
                className="select-input"
              >
                {effectiveGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="meta-field">
              <label htmlFor="select-priority">Priority</label>
              <select
                id="select-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'urgent' | 'high' | 'medium' | 'low')}
                className="select-input"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="meta-field">
              <label htmlFor="select-assignee">Assignee</label>
              <select
                id="select-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="select-input"
              >
                {members.map((m, idx) => (
                  <option key={m.id ? `${m.id}-${m.user_id || idx}` : `member-${idx}`} value={m.user_id}>
                    {m.profile?.full_name || 'Member'} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="meta-field">
              <label htmlFor="input-due-date">Due Date</label>
              <input
                id="input-due-date"
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="e.g. Tomorrow, Sep 30"
                className="select-input"
              />
            </div>
          </div>

          <div className="task-modal-footer">
            <div className="shortcut-hint text-xs text-muted">
              Press <kbd>Enter</kbd> to create
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!title.trim()}
              >
                <Plus size={14} />
                <span>Create Issue</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        .task-modal-overlay {
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

        .task-modal-card {
          width: 100%;
          max-width: 480px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 22px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }

        .task-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 16px;
        }

        .close-btn {
          color: var(--text-muted);
          background: transparent;
          border: none;
          padding: 4px;
          border-radius: 6px;
          cursor: pointer;
        }
        .close-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .task-modal-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .task-title-input {
          width: 100%;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          padding: 12px 14px;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          outline: none;
        }
        .task-title-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(62, 207, 142, 0.25);
        }

        .task-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .meta-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .meta-field label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .select-input {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          padding: 8px 10px;
          color: var(--text-primary);
          font-size: 12px;
          outline: none;
        }

        .task-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 14px;
          border-top: 1px solid var(--border-subtle);
          margin-top: 6px;
        }

        kbd {
          font-size: 10px;
          background: rgba(255, 255, 255, 0.08);
          padding: 2px 5px;
          border-radius: 4px;
          font-family: var(--font-mono);
        }
      `}</style>
    </div>
  );
};
