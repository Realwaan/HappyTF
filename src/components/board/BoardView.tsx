'use client';

import React, { useState, useEffect } from 'react';
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
  MoreHorizontal,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  MessageSquare,
  GitCommit,
  PieChart,
  CornerDownRight,
  Calculator,
  Hash,
  UserPlus,
  Users,
  Radio,
  X
} from 'lucide-react';
import { IconBadge } from '../common/IconBadge';
import { useRealtimeTickets } from '../../lib/supabase/useRealtimeTickets';
import { GitHubActivityDrawer } from './GitHubActivityDrawer';
import { 
  calculateGroupAggregation, 
  calculateBoardAggregation, 
  evaluateFormula 
} from '../../lib/mondaydb';
import { StatusBatteryBar } from './StatusBatteryBar';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { SubItemsTable } from './SubItemsTable';
import { TimelineView } from './TimelineView';
import { DashboardWidgetsView } from './DashboardWidgetsView';
import { InviteCollaboratorsModal } from './InviteCollaboratorsModal';

export const BoardView: React.FC = () => {
  const { 
    currentWorkspace,
    activeBoard, 
    boardGroups, 
    boardItems, 
    openItemDetail, 
    addBoardItem, 
    updateBoardItem, 
    toggleGroupCollapse, 
    navigateToHome,
    setSlackModalOpen,
    gitHubCommits,
    toggleGitHubFeed,
    claimBoardItem,
    currentUser,
    boardViewMode,
    setBoardViewMode,
    boardColumns,
    addSubItem,
    updateSubItem,
    deleteSubItem,
    selectedItem,
    onTicketInsert,
    onTicketUpdate,
    onTicketDelete,
    registerTicketBroadcaster,
    registerTicketBroadcasters,
  } = useApp();

  const [isInviteModalOpen, setInviteModalOpen] = useState(false);

  const { 
    isConnected: isRealtimeConnected,
    onlineUsers,
    notifications,
    dismissNotification,
    simulateCollaboratorJoin,
    simulateCollaboratorLeave,
    broadcastAction,
    broadcastTicketInsert,
    broadcastTicketUpdate,
    broadcastTicketDelete,
  } = useRealtimeTickets({
    workspaceId: currentWorkspace?.id || null,
    boardId: activeBoard?.id || null,
    currentUser,
    activeItemId: selectedItem?.id || null,
    activeItemTitle: selectedItem?.title || null,
    onTicketInsert,
    onTicketUpdate,
    onTicketDelete,
  });

  // Keep AppContext synced with the active Realtime board broadcasters
  useEffect(() => {
    if (registerTicketBroadcasters) {
      registerTicketBroadcasters({
        broadcastInsert: broadcastTicketInsert,
        broadcastUpdate: broadcastTicketUpdate,
        broadcastDelete: broadcastTicketDelete,
      });
    } else if (registerTicketBroadcaster && broadcastTicketUpdate) {
      registerTicketBroadcaster(broadcastTicketUpdate);
    }
  }, [
    registerTicketBroadcasters, 
    registerTicketBroadcaster, 
    broadcastTicketInsert, 
    broadcastTicketUpdate, 
    broadcastTicketDelete
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newRowTitle, setNewRowTitle] = useState<Record<string, string>>({});
  const [activeInlineStatusId, setActiveInlineStatusId] = useState<string | null>(null);
  const [expandedSubItems, setExpandedSubItems] = useState<Record<string, boolean>>({
    'item-tk-1': true, // Open by default for demo
  });

  const toggleSubItemExpand = (itemId: string) => {
    setExpandedSubItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  useEffect(() => {
    if (!activeInlineStatusId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-popover') && !target.closest('.status-badge')) {
        setActiveInlineStatusId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeInlineStatusId]);

  const handleAddInlineItem = (groupId: string) => {
    const title = (newRowTitle[groupId] || '').trim();
    if (!title) return;
    addBoardItem(groupId, title);
    setNewRowTitle((prev) => ({ ...prev, [groupId]: '' }));
  };

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

  // mondayDB Isomorphic Columnar Aggregations
  const boardAgg = calculateBoardAggregation(filteredItems);

  const statusOptions: { label: BoardItem['status']; color: string; icon: React.ReactNode; className: string }[] = [
    { label: 'Working on it', color: '#f59e0b', icon: <CircleDot size={13} style={{ color: '#f59e0b' }} />, className: 'working' },
    { label: 'In Review', color: '#8b5cf6', icon: <Eye size={13} style={{ color: '#8b5cf6' }} />, className: 'review' },
    { label: 'Done', color: '#10b981', icon: <CheckCircle2 size={13} style={{ color: '#10b981' }} />, className: 'done' },
    { label: 'Stuck', color: '#ef4444', icon: <AlertCircle size={13} style={{ color: '#ef4444' }} />, className: 'stuck' },
    { label: 'Pending', color: '#64748b', icon: <Clock size={13} style={{ color: '#94a3b8' }} />, className: 'pending' },
  ];

  const renderSlaPill = (item: BoardItem) => {
    if (item.status === 'Done') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={10} /> Resolved
        </span>
      );
    }
    if (item.sla_due_at) {
      const diffMs = new Date(item.sla_due_at).getTime() - Date.now();
      if (diffMs <= 0) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
            <AlertCircle size={10} /> SLA Breached
          </span>
        );
      }
      const hours = Math.round(diffMs / (1000 * 3600));
      if (hours <= 4) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock size={10} /> {hours}h SLA
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-slate-800/80 border border-slate-700/60">
          <Clock size={10} /> {hours}h SLA
        </span>
      );
    }
    return (
      <span className="font-mono text-xs text-secondary">{item.due_date}</span>
    );
  };

  const renderSourceBadge = (item: BoardItem) => {
    if (item.external_source === 'slack' || item.slack_channel_id) {
      return (
        <span 
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#4A154B]/30 text-[#ECB22E] border border-[#E01E5A]/30"
          title={`Synced via Slack: ${item.slack_channel_id || '#triage'}`}
        >
          <MessageSquare size={10} className="text-[#ECB22E]" />
          <span>{item.slack_channel_id || 'Slack'}</span>
        </span>
      );
    }
    if (item.external_source === 'monday' || item.monday_item_id) {
      return (
        <span 
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30"
          title="Synced via Monday.com webhook"
        >
          <Kanban size={10} className="text-blue-400" />
          <span>Monday</span>
        </span>
      );
    }
    return null;
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
              <div className="board-header-icon-box">
                <IconBadge nameOrEmoji={activeBoard.icon_emoji} size={20} />
              </div>
              <h1 className="board-title" id="active-board-title">{activeBoard.name}</h1>
            </div>
          </div>

          <div className="board-meta-right flex items-center gap-2.5">
            {/* Realtime Status Badge with Online Count */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono"
              title="Realtime sync status"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{isRealtimeConnected ? `${onlineUsers.length} Online` : 'Sync Ready'}</span>
            </div>

            <button
              id="open-github-feed-btn"
              type="button"
              className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              onClick={toggleGitHubFeed}
              title="View live GitHub commits & webhooks"
            >
              <GitCommit size={14} className="text-emerald-400" />
              <span>GitHub</span>
              {gitHubCommits.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                  {gitHubCommits.length}
                </span>
              )}
            </button>

            <button
              id="open-slack-integration-btn"
              type="button"
              className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              onClick={() => setSlackModalOpen(true)}
              title="Configure Slack webhooks and alerts"
            >
              <MessageSquare size={13} className="text-indigo-400" />
              <span>Slack</span>
            </button>

            {/* Realtime Active Collaborators Avatar Stack */}
            <div 
              className="avatar-stack flex items-center cursor-pointer ml-1"
              onClick={() => setInviteModalOpen(true)}
              title="Active collaborators (click to manage)"
            >
              {onlineUsers.length > 0 ? (
                onlineUsers.map((user, i) => (
                  <div key={user.id} className="stacked-avatar-wrapper" style={{ zIndex: 10 - i, marginLeft: i > 0 ? '-8px' : 0 }}>
                    <img 
                      src={getSafeAvatar(user.avatar, user.name)} 
                      alt={user.name} 
                      className="stacked-avatar" 
                      style={{ borderColor: user.color || '#3ecf8e' }} 
                      title={`${user.name} (${user.role}) • Online`}
                    />
                    <span 
                      className="online-dot" 
                      style={{ backgroundColor: user.color || '#3ecf8e' }} 
                    />
                  </div>
                ))
              ) : (
                activeBoard.member_avatars.map((av, i) => (
                  <img key={i} src={getSafeAvatar(av)} alt={`Collaborator ${i + 1}`} className="stacked-avatar" style={{ zIndex: 10 - i }} />
                ))
              )}
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
              className={`view-tab-btn ${boardViewMode === 'table' ? 'active' : ''}`}
              onClick={() => setBoardViewMode('table')}
            >
              <Table size={14} />
              <span>Main Table</span>
            </button>
            <button
              id="view-mode-kanban-btn"
              type="button"
              className={`view-tab-btn ${boardViewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setBoardViewMode('kanban')}
            >
              <Kanban size={14} />
              <span>Kanban</span>
            </button>
            <button
              id="view-mode-timeline-btn"
              type="button"
              className={`view-tab-btn ${boardViewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setBoardViewMode('timeline')}
            >
              <Calendar size={14} />
              <span>Timeline</span>
            </button>
            <button
              id="view-mode-dashboard-btn"
              type="button"
              className={`view-tab-btn ${boardViewMode === 'dashboard' ? 'active' : ''}`}
              onClick={() => setBoardViewMode('dashboard')}
            >
              <PieChart size={14} />
              <span>Dashboards</span>
            </button>
          </div>

          <div className="controls-right-group">
            <div className="search-input-wrapper">
              <Search size={14} className="search-icon" />
              <input
                id="board-search-input"
                type="text"
                placeholder="Filter tasks by name or tag..."
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
              <option value="Working on it">Working on it</option>
              <option value="In Review">In Review</option>
              <option value="Done">Done</option>
              <option value="Stuck">Stuck</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </header>

      {/* 3. Main View Render */}
      <div className="board-content-canvas">
        {/* ================= TABLE VIEW ================= */}
        {boardViewMode === 'table' && (
          <div className="table-view" id="board-table-view">
            {boardGroups.map((group) => {
              const groupItems = filteredItems.filter((i) => i.group_id === group.id);
              const groupAgg = calculateGroupAggregation(group.id, filteredItems);
              const isGroupActive = groupItems.some((i) => i.id === activeInlineStatusId);

              return (
                <div 
                  key={group.id} 
                  className={`group-card glass-panel ${isGroupActive ? 'has-active-dropdown' : ''}`} 
                  id={`group-section-${group.id}`} 
                  style={{ 
                    marginBottom: '24px',
                    zIndex: isGroupActive ? 60 : 1,
                    position: 'relative'
                  }}
                >
                  {/* Group Header */}
                  <div className="group-header flex items-center justify-between">
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
                      {/* Column Header Grid */}
                      <div className="table-header-grid" style={{ gridTemplateColumns: 'minmax(280px, 2fr) 140px 140px 90px 120px 80px 90px' }}>
                        <div className="col-name">TASK / SUMMARY</div>
                        <div className="col-status">STATUS</div>
                        <div className="col-assignee">ASSIGNEE</div>
                        <div className="col-priority">PRIORITY</div>
                        <div className="col-sla">SLA DEADLINE</div>
                        <div className="col-pts font-mono">POINTS</div>
                        <div className="col-subtasks font-mono">SUB-ITEMS</div>
                      </div>

                      {/* Items Rows */}
                      <div className="items-rows-container">
                        {groupItems.map((item) => {
                          const ticketNumber = item.ticket_number || `#TK-${item.id.replace('item-', '').padStart(3, '0')}`;
                          const subItemsList = item.sub_items || [];
                          const subItemCount = subItemsList.length;
                          const pointsVal = item.numbers_value || 5;
                          const formulaVal = evaluateFormula('{Story Pts} * 1.5', { 'Story Pts': pointsVal });
                          const isRowActive = activeInlineStatusId === item.id;

                          return (
                            <div key={item.id} className="flex flex-col border-b border-slate-800/60">
                              <div
                                className="table-row"
                                style={{ 
                                  gridTemplateColumns: 'minmax(280px, 2fr) 140px 140px 90px 120px 80px 90px',
                                  zIndex: isRowActive ? 70 : 1,
                                  position: 'relative'
                                }}
                                id={`board-item-row-${item.id}`}
                                onClick={() => openItemDetail(item)}
                              >
                                {/* Name & Subitem Toggle */}
                                <div className="col-name flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSubItemExpand(item.id);
                                    }}
                                    title="Toggle Sub-items"
                                  >
                                    {expandedSubItems[item.id] ? (
                                      <ChevronDown size={14} className="text-emerald-400" />
                                    ) : (
                                      <ChevronRight size={14} />
                                    )}
                                  </button>
                                  <span className="issue-key-badge font-mono">
                                    {ticketNumber}
                                  </span>
                                  <span className="row-item-title truncate">{item.title}</span>
                                  {onlineUsers.filter((u) => u.activeItemId === item.id && u.id !== currentUser?.id).map((u) => (
                                    <span 
                                      key={u.id}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0"
                                      style={{ borderColor: `${u.color}50`, backgroundColor: `${u.color}15`, color: u.color }}
                                      title={`${u.name} (${u.role}) is viewing this item`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: u.color }} />
                                      <span>{u.name.split(' ')[0]}</span>
                                    </span>
                                  ))}
                                </div>

                                {/* Status Chip */}
                                <div 
                                  className="col-status" 
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    zIndex: isRowActive ? 80 : 1,
                                    position: 'relative'
                                  }}
                                >
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

                                {/* Assignee & Claim Action */}
                                <div className="col-assignee">
                                  <div className="assignee-pill">
                                    <img src={getSafeAvatar(item.assignee?.avatar, item.assignee?.name)} alt={item.assignee?.name || 'Assignee'} className="mini-avatar" />
                                    <span className="assignee-text truncate">{item.assignee?.name || 'Unassigned'}</span>
                                  </div>
                                  {item.assignee.id !== currentUser?.id ? (
                                    <button
                                      type="button"
                                      className="btn-claim"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        claimBoardItem(item.id, item.version);
                                      }}
                                      title="Claim this task for yourself"
                                    >
                                      Claim
                                    </button>
                                  ) : (
                                    <span className="you-pill font-mono">
                                      YOU
                                    </span>
                                  )}
                                </div>

                                {/* Priority */}
                                <div className="col-priority">
                                  <span className={`badge badge-${item.priority}`}>{item.priority}</span>
                                </div>

                                {/* SLA Deadline */}
                                <div className="col-sla">
                                  {renderSlaPill(item)}
                                </div>

                                {/* Story Points (Numbers Column) */}
                                <div className="col-pts font-mono text-xs text-slate-300">
                                  <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                                    {pointsVal} pts
                                  </span>
                                </div>

                                {/* Sub-items Pill */}
                                <div className="col-subtasks" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors"
                                    onClick={() => toggleSubItemExpand(item.id)}
                                  >
                                    <CornerDownRight size={10} className="text-emerald-400" />
                                    <span>{subItemCount} subs</span>
                                  </button>
                                </div>
                              </div>

                              {/* Nested SubItems Table */}
                              {expandedSubItems[item.id] && (
                                <SubItemsTable
                                  parentId={item.id}
                                  subItems={subItemsList}
                                  onAddSubItem={addSubItem}
                                  onUpdateSubItem={updateSubItem}
                                  onDeleteSubItem={deleteSubItem}
                                />
                              )}
                            </div>
                          );
                        })}

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

                      {/* Group Summary Footer */}
                      <div className="group-summary-footer">
                        <div className="footer-status-group">
                          <span className="text-xs text-muted font-mono">{groupItems.length} tasks</span>
                          <span className="text-muted">·</span>
                          <span className="text-xs text-muted font-mono">{groupAgg.numbersSum} pts</span>
                        </div>
                        {groupAgg.subItemCount > 0 && (
                          <div className="footer-metrics-group">
                            <span className="footer-metric-label">Sub-items:</span>
                            <strong className="footer-metric-emerald">{groupAgg.subItemsCompleted}/{groupAgg.subItemCount} ({groupAgg.subItemProgressPercent}%)</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Overall Board Progress Footer */}
            <div className="board-summary-footer">
              <div className="board-summary-left">
                <div className="board-battery-title">
                  <PieChart size={15} className="text-emerald-400" />
                  <span className="board-battery-label font-mono">Board Status</span>
                </div>
                <div className="board-battery-wrap">
                  <StatusBatteryBar segments={boardAgg.statusBattery} height={12} />
                </div>
              </div>
              <div className="board-metrics-right font-mono">
                <div className="board-metric-item">
                  <span className="footer-metric-label">Total:</span>
                  <strong className="footer-metric-val">{boardAgg.totalItems} tasks</strong>
                </div>
                <div className="board-metric-item">
                  <span className="footer-metric-label">Velocity:</span>
                  <strong className="footer-metric-indigo">{boardAgg.totalNumbersSum} pts</strong>
                </div>
                {boardAgg.totalSubItems > 0 && (
                  <div className="board-metric-item">
                    <span className="footer-metric-label">Sub-tasks:</span>
                    <strong className="footer-metric-emerald">{boardAgg.totalSubItemsCompleted}/{boardAgg.totalSubItems}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= KANBAN VIEW ================= */}
        {boardViewMode === 'kanban' && (
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
                    {cards.map((card) => {
                      const ticketNumber = card.ticket_number || `#TK-${card.id.replace('item-', '').padStart(3, '0')}`;
                      const subtaskCount = card.subtasks?.length || 0;
                      const completedSubtasks = card.subtasks?.filter((s) => s.completed).length || 0;

                      return (
                        <div
                          key={card.id}
                          className="kanban-card glass-panel"
                          id={`kanban-card-${card.id}`}
                          onClick={() => openItemDetail(card)}
                        >
                          <div className="card-top flex items-center justify-between gap-2">
                            <span className="issue-key-badge font-mono">
                              {ticketNumber}
                            </span>
                            <div className="flex items-center gap-1.5 ml-auto">
                              {renderSourceBadge(card)}
                              <span className={`badge badge-${card.priority}`}>{card.priority}</span>
                            </div>
                          </div>

                          <h4 className="card-title flex items-center justify-between gap-1">
                            <span className="truncate">{card.title}</span>
                            {onlineUsers.filter((u) => u.activeItemId === card.id && u.id !== currentUser?.id).map((u) => (
                              <span 
                                key={u.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border shrink-0"
                                style={{ borderColor: `${u.color}50`, backgroundColor: `${u.color}15`, color: u.color }}
                                title={`${u.name} is viewing this card`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: u.color }} />
                                <span>{u.name.split(' ')[0]}</span>
                              </span>
                            ))}
                          </h4>

                          <div className="flex items-center gap-2 my-1">
                            {renderSlaPill(card)}
                            {subtaskCount > 0 && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                                {completedSubtasks}/{subtaskCount} subtasks
                              </span>
                            )}
                          </div>

                          {card.tags.filter((t) => t.toLowerCase() !== 'ticket').length > 0 && (
                            <div className="card-tags">
                              {card.tags
                                .filter((t) => t.toLowerCase() !== 'ticket')
                                .map((t) => (
                                <span key={t} className="tag-pill">{t}</span>
                              ))}
                            </div>
                          )}

                          <div className="card-footer">
                            <div className="flex items-center gap-2">
                              <div className="card-assignee">
                                <img src={getSafeAvatar(card.assignee?.avatar, card.assignee?.name)} alt={card.assignee?.name || 'Assignee'} className="mini-avatar" />
                                <span>{card.assignee?.name ? card.assignee.name.split(' ')[0] : 'Unassigned'}</span>
                              </div>
                              {card.assignee.id !== currentUser?.id && (
                                <button
                                  type="button"
                                  className="btn-claim-subtle"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    claimBoardItem(card.id, card.version);
                                  }}
                                  title="Claim this task"
                                >
                                  Claim
                                </button>
                              )}
                            </div>
                            {card.comments.length > 0 && (
                              <span className="font-mono text-xs text-muted flex items-center gap-1">
                                <MessageSquare size={12} />
                                {card.comments.length}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

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

        {/* ================= TIMELINE / GANTT VIEW ================= */}
        {boardViewMode === 'timeline' && (
          <TimelineView
            groups={boardGroups}
            items={filteredItems}
            onSelectItem={openItemDetail}
          />
        )}

        {/* ================= DASHBOARDS VIEW ================= */}
        {boardViewMode === 'dashboard' && (
          <DashboardWidgetsView
            board={activeBoard}
            items={filteredItems}
            onSelectItem={openItemDetail}
          />
        )}
      </div>

      {/* GitHub Live Commits & Webhooks Drawer */}
      <GitHubActivityDrawer />

      {/* Realtime Collaborator Join & Activity Floating Toasts */}
      {notifications.length > 0 && (
        <div className="collaborator-toast-container" id="collaborator-toasts">
          {notifications.map((n) => (
            <div 
              key={n.id}
              className="collaborator-toast-card"
              style={{ borderLeftColor: n.userColor || 'var(--primary)' }}
            >
              <div className="toast-avatar-box">
                <img 
                  src={getSafeAvatar(n.userAvatar, n.userName)} 
                  alt={n.userName} 
                  className="toast-avatar-img" 
                  style={{ borderColor: n.userColor || 'var(--primary)' }} 
                />
                <span className="toast-live-dot" style={{ backgroundColor: n.userColor || 'var(--primary)' }} />
              </div>
              <div className="toast-content-col">
                <div className="toast-user-name">
                  <span>{n.userName}</span>
                </div>
                <div className="toast-message-text">{n.message}</div>
              </div>
              <button 
                type="button"
                onClick={() => dismissNotification(n.id)}
                className="toast-dismiss-btn"
                title="Dismiss notification"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Live Collaborators & Invite Modal */}
      <InviteCollaboratorsModal
        isOpen={isInviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onlineUsers={onlineUsers}
        onSimulateJoin={simulateCollaboratorJoin}
        onSimulateLeave={simulateCollaboratorLeave}
        onBroadcastAction={(action, msg) => broadcastAction(action, msg)}
      />

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

        .board-header-icon-box {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--primary-light);
          flex-shrink: 0;
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

        .board-meta-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .avatar-stack {
          display: flex;
          align-items: center;
        }
        .stacked-avatar-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .stacked-avatar {
          width: 28px !important;
          height: 28px !important;
          max-width: 28px !important;
          max-height: 28px !important;
          border-radius: 50% !important;
          border: 2px solid var(--bg-canvas);
          margin-left: 0;
          object-fit: cover !important;
          display: block;
        }
        .online-dot {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1.5px solid var(--bg-canvas);
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
          align-items: center;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          padding: 3px;
          gap: 4px;
        }

        .view-tab-btn, .view-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .view-tab-btn:hover, .view-tab:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .view-tab-btn.active, .view-tab.active {
          background: var(--bg-elevated);
          color: var(--text-primary);
          font-weight: 600;
          border: 1px solid var(--border-subtle);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .controls-right-group, .filters-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .search-input-wrapper, .search-box {
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
          width: 180px;
        }
        .board-search-field::placeholder {
          color: var(--text-muted);
        }

        .filter-select {
          padding: 6px 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 12px;
          cursor: pointer;
        }

        /* Table View */
        .table-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .group-card {
          border-radius: 12px;
          border: 1px solid var(--border-default);
          background: var(--bg-surface);
          position: relative;
        }

        .group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: var(--bg-subtle);
          border-bottom: 1px solid var(--border-subtle);
          border-top-left-radius: 11px;
          border-top-right-radius: 11px;
        }

        .group-collapse-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
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
          border: 1px solid var(--border-subtle);
        }

        .group-table-content {
          overflow: visible;
        }

        .table-header-grid {
          display: grid;
          grid-template-columns: minmax(280px, 1.8fr) 155px 150px 95px 115px 85px 115px 95px;
          min-width: 1090px;
          padding: 10px 18px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(0, 0, 0, 0.25);
        }

        .table-row {
          display: grid;
          grid-template-columns: minmax(280px, 1.8fr) 155px 150px 95px 115px 85px 115px 95px;
          min-width: 1090px;
          align-items: center;
          padding: 10px 18px;
          border-bottom: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .table-row:hover {
          background: var(--bg-hover);
        }

        .col-name {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding-right: 12px;
        }

        .issue-key-badge {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          flex-shrink: 0;
        }

        .row-item-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .relative {
          position: relative;
        }

        .col-status {
          display: flex;
          align-items: center;
          min-width: 0;
          position: relative;
        }

        .col-assignee {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding-right: 8px;
        }

        .assignee-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          min-width: 0;
        }

        .assignee-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .you-pill {
          font-size: 10px;
          font-weight: 700;
          color: var(--primary);
          background: rgba(62, 207, 142, 0.15);
          border: 1px solid rgba(62, 207, 142, 0.35);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .mini-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--border-default);
          flex-shrink: 0;
        }

        .tags-flex {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .dropdown-popover {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          width: 175px;
          background: #141724;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 10px;
          box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08);
          padding: 6px;
          z-index: 1000;
        }

        .dropdown-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          text-align: left;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .dropdown-option:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
        }
        .dropdown-option.active {
          background: rgba(62, 207, 142, 0.12);
          color: var(--primary);
          font-weight: 600;
        }

        .group-summary-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 18px;
          background: var(--bg-subtle);
          border-top: 1px solid var(--border-subtle);
          border-bottom-left-radius: 11px;
          border-bottom-right-radius: 11px;
          font-size: 11px;
        }

        .footer-status-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .footer-status-label {
          font-family: var(--font-mono);
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }

        .footer-battery-wrap {
          width: 200px;
        }

        .footer-metrics-group {
          display: flex;
          align-items: center;
          gap: 16px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
        }

        .footer-metric-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .footer-metric-label {
          color: var(--text-muted);
        }

        .footer-metric-val {
          color: var(--text-primary);
          font-weight: 700;
        }

        .footer-metric-indigo {
          color: #818cf8;
          font-weight: 700;
        }

        .footer-metric-emerald {
          color: #3ecf8e;
          font-weight: 700;
        }

        .btn-claim-subtle {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          padding: 2px 7px;
          border-radius: 4px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .btn-claim-subtle:hover {
          color: var(--primary);
          background: rgba(62, 207, 142, 0.1);
          border-color: rgba(62, 207, 142, 0.3);
        }

        .board-summary-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 18px;
          border-radius: 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          margin-top: 14px;
        }

        .board-summary-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .board-battery-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .board-battery-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-primary);
          letter-spacing: 0.04em;
        }

        .board-battery-wrap {
          width: 240px;
        }

        .board-metrics-right {
          display: flex;
          align-items: center;
          gap: 20px;
          font-size: 11px;
        }

        .ml-auto {
          margin-left: auto;
        }

        .add-row-container {
          display: flex;
          align-items: center;
          padding: 10px 18px;
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
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
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          align-items: flex-start;
        }

        .kanban-column {
          padding: 14px;
          border-radius: 12px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 440px;
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
          padding: 1px 7px;
          border-radius: 10px;
          background: var(--bg-elevated);
          color: var(--text-muted);
          border: 1px solid var(--border-subtle);
        }

        .cards-stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .kanban-card {
          padding: 12px 14px;
          border-radius: 8px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
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
          gap: 6px;
          flex-wrap: wrap;
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
          padding-top: 8px;
          border-top: 1px solid var(--border-subtle);
          margin-top: 2px;
        }

        .card-assignee {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .empty-kanban-slot {
          padding: 28px 16px;
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

        /* Floating Collaborator Toast Notifications */
        .collaborator-toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column-reverse;
          gap: 10px;
          pointer-events: none;
          max-width: 340px;
        }

        .collaborator-toast-card {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(18, 21, 31, 0.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-left: 3px solid var(--primary);
          border-radius: 10px;
          box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05);
          animation: toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .toast-avatar-box {
          position: relative;
          width: 30px;
          height: 30px;
          flex-shrink: 0;
        }

        .toast-avatar-img {
          width: 30px !important;
          height: 30px !important;
          min-width: 30px !important;
          min-height: 30px !important;
          max-width: 30px !important;
          max-height: 30px !important;
          border-radius: 50% !important;
          object-fit: cover !important;
          border: 1.5px solid var(--border-default);
          display: block;
        }

        .toast-live-dot {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1.5px solid rgba(18, 21, 31, 1);
        }

        .toast-content-col {
          flex: 1;
          min-width: 0;
        }

        .toast-user-name {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .toast-message-text {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.3;
          margin-top: 2px;
        }

        .toast-dismiss-btn {
          color: var(--text-muted);
          padding: 4px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
          flex-shrink: 0;
          background: transparent;
          border: none;
        }
        .toast-dismiss-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </div>
  );
};
