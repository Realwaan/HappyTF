'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { BoardItem, ViewMode } from '../../types';
import { isDeployed } from '@/lib/environment';
import { playClickSound, playTransitionSound, playCompleteSound } from '../../lib/soundFx';
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
  X,
  Bot,
  Zap,
  BarChart3,
  WifiOff,
  Inbox,
  Download
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
import { IntakeShareModal } from './IntakeShareModal';
import { DataExportModal } from './DataExportModal';
import { KanbanBoard } from './KanbanBoard';

export const BoardView: React.FC = () => {
  const { 
    currentWorkspace,
    activeBoardId,
    activeBoard, 
    joinBoard,
    boardGroups, 
    boardItems, 
    openItemDetail, 
    addBoardItem, 
    updateBoardItem, 
    toggleGroupCollapse, 
    navigateToHome,
    setDiscordModalOpen,
    setAutomationModalOpen,
    automationRules,
    setColumnarModalOpen,
    setAiCopilotOpen,
    isOffline,
    offlinePendingCount,
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
    setQuickTaskOpen,
  } = useApp();

  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [isIntakeShareOpen, setIntakeShareOpen] = useState(false);
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);
  const autoJoinAttemptedRef = useRef(false);

  useEffect(() => {
    if (!activeBoard && typeof window !== 'undefined' && !autoJoinAttemptedRef.current) {
      const params = new URLSearchParams(window.location.search);
      const joinId = params.get('join_board') || activeBoardId;
      if (joinId) {
        autoJoinAttemptedRef.current = true;
        setIsAutoJoining(true);
        joinBoard(joinId, {
          role: params.get('role') || undefined,
          inviter: params.get('inviter') || undefined,
          boardName: params.get('board_name') || undefined,
          workspaceName: params.get('ws_name') || undefined,
          workspaceId: params.get('ws_id') || undefined,
        }).finally(() => {
          setIsAutoJoining(false);
        });
      }
    }
  }, [activeBoard, activeBoardId, joinBoard]);

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
  const [expandedSubItems, setExpandedSubItems] = useState<Record<string, boolean>>(
    isDeployed() ? {} : { 'item-tk-1': true }
  );

  const [isPresencePopoverOpen, setIsPresencePopoverOpen] = useState(false);
  const presencePopoverRef = useRef<HTMLDivElement>(null);

  const focusedTeammatesByItem = useMemo(() => {
    const map = new Map<string, (typeof onlineUsers)[0]>();
    onlineUsers.forEach((u) => {
      if (u.activeItemId && u.id !== currentUser?.id) {
        map.set(u.activeItemId, u);
      }
    });
    return map;
  }, [onlineUsers, currentUser?.id]);

  const toggleSubItemExpand = (itemId: string) => {
    setExpandedSubItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeInlineStatusId && !target.closest('.dropdown-popover') && !target.closest('.status-badge')) {
        setActiveInlineStatusId(null);
      }
      if (presencePopoverRef.current && !presencePopoverRef.current.contains(target as Node) && !target.closest('#collaborator-avatar-stack') && !target.closest('#realtime-status-pill')) {
        setIsPresencePopoverOpen(false);
      }
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, [activeInlineStatusId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        setExportModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddInlineItem = (groupId: string) => {
    const title = (newRowTitle[groupId] || '').trim();
    if (!title) return;
    addBoardItem(groupId, title);
    setNewRowTitle((prev) => ({ ...prev, [groupId]: '' }));
  };

  const handleLoadSprintTemplate = () => {
    playTransitionSound();
    const primaryGroupId = boardGroups[0]?.id || 'group-1';
    const templateTasks = [
      'Set up Supabase Row-Level Security policies',
      'Implement OCC v2 with monotonic versioning',
      'Configure Upstash Redis rate limiting buffer',
      'Verify GitHub PR HMAC SHA-256 transitions',
    ];
    templateTasks.forEach((title, idx) => {
      setTimeout(() => {
        addBoardItem(primaryGroupId, title);
        if (idx === templateTasks.length - 1) {
          playCompleteSound();
        }
      }, idx * 100);
    });
  };

  if (!activeBoard) {
    const isJoinUrl = typeof window !== 'undefined' && Boolean(new URLSearchParams(window.location.search).get('join_board'));
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const inviterName = urlParams?.get('inviter') || 'A team member';
    const role = urlParams?.get('role') || 'member';
    const targetBoardId = urlParams?.get('join_board') || activeBoardId;

    if (isAutoJoining || isJoinUrl) {
      return (
        <div className="board-not-found animate-fade-in" style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
          <div style={{
            background: 'var(--bg-surface, #1e222d)',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            borderRadius: 16,
            padding: '36px 28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
            }}>
              🤝
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary, #f8fafc)' }}>
                Joining Collaborative Board
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary, #94a3b8)', margin: 0 }}>
                <strong>{inviterName}</strong> invited you to collaborate as a <strong>{role}</strong>.
              </p>
            </div>

            {isAutoJoining ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-primary, #6366f1)', fontSize: 13, marginTop: 12 }}>
                <span className="animate-spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
                <span>Syncing board workspace & permissions...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (targetBoardId) {
                      setIsAutoJoining(true);
                      joinBoard(targetBoardId, {
                        role: role,
                        inviter: inviterName,
                        boardName: urlParams?.get('board_name') || undefined,
                        workspaceName: urlParams?.get('ws_name') || undefined,
                        workspaceId: urlParams?.get('ws_id') || undefined,
                      }).finally(() => setIsAutoJoining(false));
                    }
                  }}
                >
                  Enter Board
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={navigateToHome}>
                  Back to My Work
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="board-not-found animate-fade-in">
        <h3>Board not found</h3>
        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: 13, margin: '8px 0 16px' }}>
          This board may have been removed or you may need an invite link.
        </p>
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
    if (item.external_source === 'discord' || item.discord_thread_id || item.discord_channel_id) {
      return (
        <span 
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#5865F2]/20 text-[#8ea1e1] border border-[#5865F2]/40"
          title={`CapStoneFlow Thread: ${item.discord_channel_id || 'active'}`}
        >
          <Bot size={11} className="text-[#5865F2]" />
          <span>{item.discord_channel_id ? `#${item.discord_channel_id}` : 'Discord'}</span>
        </span>
      );
    }
    if (item.external_source === 'slack' || item.slack_channel_id) {
      return (
        <span 
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#5865F2]/20 text-[#8ea1e1] border border-[#5865F2]/40"
          title="Synced via Discord Bot"
        >
          <Bot size={11} className="text-[#5865F2]" />
          <span>Discord</span>
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
              id="realtime-status-pill"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono cursor-pointer hover:bg-emerald-500/20 transition-colors"
              title="Click to view live collaborators"
              onClick={() => setIsPresencePopoverOpen((prev) => !prev)}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isRealtimeConnected || onlineUsers.length > 0 ? `${Math.max(1, onlineUsers.length)} Online` : 'Sync Ready'}</span>
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
              id="open-discord-integration-btn"
              type="button"
              className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              onClick={() => setDiscordModalOpen(true)}
              title="Configure CapStoneFlow Discord Bot and slash commands"
            >
              <Bot size={13} className="text-[#5865F2]" />
              <span>CapStoneFlow Bot</span>
            </button>

            <button
              id="open-automations-modal-btn"
              type="button"
              className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              onClick={() => setAutomationModalOpen(true)}
              title="Configure IFTTT Automations & Workflow Triggers"
            >
              <Zap size={13} className="text-amber-400" />
              <span>Automate</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                {automationRules.filter((r) => r.enabled).length}
              </span>
            </button>

            <button
              id="open-columnar-analytics-btn"
              type="button"
              className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              onClick={() => setColumnarModalOpen(true)}
              title="Enterprise Columnar Analytics & WASM Benchmark Engine"
            >
              <BarChart3 size={13} className="text-indigo-400" />
              <span>Analytics</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                WASM
              </span>
            </button>

            <button
              id="open-ai-copilot-btn"
              type="button"
              className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              onClick={() => setAiCopilotOpen(true)}
              title="AI Sprint Copilot & Smart Spec Generator (⌘J)"
            >
              <Sparkles size={13} className="text-emerald-400" />
              <span>AI Copilot</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                ⌘J
              </span>
            </button>

            <button
              id="open-intake-share-btn"
              type="button"
              className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              onClick={() => setIntakeShareOpen(true)}
              title="Share Public Intake Portal & Bug Form"
            >
              <Inbox size={13} className="text-cyan-400" />
              <span>Intake Portal</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                Public
              </span>
            </button>

            <button
              id="open-export-modal-btn"
              type="button"
              className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              onClick={() => setExportModalOpen(true)}
              title="Export Board Data, CSV Import & Audit Vault"
            >
              <Download size={13} className="text-emerald-400" />
              <span>Export</span>
            </button>

            {isOffline && (
              <div 
                id="offline-status-pill"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono"
                title="Working offline. Task changes are cached in IndexedDB."
              >
                <WifiOff size={12} />
                <span>Offline{offlinePendingCount > 0 ? ` (${offlinePendingCount})` : ''}</span>
              </div>
            )}

            {/* Realtime Active Collaborators Avatar Stack */}
            <div 
              id="collaborator-avatar-stack"
              className="avatar-stack flex items-center cursor-pointer ml-1 relative"
              onClick={() => setIsPresencePopoverOpen((prev) => !prev)}
              title="Active collaborators (click to view details)"
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
                activeBoard.member_avatars?.map((av, i) => (
                  <img key={i} src={getSafeAvatar(av)} alt={`Collaborator ${i + 1}`} className="stacked-avatar" style={{ zIndex: 10 - i }} />
                ))
              )}

              {/* Live Collaborator Presence Popover */}
              {isPresencePopoverOpen && (
                <div 
                  className="collaborator-presence-popover glass-panel animate-pop-in"
                  id="collaborator-presence-popover"
                  ref={presencePopoverRef}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="presence-popover-header">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <h4 className="presence-popover-title">Active Collaborators ({onlineUsers.length})</h4>
                    </div>
                    <button 
                      type="button" 
                      className="presence-close-btn"
                      onClick={() => setIsPresencePopoverOpen(false)}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="presence-users-list">
                    {onlineUsers.map((user) => (
                      <div key={user.id} className="presence-user-row">
                        <div className="presence-avatar-wrap">
                          <img 
                            src={getSafeAvatar(user.avatar, user.name)} 
                            alt={user.name} 
                            className="presence-avatar" 
                            style={{ borderColor: user.color || '#3ecf8e' }}
                          />
                          <span className="presence-dot" style={{ backgroundColor: user.color || '#3ecf8e' }} />
                        </div>
                        <div className="presence-info-col">
                          <div className="presence-name-row">
                            <span className="presence-user-name">{user.name}</span>
                            <span className="presence-user-role font-mono">{user.role}</span>
                          </div>
                          {user.activeItemId ? (
                            <div className="presence-focus-row">
                              <Eye size={11} className="text-emerald-400" />
                              <span className="presence-focus-text truncate">
                                Viewing: {user.activeItemTitle || user.activeItemId}
                              </span>
                            </div>
                          ) : (
                            <span className="presence-idle-text font-mono">● Active on board</span>
                          )}
                        </div>

                        {user.activeItemId && (
                          <button
                            type="button"
                            className="presence-inspect-btn"
                            onClick={() => {
                              const target = boardItems.find((i) => i.id === user.activeItemId);
                              if (target) {
                                openItemDetail(target);
                                setIsPresencePopoverOpen(false);
                              }
                            }}
                            title="Inspect teammate active task"
                          >
                            <Eye size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="presence-popover-footer">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm w-full flex items-center justify-center gap-1.5"
                      onClick={() => {
                        setIsPresencePopoverOpen(false);
                        setInviteModalOpen(true);
                      }}
                    >
                      <UserPlus size={13} />
                      <span>Invite Collaborators</span>
                    </button>
                  </div>
                </div>
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
            {/* Rich Empty States */}
            {boardItems.length === 0 && (
              <div className="empty-state-card glass-panel animate-fade-in" id="board-zero-items-state">
                <div className="empty-state-icon-wrap sprint-glow">
                  <Sparkles size={28} className="text-emerald-400" />
                </div>
                <h3 className="empty-state-title">Your Sprint Board is Ready</h3>
                <p className="empty-state-desc">
                  Start assigning tasks with OCC v2 collision protection, SLA tracking, and GitHub auto-transitions.
                </p>
                <div className="empty-state-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                    onClick={() => {
                      playClickSound();
                      setQuickTaskOpen(true);
                    }}
                  >
                    <Plus size={14} /> Add First Task
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                    onClick={handleLoadSprintTemplate}
                  >
                    <Sparkles size={14} /> Load Sprint Template
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                    onClick={() => {
                      playClickSound();
                      setInviteModalOpen(true);
                    }}
                  >
                    <Users size={14} /> Invite Teammates
                  </button>
                </div>
              </div>
            )}

            {boardItems.length > 0 && filteredItems.length === 0 && (
              <div className="empty-state-card glass-panel animate-fade-in" id="board-filter-empty-state">
                <div className="empty-state-icon-wrap filter-glow">
                  <Search size={28} className="text-indigo-400" />
                </div>
                <h3 className="empty-state-title">No matching tasks found</h3>
                <p className="empty-state-desc">
                  No items match your active filters {searchQuery ? `"${searchQuery}"` : ''} 
                  {searchQuery && statusFilter !== 'all' ? ' with status ' : ''}
                  {statusFilter !== 'all' ? `"${statusFilter}"` : ''}.
                </p>
                <div className="empty-state-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm flex items-center gap-1.5"
                    onClick={() => {
                      playClickSound();
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    <X size={14} /> Clear Active Filters
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                    onClick={() => {
                      playClickSound();
                      setQuickTaskOpen(true);
                    }}
                  >
                    <Plus size={14} /> Quick Create Task
                  </button>
                </div>
              </div>
            )}

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
                      <div className="table-header-grid">
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

                          const activeViewer = focusedTeammatesByItem.get(item.id);

                          return (
                            <div key={item.id} className="flex flex-col border-b border-slate-800/60">
                              <div
                                className="table-row"
                                style={{ 
                                  zIndex: isRowActive ? 70 : 1,
                                  position: 'relative',
                                  borderLeft: activeViewer ? `3px solid ${activeViewer.color}` : undefined,
                                  backgroundColor: activeViewer ? `${activeViewer.color}0a` : undefined,
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
                                  {activeViewer && (
                                    <span 
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 animate-pulse"
                                      style={{ borderColor: `${activeViewer.color}60`, backgroundColor: `${activeViewer.color}20`, color: activeViewer.color }}
                                      title={`${activeViewer.name} (${activeViewer.role}) is viewing this item`}
                                    >
                                      <img src={getSafeAvatar(activeViewer.avatar, activeViewer.name)} alt={activeViewer.name} className="w-3.5 h-3.5 rounded-full object-cover" />
                                      <span>{activeViewer.name.split(' ')[0]} viewing</span>
                                    </span>
                                  )}
                                </div>

                                <div className="mobile-columns-wrap">
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
                                                if (s.label === 'Done') {
                                                  playCompleteSound();
                                                } else {
                                                  playTransitionSound();
                                                }
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
                                    {item.assignee?.id !== currentUser?.id ? (
                                      <button
                                        type="button"
                                        className="btn-claim"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          playClickSound();
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
          <KanbanBoard
            statusOptions={statusOptions}
            filteredItems={filteredItems}
            currentUser={currentUser}
            focusedTeammatesByItem={focusedTeammatesByItem}
            onUpdateItem={updateBoardItem}
            onOpenDetail={openItemDetail}
            onClaimItem={claimBoardItem}
            onAddItem={addBoardItem}
            boardGroups={boardGroups}
          />
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

      {/* Public Intake Portal Sharing Modal */}
      <IntakeShareModal
        isOpen={isIntakeShareOpen}
        onClose={() => setIntakeShareOpen(false)}
        boardId={activeBoard.id}
        boardTitle={activeBoard.name}
        workspaceName={currentWorkspace?.name}
      />

      {/* Enterprise Data Export, CSV Importer & Audit Vault */}
      <DataExportModal
        isOpen={isExportModalOpen}
        onClose={() => setExportModalOpen(false)}
        board={activeBoard}
        groups={boardGroups}
        items={boardItems}
        onImportItems={(newItems) => {
          newItems.forEach((item) => {
            addBoardItem(item.group_id, item.title, {
              status: item.status,
              priority: item.priority,
              due_date: item.due_date,
              start_date: item.start_date,
              assignee: item.assignee,
              tags: item.tags,
              description: item.description,
            });
          });
        }}
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

        .collaborator-presence-popover {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 330px;
          border-radius: 14px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.7);
          z-index: 1000;
          overflow: hidden;
        }

        .presence-popover-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-subtle);
        }

        .presence-popover-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .presence-close-btn {
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 2px;
        }

        .presence-users-list {
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 280px;
          overflow-y: auto;
        }

        .presence-user-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle);
        }

        .presence-avatar-wrap {
          position: relative;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }

        .presence-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid var(--border-subtle);
        }

        .presence-dot {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          border: 1.5px solid var(--bg-surface);
        }

        .presence-info-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .presence-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .presence-user-name {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .presence-user-role {
          font-size: 10px;
          color: var(--text-muted);
        }

        .presence-focus-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .presence-focus-text {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .presence-idle-text {
          font-size: 10px;
          color: var(--primary);
        }

        .presence-inspect-btn {
          color: var(--primary);
          background: rgba(62, 207, 142, 0.1);
          border: 1px solid rgba(62, 207, 142, 0.25);
          border-radius: 6px;
          padding: 5px 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }
        .presence-inspect-btn:hover {
          background: rgba(62, 207, 142, 0.2);
        }

        .presence-popover-footer {
          padding: 10px 14px;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-subtle);
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

        .mobile-columns-wrap {
          display: contents;
        }

        .empty-state-card {
          padding: 44px 24px;
          text-align: center;
          border-radius: 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .empty-state-icon-wrap {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .empty-state-icon-wrap.sprint-glow {
          background: rgba(62, 207, 142, 0.12);
          border: 1px solid rgba(62, 207, 142, 0.3);
          box-shadow: 0 0 24px rgba(62, 207, 142, 0.2);
        }
        .empty-state-icon-wrap.filter-glow {
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.3);
          box-shadow: 0 0 24px rgba(99, 102, 241, 0.2);
        }
        .empty-state-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .empty-state-desc {
          font-size: 13px;
          color: var(--text-secondary);
          max-width: 460px;
          line-height: 1.5;
          margin: 0;
        }
        .empty-state-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 6px;
          justify-content: center;
        }

        .table-header-grid {
          display: grid;
          grid-template-columns: minmax(280px, 2fr) 140px 140px 90px 120px 80px 90px;
          min-width: 980px;
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
          grid-template-columns: minmax(280px, 2fr) 140px 140px 90px 120px 80px 90px;
          min-width: 980px;
          align-items: center;
          padding: 10px 18px;
          border-bottom: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .table-row:hover {
          background: var(--bg-hover);
        }

        @media (max-width: 768px) {
          .table-header-grid {
            display: none !important;
          }
          .table-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            min-width: 0 !important;
            width: 100% !important;
            padding: 14px 16px !important;
            gap: 10px !important;
            border-radius: 10px !important;
            margin-bottom: 8px !important;
            background: var(--bg-surface) !important;
            border: 1px solid var(--border-subtle) !important;
          }
          .col-name {
            width: 100% !important;
            padding-right: 0 !important;
          }
          .mobile-columns-wrap {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 8px !important;
            padding-top: 8px !important;
            border-top: 1px solid var(--border-subtle) !important;
            width: 100% !important;
          }
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
          transition: border-color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .kanban-column.col-drag-over {
          border-color: var(--accent-primary, #6366f1);
          background: rgba(99, 102, 241, 0.08);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25), 0 8px 24px rgba(0, 0, 0, 0.3);
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
        .kanban-card.is-dragging {
          opacity: 0.4;
          transform: scale(0.97);
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.45);
          cursor: grabbing;
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
          transition: all var(--transition-fast);
        }
        .empty-kanban-slot.empty-kanban-slot-active {
          border-color: var(--accent-primary, #6366f1);
          background: rgba(99, 102, 241, 0.1);
          color: var(--accent-primary, #6366f1);
          font-weight: 600;
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

        @media (max-width: 768px) {
          .board-view-container {
            padding: 14px 12px 28px;
            gap: 16px;
          }

          .header-top-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
          }

          .board-title {
            font-size: 20px;
          }

          .board-meta-right {
            width: 100%;
            overflow-x: auto;
            flex-wrap: nowrap !important;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 6px;
            gap: 8px;
          }
          .board-meta-right::-webkit-scrollbar {
            display: none;
          }

          .board-meta-right > button,
          .board-meta-right > div {
            flex-shrink: 0;
            white-space: nowrap;
          }

          .board-controls-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
            padding: 10px;
          }

          .view-mode-tabs {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .view-mode-tabs::-webkit-scrollbar {
            display: none;
          }

          .view-tab-btn, .view-tab {
            flex: 1;
            justify-content: center;
            padding: 8px 10px;
            white-space: nowrap;
          }

          .controls-right-group, .filters-right {
            width: 100%;
            flex-direction: column;
            gap: 8px;
          }

          .search-input-wrapper, .search-box {
            width: 100%;
          }

          .board-search-field {
            width: 100%;
            flex: 1;
          }

          .filter-select {
            width: 100%;
          }

          .collaborator-presence-popover {
            width: calc(100vw - 32px);
            right: -10px;
          }
        }
      `}</style>
    </div>
  );
};
