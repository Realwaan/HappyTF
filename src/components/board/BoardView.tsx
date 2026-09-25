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
  } = useRealtimeTickets({
    workspaceId: currentWorkspace?.id || null,
    boardId: activeBoard?.id || null,
    currentUser,
    activeItemId: selectedItem?.id || null,
    activeItemTitle: selectedItem?.title || null,
  });

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
    return (
      <span className="text-[11px] text-slate-500 font-mono">Web OS</span>
    );
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

          <div className="board-meta-right flex items-center gap-3">
            {/* Realtime Status Badge with Online Count */}
            <button
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono cursor-pointer hover:bg-emerald-500/15 transition-all"
              onClick={() => setInviteModalOpen(true)}
              title="Click to view live presence and invite teammates"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isRealtimeConnected ? `${onlineUsers.length} Online` : 'Sync Ready'}</span>
            </button>

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
              <span>Slack & Webhooks</span>
            </button>

            {/* "+ Invite" Button to open modal */}
            <button
              id="invite-collaborators-btn"
              type="button"
              className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm hover:shadow-emerald-500/20"
              onClick={() => setInviteModalOpen(true)}
              title="Invite teammates or share join link"
            >
              <UserPlus size={13} />
              <span>+ Invite</span>
            </button>

            {/* Realtime Active Collaborators Avatar Stack */}
            <div 
              className="avatar-stack flex items-center cursor-pointer"
              onClick={() => setInviteModalOpen(true)}
              title="Click to view active online collaborators"
            >
              {onlineUsers.length > 0 ? (
                onlineUsers.map((user, i) => (
                  <div key={user.id} className="stacked-avatar-wrapper" style={{ zIndex: 10 - i, marginLeft: i > 0 ? '-8px' : 0 }}>
                    <img 
                      src={user.avatar} 
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
                  <img key={i} src={av} alt={`Collaborator ${i + 1}`} className="stacked-avatar" style={{ zIndex: 10 - i }} />
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

              return (
                <div key={group.id} className="group-card glass-panel" id={`group-section-${group.id}`} style={{ marginBottom: '24px' }}>
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
                      <div className="table-header-grid" style={{ gridTemplateColumns: 'minmax(280px, 1.8fr) 130px 140px 95px 110px 85px 120px 95px' }}>
                        <div className="col-name">TASK / SUMMARY</div>
                        <div className="col-status">STATUS</div>
                        <div className="col-assignee">ASSIGNEE</div>
                        <div className="col-priority">PRIORITY</div>
                        <div className="col-sla">SLA DEADLINE</div>
                        <div className="col-pts font-mono">POINTS</div>
                        <div className="col-formula font-mono flex items-center gap-1 text-emerald-400" title="mondayDB Formula Calculation">
                          <Calculator size={11} />
                          <span>SLA VELOCITY</span>
                        </div>
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

                          return (
                            <div key={item.id} className="flex flex-col border-b border-slate-800/60">
                              <div
                                className="table-row"
                                style={{ gridTemplateColumns: 'minmax(280px, 1.8fr) 130px 140px 95px 110px 85px 120px 95px' }}
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

                                {/* Assignee & Claim Action */}
                                <div className="col-assignee">
                                  <div className="assignee-pill">
                                    <img src={item.assignee.avatar} alt={item.assignee.name} className="mini-avatar" />
                                    <span className="assignee-text truncate">{item.assignee.name}</span>
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

                                {/* Formula Column (mondayDB) */}
                                <div className="col-formula font-mono text-xs text-emerald-400">
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px]">
                                    {formulaVal}h
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

                      {/* mondayDB Group Summary Footer */}
                      <div className="group-summary-footer p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs rounded-b-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">Group Status:</span>
                          <div className="w-52">
                            <StatusBatteryBar segments={groupAgg.statusBattery} height={14} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 font-mono text-[11px] text-slate-300">
                          <div>
                            <span className="text-slate-500 mr-1.5">Sum:</span>
                            <strong className="text-white">{groupAgg.numbersSum} pts</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 mr-1.5">Avg:</span>
                            <strong className="text-white">{groupAgg.numbersAvg} pts</strong>
                          </div>
                          {groupAgg.subItemCount > 0 && (
                            <div>
                              <span className="text-slate-500 mr-1.5">Sub-items:</span>
                              <strong className="text-emerald-400">{groupAgg.subItemsCompleted}/{groupAgg.subItemCount} ({groupAgg.subItemProgressPercent}%)</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Overall Board Battery & mondayDB Summary */}
            <div className="board-summary-footer p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-white uppercase font-mono">Overall Board Battery</span>
                </div>
                <div className="w-64">
                  <StatusBatteryBar segments={boardAgg.statusBattery} height={18} />
                </div>
              </div>
              <div className="flex items-center gap-6 font-mono text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 mr-1.5">Total Tasks:</span>
                  <strong className="text-white">{boardAgg.totalItems}</strong>
                </div>
                <div>
                  <span className="text-slate-500 mr-1.5">Total Velocity:</span>
                  <strong className="text-indigo-400">{boardAgg.totalNumbersSum} pts</strong>
                </div>
                <div>
                  <span className="text-slate-500 mr-1.5">Sub-Tasks Done:</span>
                  <strong className="text-emerald-400">{boardAgg.totalSubItemsCompleted}/{boardAgg.totalSubItems} ({boardAgg.overallProgressPercent}%)</strong>
                </div>
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
                                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: u.color }} />
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

                          {card.tags.length > 0 && (
                            <div className="card-tags">
                              {card.tags.map((t) => (
                                <span key={t} className="tag-pill">{t}</span>
                              ))}
                            </div>
                          )}

                          <div className="card-footer">
                            <div className="flex items-center gap-2">
                              <div className="card-assignee">
                                <img src={card.assignee.avatar} alt={card.assignee.name} className="mini-avatar" />
                                <span>{card.assignee.name}</span>
                              </div>
                              {card.assignee.id !== currentUser?.id && (
                                <button
                                  type="button"
                                  className="btn-claim"
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
        <div className="fixed top-20 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
          {notifications.map((n) => (
            <div 
              key={n.id}
              className="pointer-events-auto p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-3 animate-fade-in text-xs"
              style={{ borderLeft: `3px solid ${n.userColor || '#3ecf8e'}` }}
            >
              <img 
                src={n.userAvatar} 
                alt={n.userName} 
                className="w-7 h-7 rounded-full object-cover shrink-0 border" 
                style={{ borderColor: n.userColor || '#3ecf8e' }} 
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate flex items-center gap-1.5">
                  <span>{n.userName}</span>
                  <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: n.userColor || '#3ecf8e' }} />
                </div>
                <div className="text-[11px] text-slate-300 leading-tight">{n.message}</div>
              </div>
              <button 
                type="button"
                onClick={() => dismissNotification(n.id)}
                className="text-slate-400 hover:text-white p-1"
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
          overflow: hidden;
          background: var(--bg-surface);
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
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .table-header-grid {
          display: grid;
          grid-template-columns: 2.8fr 140px 180px 100px 130px 100px 90px;
          min-width: 880px;
          padding: 10px 18px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(0, 0, 0, 0.2);
        }

        .table-row {
          display: grid;
          grid-template-columns: 2.8fr 140px 180px 100px 130px 100px 90px;
          min-width: 880px;
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
          color: var(--primary);
          font-weight: 600;
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
      `}</style>
    </div>
  );
};
