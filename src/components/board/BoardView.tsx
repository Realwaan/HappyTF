'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BoardItem, ViewMode } from '../../types';
import { 
  Table, 
  Kanban, 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Filter, 
  Calendar, 
  Tag, 
  Check, 
  ArrowLeft,
  Sparkles,
  ExternalLink,
  MoreHorizontal
} from 'lucide-react';

export const BoardView: React.FC = () => {
  const { 
    activeBoard, 
    boardGroups, 
    boardItems, 
    openItemDetail, 
    addBoardItem, 
    updateBoardItem, 
    toggleGroupCollapse, 
    navigateToHome 
  } = useApp();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newRowTitle, setNewRowTitle] = useState<Record<string, string>>({});
  const [activeInlineStatusId, setActiveInlineStatusId] = useState<string | null>(null);

  if (!activeBoard) {
    return (
      <div className="board-not-found animate-fade-in">
        <h3>Board not found</h3>
        <button type="button" className="btn btn-primary btn-sm" onClick={navigateToHome}>
          Back to My Work
        </button>
      </div>
    );
  }

  // Filter items
  const filteredItems = boardItems.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions: { label: BoardItem['status']; color: string; icon: string; className: string }[] = [
    { label: 'Working on it', color: '#f59e0b', icon: '⚡', className: 'working' },
    { label: 'In Review', color: '#8b5cf6', icon: '🟣', className: 'review' },
    { label: 'Done', color: '#10b981', icon: '🟢', className: 'done' },
    { label: 'Stuck', color: '#ef4444', icon: '🔴', className: 'stuck' },
    { label: 'Pending', color: '#64748b', icon: '⏳', className: 'pending' },
  ];

  const handleAddInlineItem = (groupId: string) => {
    const title = newRowTitle[groupId];
    if (title?.trim()) {
      addBoardItem(groupId, title.trim());
      setNewRowTitle((prev) => ({ ...prev, [groupId]: '' }));
    }
  };

  return (
    <div className="board-view-container animate-fade-in" id="board-view-container">
      {/* 1. Board Header */}
      <header className="board-header">
        <div className="header-top-row">
          <div className="board-title-group">
            <button
              id="back-to-home-btn"
              type="button"
              className="back-btn"
              onClick={navigateToHome}
              title="Return to My Work"
            >
              <ArrowLeft size={16} />
              <span>My Work</span>
            </button>
            <div className="title-row">
              <span className="board-emoji">{activeBoard.icon_emoji}</span>
              <h1 className="board-title" id="active-board-title">{activeBoard.name}</h1>
            </div>
          </div>

          <div className="board-meta-right">
            <div className="avatar-stack">
              {activeBoard.member_avatars.map((av, i) => (
                <img key={i} src={av} alt="Member" className="stacked-avatar" style={{ zIndex: 10 - i }} />
              ))}
            </div>
          </div>
        </div>

        <p className="board-description">{activeBoard.description}</p>

        {/* 2. Control Bar: Views Switcher (Table vs Kanban) & Search Filter */}
        <div className="board-controls-bar">
          <div className="view-mode-tabs" id="view-mode-tabs">
            <button
              id="view-mode-table-btn"
              type="button"
              className={`view-tab ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <Table size={15} />
              <span>Table View</span>
            </button>
            <button
              id="view-mode-kanban-btn"
              type="button"
              className={`view-tab ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              <Kanban size={15} />
              <span>Kanban View</span>
            </button>
          </div>

          <div className="filters-right">
            <div className="search-box">
              <Search size={14} className="text-muted" />
              <input
                id="board-search-input"
                type="text"
                placeholder="Search board items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="board-search-field"
              />
            </div>

            <select
              id="board-status-filter"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Working on it">⚡ Working on it</option>
              <option value="In Review">🟣 In Review</option>
              <option value="Done">🟢 Done</option>
              <option value="Stuck">🔴 Stuck</option>
              <option value="Pending">⏳ Pending</option>
            </select>
          </div>
        </div>
      </header>

      {/* 3. Main View Render */}
      <div className="board-content-canvas">
        {/* ================= TABLE VIEW ================= */}
        {viewMode === 'table' && (
          <div className="table-view" id="board-table-view">
            {boardGroups.map((group) => {
              const groupItems = filteredItems.filter((i) => i.group_id === group.id);

              return (
                <div key={group.id} className="group-card glass-panel" id={`group-section-${group.id}`}>
                  {/* Group Header */}
                  <div className="group-header">
                    <button
                      type="button"
                      className="group-collapse-btn"
                      onClick={() => toggleGroupCollapse(group.id)}
                      title={group.collapsed ? 'Expand group' : 'Collapse group'}
                    >
                      {group.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      <span className="group-indicator" style={{ backgroundColor: group.color }} />
                      <span className="group-title" style={{ color: group.color }}>{group.name}</span>
                    </button>
                    <span className="group-count-badge font-mono">{groupItems.length} items</span>
                  </div>

                  {!group.collapsed && (
                    <div className="group-table-content">
                      {/* Column Header */}
                      <div className="table-header-grid">
                        <div className="col-name">ITEM NAME</div>
                        <div className="col-status">STATUS</div>
                        <div className="col-assignee">ASSIGNEE</div>
                        <div className="col-priority">PRIORITY</div>
                        <div className="col-due">DUE DATE</div>
                        <div className="col-tags">TAGS</div>
                      </div>

                      {/* Items Rows */}
                      <div className="items-rows-container">
                        {groupItems.map((item) => (
                          <div
                            key={item.id}
                            className="table-row"
                            id={`board-item-row-${item.id}`}
                            onClick={() => openItemDetail(item)}
                          >
                            <div className="col-name">
                              <span className="row-item-title">{item.title}</span>
                            </div>

                            {/* Status Chip */}
                            <div className="col-status" onClick={(e) => e.stopPropagation()}>
                              <div className="relative">
                                <button
                                  type="button"
                                  className={`status-badge ${statusOptions.find((s) => s.label === item.status)?.className || 'working'}`}
                                  id={`inline-status-chip-${item.id}`}
                                  onClick={() => setActiveInlineStatusId(activeInlineStatusId === item.id ? null : item.id)}
                                >
                                  <span>{statusOptions.find((s) => s.label === item.status)?.icon}</span>
                                  <span>{item.status}</span>
                                  <ChevronDown size={11} />
                                </button>

                                {activeInlineStatusId === item.id && (
                                  <div className="dropdown-popover glass-panel animate-pop-in" id={`popover-status-${item.id}`}>
                                    {statusOptions.map((s) => (
                                      <button
                                        key={s.label}
                                        type="button"
                                        className={`dropdown-option ${item.status === s.label ? 'active' : ''}`}
                                        onClick={() => {
                                          updateBoardItem(item.id, {
                                            status: s.label,
                                            status_color: s.color,
                                          });
                                          setActiveInlineStatusId(null);
                                        }}
                                      >
                                        <span>{s.icon}</span>
                                        <span>{s.label}</span>
                                        {item.status === s.label && <Check size={13} className="ml-auto" />}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Assignee */}
                            <div className="col-assignee">
                              <div className="assignee-pill">
                                <img src={item.assignee.avatar} alt={item.assignee.name} className="mini-avatar" />
                                <span className="assignee-text">{item.assignee.name}</span>
                              </div>
                            </div>

                            {/* Priority */}
                            <div className="col-priority">
                              <span className={`badge badge-${item.priority}`}>{item.priority}</span>
                            </div>

                            {/* Due Date */}
                            <div className="col-due">
                              <span className="font-mono text-xs text-secondary">{item.due_date}</span>
                            </div>

                            {/* Tags */}
                            <div className="col-tags">
                              <div className="tags-flex">
                                {item.tags.map((t) => (
                                  <span key={t} className="tag-pill">{t}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Inline Add Item Row */}
                        <div className="add-row-container">
                          <input
                            id={`add-item-input-${group.id}`}
                            type="text"
                            placeholder="＋ Add item... (Press Enter to save)"
                            className="inline-add-input"
                            value={newRowTitle[group.id] || ''}
                            onChange={(e) => setNewRowTitle({ ...newRowTitle, [group.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddInlineItem(group.id);
                              }
                            }}
                          />
                          {(newRowTitle[group.id] || '').trim() && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAddInlineItem(group.id)}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ================= KANBAN VIEW ================= */}
        {viewMode === 'kanban' && (
          <div className="kanban-view" id="board-kanban-view">
            {statusOptions.map((st) => {
              const cards = filteredItems.filter((i) => i.status === st.label);

              return (
                <div key={st.label} className="kanban-column glass-panel" id={`kanban-col-${st.className}`}>
                  {/* Column Header */}
                  <div className="kanban-col-header">
                    <div className="col-title-left">
                      <span className="col-icon">{st.icon}</span>
                      <span className="col-title">{st.label}</span>
                    </div>
                    <span className="col-count font-mono">{cards.length}</span>
                  </div>

                  {/* Cards Stack */}
                  <div className="cards-stack">
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className="kanban-card glass-panel"
                        id={`kanban-card-${card.id}`}
                        onClick={() => openItemDetail(card)}
                      >
                        <div className="card-top">
                          <span className={`badge badge-${card.priority}`}>{card.priority}</span>
                          <span className="font-mono text-xs text-muted">{card.due_date}</span>
                        </div>

                        <h4 className="card-title">{card.title}</h4>

                        {card.tags.length > 0 && (
                          <div className="card-tags">
                            {card.tags.map((t) => (
                              <span key={t} className="tag-pill">{t}</span>
                            ))}
                          </div>
                        )}

                        <div className="card-footer">
                          <div className="card-assignee">
                            <img src={card.assignee.avatar} alt={card.assignee.name} className="mini-avatar" />
                            <span>{card.assignee.name}</span>
                          </div>
                          {card.comments.length > 0 && (
                            <span className="font-mono text-xs text-muted">💬 {card.comments.length}</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {cards.length === 0 && (
                      <div className="empty-kanban-slot">
                        <span>No items in {st.label}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .board-view-container {
          padding: 28px 32px;
          max-width: 1440px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Header */
        .board-header {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .header-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .board-title-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
          transition: color var(--transition-fast);
        }
        .back-btn:hover {
          color: var(--primary-light);
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .board-emoji {
          font-size: 28px;
          padding: 6px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
        }

        .board-title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }

        .board-description {
          font-size: 13px;
          color: var(--text-secondary);
          max-width: 720px;
        }

        .avatar-stack {
          display: flex;
        }
        .stacked-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid var(--bg-canvas);
          margin-left: -8px;
          object-fit: cover;
        }
        .stacked-avatar:first-child {
          margin-left: 0;
        }

        /* Controls Bar */
        .board-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .view-mode-tabs {
          display: flex;
          gap: 6px;
        }

        .view-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .view-tab:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .view-tab.active {
          background: var(--bg-elevated);
          color: var(--primary-light);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }

        .filters-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 8px;
        }

        .board-search-field {
          background: transparent;
          border: none;
          font-size: 12px;
          color: var(--text-primary);
          outline: none;
          width: 160px;
        }

        .filter-select {
          padding: 6px 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 12px;
        }

        /* Table View */
        .table-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .group-card {
          border-radius: 14px;
          overflow: hidden;
        }

        .group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: var(--bg-subtle);
          border-bottom: 1px solid var(--border-subtle);
        }

        .group-collapse-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
        }

        .group-indicator {
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }

        .group-count-badge {
          font-size: 11px;
          padding: 2px 7px;
          border-radius: 6px;
          background: var(--bg-elevated);
          color: var(--text-muted);
        }

        .table-header-grid {
          display: grid;
          grid-template-columns: 3fr 1.6fr 1.6fr 1.2fr 1.2fr 1.8fr;
          padding: 10px 20px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(0, 0, 0, 0.15);
        }

        .table-row {
          display: grid;
          grid-template-columns: 3fr 1.6fr 1.6fr 1.2fr 1.2fr 1.8fr;
          align-items: center;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .table-row:hover {
          background: var(--bg-hover);
        }

        .row-item-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .relative {
          position: relative;
        }

        .assignee-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .mini-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          object-fit: cover;
        }

        .tags-flex {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .dropdown-popover {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          width: 160px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          box-shadow: var(--shadow-md);
          padding: 4px;
          z-index: 100;
        }

        .dropdown-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 12px;
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

        .add-row-container {
          display: flex;
          align-items: center;
          padding: 10px 20px;
          gap: 12px;
          background: rgba(255, 255, 255, 0.01);
        }

        .inline-add-input {
          flex: 1;
          background: transparent;
          border: none;
          font-size: 13px;
          color: var(--text-primary);
          outline: none;
        }
        .inline-add-input::placeholder {
          color: var(--text-muted);
        }

        /* Kanban View */
        .kanban-view {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 18px;
          align-items: flex-start;
        }

        .kanban-column {
          padding: 14px;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 400px;
        }

        .kanban-col-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .col-title-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .col-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .col-count {
          font-size: 11px;
          padding: 1px 6px;
          border-radius: 10px;
          background: var(--bg-elevated);
          color: var(--text-muted);
        }

        .cards-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .kanban-card {
          padding: 14px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: all var(--transition-fast);
        }
        .kanban-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-highlight);
          box-shadow: var(--shadow-sm);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .card-tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 6px;
          border-top: 1px solid var(--border-subtle);
        }

        .card-assignee {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .empty-kanban-slot {
          padding: 24px;
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
          border: 1px dashed var(--border-subtle);
          border-radius: 8px;
        }

        .board-not-found {
          padding: 48px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};
