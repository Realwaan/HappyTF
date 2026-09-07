'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MyWorkItem } from '../../types';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Kanban, 
  Plus, 
  ExternalLink, 
  Users, 
  Layers, 
  Sparkles, 
  Filter, 
  Calendar,
  Check,
  ChevronDown
} from 'lucide-react';

export const MyWorkDashboard: React.FC = () => {
  const { 
    currentUser, 
    currentWorkspace, 
    myWorkItems, 
    recentBoards, 
    updateWorkItemStatus, 
    createBoard,
    setWorkspaceSettingsOpen,
    setOnboardingOpen
  } = useApp();

  const [activeTab, setActiveTab] = useState<'assigned' | 'recent'>('assigned');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [activeStatusMenuId, setActiveStatusMenuId] = useState<string | null>(null);

  // Metrics computation
  const totalAssigned = myWorkItems.length;
  const completedCount = myWorkItems.filter((i) => i.status === 'Done').length;
  const urgentCount = myWorkItems.filter((i) => i.priority === 'urgent' || i.priority === 'high').length;
  const activeBoardsCount = recentBoards.length;

  const filteredItems = myWorkItems.filter((item) => {
    if (filterPriority === 'all') return true;
    return item.priority === filterPriority;
  });

  const statusOptions: MyWorkItem['status'][] = [
    'Working on it',
    'Stuck',
    'Done',
    'Pending',
    'In Review',
  ];

  const handleCreateNewBoard = () => {
    const name = prompt('Enter new board title:');
    if (name?.trim()) {
      createBoard(name.trim(), '🎯', 'Created from My Work dashboard');
    }
  };

  return (
    <div className="mywork-container animate-fade-in" id="mywork-dashboard">
      {/* 1. Hero / Header Greeting */}
      <section className="mywork-hero">
        <div className="hero-text-col">
          <div className="hero-badge">
            <Sparkles size={14} className="text-primary" />
            <span>Workspace Operations Hub</span>
          </div>
          <h1>Good day, {currentUser?.full_name?.split(' ')[0] || 'Team Lead'} 👋</h1>
          <p className="hero-subtext">
            Here is your daily snapshot for <strong>{currentWorkspace?.name}</strong>. Track high-velocity deliverables, assigned tasks, and active boards.
          </p>
        </div>

        <div className="hero-actions">
          <button
            id="hero-create-board-btn"
            type="button"
            className="btn btn-primary"
            onClick={handleCreateNewBoard}
          >
            <Plus size={16} />
            <span>Create Board</span>
          </button>
          <button
            id="hero-invite-btn"
            type="button"
            className="btn btn-secondary"
            onClick={() => setWorkspaceSettingsOpen(true, 'members')}
          >
            <Users size={16} />
            <span>Invite Team</span>
          </button>
        </div>
      </section>

      {/* 2. Key Metrics Bar */}
      <section className="metrics-grid" id="metrics-summary-cards">
        <div className="metric-card glass-panel" id="metric-assigned">
          <div className="metric-top">
            <span className="metric-title">Assigned to Me</span>
            <div className="metric-icon-box bg-primary-glow">
              <Kanban size={18} className="text-primary" />
            </div>
          </div>
          <div className="metric-value">{totalAssigned}</div>
          <span className="metric-trend text-muted text-xs">Across all workspace boards</span>
        </div>

        <div className="metric-card glass-panel" id="metric-high-priority">
          <div className="metric-top">
            <span className="metric-title">Urgent / High Priority</span>
            <div className="metric-icon-box bg-danger-glow">
              <AlertCircle size={18} className="text-danger" />
            </div>
          </div>
          <div className="metric-value" style={{ color: '#ef4444' }}>{urgentCount}</div>
          <span className="metric-trend text-muted text-xs">Requires attention today</span>
        </div>

        <div className="metric-card glass-panel" id="metric-completed">
          <div className="metric-top">
            <span className="metric-title">Completed Tasks</span>
            <div className="metric-icon-box bg-success-glow">
              <CheckCircle2 size={18} className="text-success" />
            </div>
          </div>
          <div className="metric-value" style={{ color: '#10b981' }}>{completedCount}</div>
          <span className="metric-trend text-muted text-xs">{Math.round((completedCount / (totalAssigned || 1)) * 100)}% completion rate</span>
        </div>

        <div className="metric-card glass-panel" id="metric-active-boards">
          <div className="metric-top">
            <span className="metric-title">Active Boards</span>
            <div className="metric-icon-box bg-info-glow">
              <Layers size={18} className="text-info" />
            </div>
          </div>
          <div className="metric-value">{activeBoardsCount}</div>
          <span className="metric-trend text-muted text-xs">{currentWorkspace?.name}</span>
        </div>
      </section>

      {/* 3. Main Tabs: "Assigned to Me" & "Recently Visited Boards" */}
      <section className="content-section glass-panel">
        <div className="section-tabs-bar">
          <div className="tabs-left">
            <button
              id="tab-assigned-items"
              type="button"
              className={`section-tab ${activeTab === 'assigned' ? 'active' : ''}`}
              onClick={() => setActiveTab('assigned')}
            >
              <span>Assigned to Me</span>
              <span className="tab-pill">{filteredItems.length}</span>
            </button>
            <button
              id="tab-recent-boards"
              type="button"
              className={`section-tab ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              <span>Recently Visited Boards</span>
              <span className="tab-pill">{recentBoards.length}</span>
            </button>
          </div>

          {activeTab === 'assigned' && (
            <div className="filter-tools">
              <Filter size={14} className="text-muted" />
              <select
                id="filter-priority-select"
                className="filter-select"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: Assigned to Me List */}
        {activeTab === 'assigned' && (
          <div className="items-view-wrapper" id="assigned-items-list">
            {filteredItems.length === 0 ? (
              <div className="empty-state-card" id="empty-tasks-state">
                <div className="empty-illustration">
                  <Kanban size={48} className="text-muted" />
                </div>
                <h3>No items assigned yet</h3>
                <p>You have zero outstanding tasks matching your filter criteria.</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFilterPriority('all')}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="items-table">
                <div className="table-header-row">
                  <div className="col-task">TASK & BOARD</div>
                  <div className="col-status">STATUS</div>
                  <div className="col-priority">PRIORITY</div>
                  <div className="col-due">DUE DATE</div>
                </div>

                {filteredItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="table-item-row"
                    id={`work-item-${item.id}`}
                  >
                    <div className="col-task">
                      <div className="item-title-group">
                        <span className="item-title">{item.title}</span>
                        <span className="board-sub-pill">
                          <Layers size={11} />
                          {item.board_name}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Status Selector */}
                    <div className="col-status">
                      <div className="status-dropdown-wrap">
                        <button
                          type="button"
                          className="status-chip-btn"
                          id={`status-chip-${item.id}`}
                          style={{ 
                            backgroundColor: `${item.status_color}20`, 
                            borderColor: `${item.status_color}50`,
                            color: item.status_color 
                          }}
                          onClick={() => setActiveStatusMenuId(activeStatusMenuId === item.id ? null : item.id)}
                        >
                          <span className="status-dot" style={{ backgroundColor: item.status_color }} />
                          <span>{item.status}</span>
                          <ChevronDown size={12} />
                        </button>

                        {activeStatusMenuId === item.id && (
                          <div className="status-menu glass-panel animate-pop-in" id={`status-menu-${item.id}`}>
                            {statusOptions.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                className={`status-menu-option ${item.status === opt ? 'active' : ''}`}
                                onClick={() => {
                                  updateWorkItemStatus(item.id, opt);
                                  setActiveStatusMenuId(null);
                                }}
                              >
                                <span>{opt}</span>
                                {item.status === opt && <Check size={12} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-priority">
                      <span className={`badge badge-${item.priority}`} id={`badge-${item.id}`}>
                        {item.priority}
                      </span>
                    </div>

                    <div className="col-due">
                      <div className={`due-date-pill ${item.is_overdue ? 'overdue' : ''}`}>
                        <Calendar size={13} />
                        <span>{item.due_date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Recently Visited Boards */}
        {activeTab === 'recent' && (
          <div className="boards-grid-wrapper" id="recent-boards-grid">
            {recentBoards.length === 0 ? (
              <div className="empty-state-card" id="empty-boards-state">
                <div className="empty-illustration">
                  <Layers size={48} className="text-muted" />
                </div>
                <h3>No boards created yet</h3>
                <p>Create your first board or start with a pre-configured template.</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleCreateNewBoard}
                >
                  <Plus size={14} />
                  <span>Create First Board</span>
                </button>
              </div>
            ) : (
              <div className="boards-cards-grid">
                {recentBoards.map((board) => (
                  <div
                    key={board.id}
                    className="board-card glass-panel"
                    id={`board-card-${board.id}`}
                    onClick={() => alert(`Launching board: "${board.name}"`)}
                  >
                    <div className="board-card-header">
                      <span className="board-card-emoji">{board.icon_emoji}</span>
                      <ExternalLink size={16} className="board-link-icon" />
                    </div>

                    <h4 className="board-card-name">{board.name}</h4>
                    <p className="board-card-desc">{board.description}</p>

                    <div className="board-card-footer">
                      <span className="item-count-badge">{board.item_count} items</span>
                      <div className="avatar-stack">
                        {board.member_avatars.map((av, idx) => (
                          <img
                            key={idx}
                            src={av}
                            alt="Member avatar"
                            className="stacked-avatar"
                            style={{ zIndex: 10 - idx }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Create Board Quick Card */}
                <div 
                  className="board-card-new" 
                  id="board-card-add-new"
                  onClick={handleCreateNewBoard}
                >
                  <div className="plus-circle">
                    <Plus size={22} />
                  </div>
                  <h4>Create New Board</h4>
                  <p>Start tracking a new feature, sprint, or workflow</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <style jsx>{`
        .mywork-container {
          padding: 32px;
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* Hero */
        .mywork-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          flex-wrap: wrap;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          background: var(--primary-glow);
          color: var(--primary-light);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .hero-text-col h1 {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .hero-subtext {
          font-size: 14px;
          color: var(--text-secondary);
          max-width: 620px;
        }

        .hero-actions {
          display: flex;
          gap: 12px;
        }

        /* Metrics */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 18px;
        }

        .metric-card {
          padding: 20px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: transform var(--transition-fast);
        }
        .metric-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-highlight);
        }

        .metric-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metric-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .metric-icon-box {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bg-primary-glow { background: var(--primary-glow); }
        .bg-danger-glow { background: var(--danger-bg); }
        .bg-success-glow { background: var(--success-bg); }
        .bg-info-glow { background: var(--info-bg); }

        .metric-value {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-primary);
        }

        /* Content Section */
        .content-section {
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .section-tabs-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-subtle);
        }

        .tabs-left {
          display: flex;
          gap: 12px;
        }

        .section-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .section-tab:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        .section-tab.active {
          color: var(--primary-light);
          background: var(--bg-elevated);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }

        .tab-pill {
          font-size: 11px;
          padding: 1px 7px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
        }

        .filter-tools {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-select {
          padding: 6px 12px;
          border-radius: 8px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          font-size: 12px;
        }

        /* Items Table */
        .items-table {
          display: flex;
          flex-direction: column;
        }

        .table-header-row {
          display: grid;
          grid-template-columns: 2.5fr 1.2fr 1fr 1.2fr;
          padding: 12px 24px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-subtle);
        }

        .table-item-row {
          display: grid;
          grid-template-columns: 2.5fr 1.2fr 1fr 1.2fr;
          align-items: center;
          padding: 14px 24px;
          border-bottom: 1px solid var(--border-subtle);
          transition: background var(--transition-fast);
        }
        .table-item-row:hover {
          background: var(--bg-hover);
        }

        .item-title-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .item-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .board-sub-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .status-dropdown-wrap {
          position: relative;
        }

        .status-chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .status-chip-btn:hover {
          filter: brightness(1.15);
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .status-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          width: 160px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          padding: 6px;
          z-index: 100;
        }

        .status-menu-option {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          text-align: left;
        }
        .status-menu-option:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .status-menu-option.active {
          color: var(--primary-light);
          font-weight: 600;
        }

        .due-date-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .due-date-pill.overdue {
          color: var(--danger);
          font-weight: 600;
        }

        /* Boards Grid */
        .boards-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          padding: 24px;
        }

        .board-card {
          padding: 22px;
          border-radius: 14px;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          flex-direction: column;
        }
        .board-card:hover {
          transform: translateY(-3px);
          border-color: var(--border-highlight);
          box-shadow: var(--shadow-md);
        }

        .board-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .board-card-emoji {
          font-size: 26px;
          padding: 8px;
          background: var(--bg-subtle);
          border-radius: 10px;
          border: 1px solid var(--border-subtle);
        }

        :global(.board-link-icon) {
          color: var(--text-muted);
          transition: color var(--transition-fast);
        }
        .board-card:hover :global(.board-link-icon) {
          color: var(--primary-light);
        }

        .board-card-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .board-card-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 18px;
          flex: 1;
        }

        .board-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 14px;
          border-top: 1px solid var(--border-subtle);
        }

        .item-count-badge {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .avatar-stack {
          display: flex;
        }

        .stacked-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2px solid var(--bg-surface);
          margin-left: -8px;
          object-fit: cover;
        }
        .stacked-avatar:first-child {
          margin-left: 0;
        }

        /* New Board Action Card */
        .board-card-new {
          border: 2px dashed var(--border-default);
          border-radius: 14px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          min-height: 200px;
        }
        .board-card-new:hover {
          border-color: var(--primary);
          background: rgba(99, 102, 241, 0.04);
        }

        .plus-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--bg-elevated);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-light);
          margin-bottom: 12px;
        }

        .board-card-new h4 {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .board-card-new p {
          font-size: 12px;
          color: var(--text-muted);
          max-width: 200px;
        }

        /* Empty State */
        .empty-state-card {
          padding: 48px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }

        .empty-illustration {
          padding: 16px;
          background: var(--bg-subtle);
          border-radius: 50%;
        }

        .empty-state-card h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .empty-state-card p {
          font-size: 13px;
          color: var(--text-secondary);
          max-width: 320px;
        }
      `}</style>
    </div>
  );
};
