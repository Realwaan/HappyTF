'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SubItem } from '../../types';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { 
  Check, 
  Trash2, 
  Plus, 
  CircleDot, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Eye, 
  CornerDownRight 
} from 'lucide-react';

interface SubItemsTableProps {
  parentId: string;
  subItems: SubItem[];
  onAddSubItem: (parentId: string, title: string) => void;
  onUpdateSubItem: (parentId: string, subItemId: string, updates: Partial<SubItem>) => void;
  onDeleteSubItem: (parentId: string, subItemId: string) => void;
}

interface SubItemRowProps {
  parentId: string;
  sub: SubItem;
  statusOptions: { label: SubItem['status']; color: string; icon: React.ReactNode }[];
  activeStatusPopoverId: string | null;
  setActiveStatusPopoverId: (id: string | null) => void;
  onUpdateSubItem: (parentId: string, subItemId: string, updates: Partial<SubItem>) => void;
  onDeleteSubItem: (parentId: string, subItemId: string) => void;
}

const SubItemRow: React.FC<SubItemRowProps> = ({
  parentId,
  sub,
  statusOptions,
  activeStatusPopoverId,
  setActiveStatusPopoverId,
  onUpdateSubItem,
  onDeleteSubItem,
}) => {
  const [localTitle, setLocalTitle] = useState(sub.title);
  const [localPoints, setLocalPoints] = useState(sub.number_val ?? 1);
  const isTitleFocusedRef = useRef(false);

  useEffect(() => {
    if (!isTitleFocusedRef.current) {
      setLocalTitle(sub.title);
    }
  }, [sub.title]);

  useEffect(() => {
    setLocalPoints(sub.number_val ?? 1);
  }, [sub.number_val]);

  const handleTitleBlur = () => {
    isTitleFocusedRef.current = false;
    if (localTitle.trim() && localTitle !== sub.title) {
      onUpdateSubItem(parentId, sub.id, { title: localTitle.trim() });
    }
  };

  const handlePointsBlur = () => {
    if (localPoints !== sub.number_val) {
      onUpdateSubItem(parentId, sub.id, { number_val: localPoints });
    }
  };

  return (
    <div className="sub-grid-row sub-data-row">
      {/* Checkbox */}
      <div className="cell cell-check">
        <button
          type="button"
          className={`sub-checkbox ${sub.completed ? 'checked' : ''}`}
          onClick={() => {
            const newCompleted = !sub.completed;
            onUpdateSubItem(parentId, sub.id, {
              completed: newCompleted,
              status: newCompleted ? 'Done' : 'Working on it',
              status_color: newCompleted ? '#10b981' : '#f59e0b',
            });
          }}
        >
          {sub.completed && <Check size={11} strokeWidth={3} />}
        </button>
      </div>

      {/* Title */}
      <div className="cell cell-title">
        <input
          type="text"
          value={localTitle}
          onFocus={() => { isTitleFocusedRef.current = true; }}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          className={`sub-title-input ${sub.completed ? 'completed' : ''}`}
        />
      </div>

      {/* Status with popover */}
      <div className="cell cell-status relative">
        <button
          type="button"
          className="sub-status-pill"
          style={{
            backgroundColor: `${sub.status_color || '#10b981'}25`,
            color: sub.status_color || '#10b981',
            borderColor: `${sub.status_color || '#10b981'}50`,
          }}
          onClick={() => setActiveStatusPopoverId(activeStatusPopoverId === sub.id ? null : sub.id)}
        >
          <span 
            className="status-dot" 
            style={{ backgroundColor: sub.status_color || '#10b981' }} 
          />
          <span className="truncate">{sub.status || 'Done'}</span>
        </button>

        {activeStatusPopoverId === sub.id && (
          <div className="sub-popover-menu">
            {statusOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className="popover-option"
                onClick={() => {
                  onUpdateSubItem(parentId, sub.id, {
                    status: opt.label,
                    status_color: opt.color,
                    completed: opt.label === 'Done',
                  });
                  setActiveStatusPopoverId(null);
                }}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Owner */}
      <div className="cell cell-owner">
        {sub.assignee ? (
          <div className="sub-assignee-box">
            <img src={getSafeAvatar(sub.assignee.avatar, sub.assignee.name)} alt={sub.assignee.name} className="sub-avatar" />
            <span className="truncate">{sub.assignee.name}</span>
          </div>
        ) : (
          <span className="sub-empty">—</span>
        )}
      </div>

      {/* Points / Numbers */}
      <div className="cell cell-points">
        <input
          type="number"
          value={localPoints}
          onChange={(e) => setLocalPoints(parseInt(e.target.value, 10) || 0)}
          onBlur={handlePointsBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          className="sub-points-input"
        />
      </div>

      {/* Delete */}
      <div className="cell cell-actions">
        <button
          type="button"
          className="sub-delete-btn"
          onClick={() => onDeleteSubItem(parentId, sub.id)}
          title="Delete sub-item"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

export const SubItemsTable: React.FC<SubItemsTableProps> = ({
  parentId,
  subItems,
  onAddSubItem,
  onUpdateSubItem,
  onDeleteSubItem,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [activeStatusPopoverId, setActiveStatusPopoverId] = useState<string | null>(null);

  const statusOptions: { label: SubItem['status']; color: string; icon: React.ReactNode }[] = [
    { label: 'Working on it', color: '#f59e0b', icon: <CircleDot size={12} style={{ color: '#f59e0b' }} /> },
    { label: 'In Review', color: '#8b5cf6', icon: <Eye size={12} style={{ color: '#8b5cf6' }} /> },
    { label: 'Done', color: '#10b981', icon: <CheckCircle2 size={12} style={{ color: '#10b981' }} /> },
    { label: 'Stuck', color: '#ef4444', icon: <AlertCircle size={12} style={{ color: '#ef4444' }} /> },
    { label: 'Pending', color: '#64748b', icon: <Clock size={12} style={{ color: '#94a3b8' }} /> },
  ];

  const handleAdd = () => {
    if (newTitle.trim()) {
      onAddSubItem(parentId, newTitle.trim());
      setNewTitle('');
    }
  };

  return (
    <div 
      className="sub-items-wrapper animate-fade-in" 
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sub-items-header-bar">
        <CornerDownRight size={13} className="header-icon" />
        <span className="header-label">Sub-Items</span>
        <span className="header-count">({subItems.length})</span>
      </div>

      <div className="sub-items-table-box">
        {/* Sub-item Header */}
        <div className="sub-grid-row sub-header-row">
          <div className="cell cell-check"></div>
          <div className="cell cell-title">Sub-Item Title</div>
          <div className="cell cell-status">Status</div>
          <div className="cell cell-owner">Owner</div>
          <div className="cell cell-points">Points</div>
          <div className="cell cell-actions"></div>
        </div>

        {/* Sub-item Rows */}
        {subItems.map((sub) => (
          <SubItemRow
            key={sub.id}
            parentId={parentId}
            sub={sub}
            statusOptions={statusOptions}
            activeStatusPopoverId={activeStatusPopoverId}
            setActiveStatusPopoverId={setActiveStatusPopoverId}
            onUpdateSubItem={onUpdateSubItem}
            onDeleteSubItem={onDeleteSubItem}
          />
        ))}

        {/* Add Sub-Item Inline Form */}
        <div className="sub-add-row">
          <Plus size={13} className="add-icon" />
          <input
            type="text"
            placeholder="Add new sub-item... (Enter to save)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="add-input"
          />
          {newTitle.trim() && (
            <button
              type="button"
              className="add-save-btn"
              onClick={handleAdd}
            >
              Add
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .sub-items-wrapper {
          width: 100%;
          padding: 8px 16px 12px 32px;
          background: rgba(12, 14, 20, 0.4);
          border-top: 1px solid var(--border-subtle);
          border-bottom: 1px solid var(--border-subtle);
          margin: 4px 0;
        }

        .sub-items-header-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 600;
        }

        .header-icon {
          color: var(--primary);
        }

        .header-label {
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-family: var(--font-mono);
          color: var(--primary);
          font-size: 10px;
        }

        .header-count {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-muted);
        }

        .sub-items-table-box {
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          overflow: hidden;
          font-size: 12px;
        }

        .sub-grid-row {
          display: grid;
          grid-template-columns: 36px 1fr 130px 130px 80px 36px;
          align-items: center;
          padding: 0 10px;
        }

        .sub-header-row {
          background: var(--bg-subtle);
          border-bottom: 1px solid var(--border-subtle);
          font-family: var(--font-mono);
          font-size: 10px;
          text-transform: uppercase;
          color: var(--text-muted);
          height: 28px;
        }

        .sub-data-row {
          border-bottom: 1px solid var(--border-subtle);
          min-height: 36px;
          transition: background var(--transition-fast);
        }

        .sub-data-row:hover {
          background: var(--bg-hover);
        }

        .cell {
          padding: 4px 6px;
        }

        .cell.relative {
          position: relative;
        }

        .cell-check {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sub-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid var(--border-default);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all var(--transition-fast);
          padding: 0;
        }

        .sub-checkbox.checked {
          background: var(--primary);
          border-color: var(--primary);
          color: var(--on-primary);
        }

        .sub-title-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 12px;
        }

        .sub-title-input.completed {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        .sub-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: var(--radius-xs);
          border: 1px solid;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .sub-popover-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 6px;
          z-index: 50;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-lg);
          padding: 4px;
          min-width: 130px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .popover-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: var(--radius-xs);
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 11px;
          cursor: pointer;
          text-align: left;
          width: 100%;
        }

        .popover-option:hover {
          background: var(--bg-hover);
        }

        .sub-assignee-box {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .sub-avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .sub-empty {
          color: var(--text-muted);
          font-size: 11px;
        }

        .sub-points-input {
          width: 44px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-xs);
          color: var(--text-secondary);
          font-family: var(--font-mono);
          font-size: 11px;
          padding: 2px 4px;
          outline: none;
        }

        .sub-points-input:hover, .sub-points-input:focus {
          border-color: var(--border-default);
          background: var(--bg-subtle);
        }

        .sub-delete-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color var(--transition-fast);
        }

        .sub-delete-btn:hover {
          color: #ef4444;
        }

        .sub-add-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: var(--bg-subtle);
        }

        .add-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .add-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 11px;
          outline: none;
        }

        .add-input::placeholder {
          color: var(--text-muted);
        }

        .add-save-btn {
          padding: 2px 8px;
          font-size: 10px;
          font-weight: 600;
          background: var(--primary);
          color: var(--on-primary);
          border: none;
          border-radius: var(--radius-xs);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};
