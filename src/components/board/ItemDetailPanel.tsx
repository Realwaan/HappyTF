'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { getSafeAvatar } from '../../lib/avatarHelper';
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
  AlertCircle,
  Eye,
  CircleDot,
  CheckCircle2,
  CheckSquare,
  Square,
  Plus,
  Flame,
  FileText,
  Kanban,
  GitCommit,
  ShieldCheck
} from 'lucide-react';
import { BoardItem, SubTask } from '../../types';

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
    activeBoard,
    claimBoardItem,
    currentUser,
    members,
    gitHubCommits,
    recentBoards
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isSeverityOpen, setIsSeverityOpen] = useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [isDueDateEditing, setIsDueDateEditing] = useState(false);
  const [dueDateInput, setDueDateInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const isTitleFocusedRef = useRef(false);
  const isDescFocusedRef = useRef(false);
  const descDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedItem) {
      if (!isTitleFocusedRef.current) {
        setTitle(selectedItem.title);
      }
      if (!isDescFocusedRef.current) {
        setDescription(selectedItem.description || '');
      }
      setIsStatusOpen(false);
      setIsPriorityOpen(false);
      setIsSeverityOpen(false);
      setIsAssigneeOpen(false);
      setIsDueDateEditing(false);
      setDueDateInput(selectedItem.due_date || '');
      setIsAddingTag(false);
      setNewTagInput('');
      setNewSubtaskTitle('');
    }
  }, [selectedItem]);

  if (!selectedItem) return null;

  const currentGroup = boardGroups.find((g) => g.id === selectedItem.group_id);

  const statusOptions: { label: BoardItem['status']; color: string; icon: React.ReactNode; className: string }[] = [
    { label: 'Working on it', color: '#f59e0b', icon: <CircleDot size={13} style={{ color: '#f59e0b' }} />, className: 'working' },
    { label: 'In Review', color: '#8b5cf6', icon: <Eye size={13} style={{ color: '#8b5cf6' }} />, className: 'review' },
    { label: 'Done', color: '#10b981', icon: <CheckCircle2 size={13} style={{ color: '#10b981' }} />, className: 'done' },
    { label: 'Stuck', color: '#ef4444', icon: <AlertCircle size={13} style={{ color: '#ef4444' }} />, className: 'stuck' },
    { label: 'Pending', color: '#64748b', icon: <Clock size={13} style={{ color: '#94a3b8' }} />, className: 'pending' },
  ];

  const priorityOptions: BoardItem['priority'][] = ['urgent', 'high', 'medium', 'low'];
  const severityOptions: NonNullable<BoardItem['severity']>[] = ['critical', 'major', 'minor', 'cosmetic'];

  const toggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = (selectedItem.subtasks || []).map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    updateBoardItem(selectedItem.id, { subtasks: updatedSubtasks });
  };

  const handleAddSubtask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const newSubtask: SubTask = {
      id: `st-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };

    const updatedSubtasks = [...(selectedItem.subtasks || []), newSubtask];
    updateBoardItem(selectedItem.id, { subtasks: updatedSubtasks });
    setNewSubtaskTitle('');
  };

  const handleDeleteSubtask = (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedSubtasks = (selectedItem.subtasks || []).filter((st) => st.id !== subtaskId);
    updateBoardItem(selectedItem.id, { subtasks: updatedSubtasks });
  };

  const insertTemplate = (type: 'bug' | 'incident' | 'spec') => {
    let tpl = '';
    if (type === 'bug') {
      tpl = `### Problem Summary\nDescribe the defect in clear terms.\n\n### Steps to Reproduce\n1. Go to...\n2. Click on...\n3. Observe error...\n\n### Expected vs Actual\n- **Expected:** \n- **Actual:** \n`;
    } else if (type === 'incident') {
      tpl = `### Incident Triage (Severity: Critical)\n- **Impact:** \n- **Affected Customers/Components:** \n- **Immediate Workaround:** \n- **Root Cause Analysis:** \n`;
    } else {
      tpl = `### Acceptance Criteria & Verification\n- [ ] Edge cases covered\n- [ ] Unit & integration tests pass\n- [ ] Performance SLA within 200ms\n`;
    }
    const nextDesc = description ? `${description}\n\n${tpl}` : tpl;
    setDescription(nextDesc);
    updateBoardItem(selectedItem.id, { description: nextDesc });
  };

  const handleTitleBlur = () => {
    isTitleFocusedRef.current = false;
    if (selectedItem && title.trim() && title.trim() !== selectedItem.title) {
      updateBoardItem(selectedItem.id, { title: title.trim() });
    }
  };

  const handleDescriptionChange = (newVal: string) => {
    setDescription(newVal);
    if (descDebounceTimerRef.current) {
      clearTimeout(descDebounceTimerRef.current);
    }
    descDebounceTimerRef.current = setTimeout(() => {
      if (selectedItem && newVal !== selectedItem.description) {
        updateBoardItem(selectedItem.id, { description: newVal });
      }
    }, 700);
  };

  const handleDescriptionBlur = () => {
    isDescFocusedRef.current = false;
    if (descDebounceTimerRef.current) {
      clearTimeout(descDebounceTimerRef.current);
      descDebounceTimerRef.current = null;
    }
    if (selectedItem && description !== selectedItem.description) {
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
          <div className="header-left flex items-center gap-2 flex-wrap">
            <span className="issue-key-badge font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-black/40 text-emerald-400 border border-emerald-500/30">
              {selectedItem.ticket_number || `#TK-${selectedItem.id.replace('item-', '').padStart(3, '0')}`}
            </span>
            {selectedItem.sla_due_at && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Clock size={11} />
                SLA Active
              </span>
            )}
            <span 
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5"
              title={`Concurrency token: v${selectedItem.version || 1}. Guaranteed synchronized.`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              v{selectedItem.version || 1} · Synced
            </span>
            {(currentGroup?.name || recentBoards.find((b) => b.id === (selectedItem as any).board_id)?.name) && (
              <span className="group-crumb" style={{ color: currentGroup?.color || 'var(--text-muted)' }}>
                • {currentGroup?.name || recentBoards.find((b) => b.id === (selectedItem as any).board_id)?.name}
              </span>
            )}
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
            <textarea
              id="detail-item-title"
              rows={2}
              className="item-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => { isTitleFocusedRef.current = true; }}
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
                          updateBoardItem(
                            selectedItem.id, 
                            { status: s.label, status_color: s.color }
                          );
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
                          updateBoardItem(
                            selectedItem.id, 
                            { priority: p }
                          );
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

            {/* Severity Property */}
            <div className="property-row">
              <span className="property-label">Severity</span>
              <div className="property-value relative">
                <button
                  id="detail-severity-trigger"
                  type="button"
                  className={`badge ${selectedItem.severity === 'critical' ? 'badge-urgent' : 'badge-medium'}`}
                  onClick={() => setIsSeverityOpen(!isSeverityOpen)}
                >
                  {selectedItem.severity === 'critical' && <Flame size={10} className="text-red-400" />}
                  <span>{selectedItem.severity || 'minor'}</span>
                  <ChevronDown size={10} />
                </button>

                {isSeverityOpen && (
                  <div className="dropdown-popover glass-panel animate-pop-in" id="detail-severity-menu">
                    {severityOptions.map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        className={`dropdown-option ${selectedItem.severity === sev ? 'active' : ''}`}
                        onClick={() => {
                          updateBoardItem(
                            selectedItem.id,
                            { severity: sev }
                          );
                          setIsSeverityOpen(false);
                        }}
                      >
                        <span className="capitalize">{sev}</span>
                        {selectedItem.severity === sev && <Check size={14} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assignee Property */}
            <div className="property-row">
              <span className="property-label">Assignee</span>
              <div className="property-value flex items-center justify-between w-full relative">
                <button
                  type="button"
                  className="assignee-chip hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                  onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                  title="Click to reassign"
                >
                  <img
                    src={getSafeAvatar(selectedItem.assignee?.avatar, selectedItem.assignee?.name)}
                    alt={selectedItem.assignee?.name || 'Assignee'}
                    className="assignee-avatar"
                  />
                  <span>{selectedItem.assignee?.name || 'Unassigned'}</span>
                  <ChevronDown size={11} className="text-muted ml-1" />
                </button>

                {isAssigneeOpen && (
                  <div className="dropdown-popover glass-panel animate-pop-in" style={{ minWidth: 200, zIndex: 60 }}>
                    <div className="text-[10px] font-semibold text-muted px-2 py-1 uppercase tracking-wider">
                      Reassign Task
                    </div>
                    {members.map((m) => {
                      const isCurrent = (m.user_id === selectedItem.assignee?.id) || (m.profile?.full_name === selectedItem.assignee?.name);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`dropdown-option flex items-center gap-2 ${isCurrent ? 'active' : ''}`}
                          onClick={() => {
                            const newAssignee = {
                              id: m.user_id,
                              name: m.profile?.full_name || 'Member',
                              avatar: getSafeAvatar(m.profile?.avatar_url, m.profile?.full_name),
                            };
                            updateBoardItem(
                              selectedItem.id,
                              { assignee: newAssignee }
                            );
                            setIsAssigneeOpen(false);
                          }}
                        >
                          <img
                            src={getSafeAvatar(m.profile?.avatar_url, m.profile?.full_name)}
                            alt={m.profile?.full_name || 'Member'}
                            className="w-4 h-4 rounded-full"
                          />
                          <span className="text-xs truncate">{m.profile?.full_name || 'Member'}</span>
                          {isCurrent && <Check size={12} className="ml-auto text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedItem.assignee?.id !== currentUser?.id ? (
                  <button
                    type="button"
                    className="btn-claim"
                    onClick={() => claimBoardItem(selectedItem.id)}
                    title="Claim this task for yourself"
                  >
                    <ShieldCheck size={13} />
                    <span>Claim Task</span>
                  </button>
                ) : (
                  <span className="you-pill font-mono">
                    Claimed by You
                  </span>
                )}
              </div>
            </div>

            {/* Due Date & SLA Property */}
            <div className="property-row">
              <span className="property-label">Target SLA</span>
              <div className="property-value">
                {isDueDateEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      className="px-2 py-1 text-xs bg-slate-900 border border-emerald-500/50 rounded font-mono text-slate-200 outline-none w-36"
                      value={dueDateInput}
                      onChange={(e) => setDueDateInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateBoardItem(selectedItem.id, { due_date: dueDateInput.trim() || 'Next week' });
                          setIsDueDateEditing(false);
                        } else if (e.key === 'Escape') {
                          setIsDueDateEditing(false);
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      onClick={() => {
                        updateBoardItem(selectedItem.id, { due_date: dueDateInput.trim() || 'Next week' });
                        setIsDueDateEditing(false);
                      }}
                    >
                      <Check size={12} />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200"
                      onClick={() => setIsDueDateEditing(false)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="date-chip cursor-pointer hover:border-slate-600 transition-colors"
                    onClick={() => {
                      setDueDateInput(selectedItem.due_date);
                      setIsDueDateEditing(true);
                    }}
                    title="Click to edit due date"
                  >
                    <Calendar size={13} className="text-muted" />
                    <span className="font-mono text-xs">{selectedItem.due_date}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Integration Source Property */}
            {(selectedItem.external_source === 'slack' || selectedItem.slack_channel_id || selectedItem.external_source === 'monday') && (
              <div className="property-row">
                <span className="property-label">Channel Source</span>
                <div className="property-value">
                  {selectedItem.external_source === 'slack' || selectedItem.slack_channel_id ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium bg-[#4A154B]/30 text-[#ECB22E] border border-[#E01E5A]/30">
                      <MessageSquare size={12} className="text-[#ECB22E]" />
                      <span>{selectedItem.slack_channel_id || '#triage'} (Slack Thread Sync)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      <Kanban size={12} className="text-blue-400" />
                      <span>Monday.com Board Pulse</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Tags Property */}
            <div className="property-row">
              <span className="property-label">Tags</span>
              <div className="property-value tags-row flex items-center flex-wrap gap-1.5">
                {selectedItem.tags.map((tag) => (
                  <span key={tag} className="tag-pill flex items-center gap-1 group">
                    <Tag size={10} />
                    <span>{tag}</span>
                    <button
                      type="button"
                      className="opacity-60 hover:opacity-100 transition-opacity ml-0.5 text-muted hover:text-red-400"
                      onClick={() => {
                        const newTags = selectedItem.tags.filter((t) => t !== tag);
                        updateBoardItem(selectedItem.id, { tags: newTags });
                      }}
                      title={`Remove tag ${tag}`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {isAddingTag ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newTagInput.trim() && !selectedItem.tags.includes(newTagInput.trim())) {
                        const newTags = [...selectedItem.tags, newTagInput.trim()];
                        updateBoardItem(selectedItem.id, { tags: newTags });
                      }
                      setNewTagInput('');
                      setIsAddingTag(false);
                    }}
                    className="inline-flex items-center gap-1"
                  >
                    <input
                      type="text"
                      className="px-1.5 py-0.5 text-[11px] bg-slate-900 border border-slate-700 rounded font-mono text-slate-200 outline-none w-20"
                      placeholder="Tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsAddingTag(false);
                      }}
                      autoFocus
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    className="text-[11px] px-1.5 py-0.5 rounded border border-dashed border-slate-700 text-muted hover:text-slate-200 hover:border-slate-500 transition-colors flex items-center gap-1"
                    onClick={() => setIsAddingTag(true)}
                  >
                    <Plus size={10} />
                    <span>Tag</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="drawer-divider" />

          {/* Subtasks Checklist Section */}
          <div className="section-block">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} className="text-indigo-400" />
                <h4 className="section-heading mb-0">Subtasks & Acceptance Checklist</h4>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {(selectedItem.subtasks || []).filter((s) => s.completed).length}/{(selectedItem.subtasks || []).length} done
              </span>
            </div>

            <div className="space-y-1.5 my-2">
              {(selectedItem.subtasks || []).map((subtask) => (
                <div
                  key={subtask.id}
                  className="group flex items-center justify-between gap-2.5 p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 hover:border-slate-700/80 cursor-pointer transition-colors"
                  onClick={() => toggleSubtask(subtask.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {subtask.completed ? (
                      <CheckSquare size={16} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Square size={16} className="text-slate-500 flex-shrink-0" />
                    )}
                    <span className={`text-xs break-all ${subtask.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {subtask.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 rounded transition-opacity text-slate-500 flex-shrink-0"
                    onClick={(e) => handleDeleteSubtask(subtask.id, e)}
                    title="Delete checklist item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Subtask Form */}
            <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-2">
              <input
                type="text"
                className="input-field text-xs flex-1"
                placeholder="＋ Add verifiable checklist item (press Enter)..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-secondary btn-xs flex items-center gap-1"
                disabled={!newSubtaskTitle.trim()}
              >
                <Plus size={12} />
                <span>Add</span>
              </button>
            </form>
          </div>

          <div className="drawer-divider" />

          {/* Description Editor with Fast Templates */}
          <div className="section-block">
            <div className="flex items-center justify-between mb-2">
              <h4 className="section-heading mb-0">Description & Root Cause Analysis</h4>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-[11px] text-indigo-400"
                  onClick={() => insertTemplate('bug')}
                  title="Insert Bug Report Template"
                >
                  + Bug Template
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-[11px] text-amber-400"
                  onClick={() => insertTemplate('incident')}
                  title="Insert Incident Template"
                >
                  + Incident Triage
                </button>
              </div>
            </div>

            <textarea
              id="detail-item-description"
              className="description-textarea"
              placeholder="Add comprehensive specifications, incident timeline, or reproduction steps..."
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              onFocus={() => { isDescFocusedRef.current = true; }}
              onBlur={handleDescriptionBlur}
              rows={5}
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
                      <img 
                        src={getSafeAvatar(comm.author_avatar, comm.author_name)} 
                        alt={comm.author_name} 
                        className="comment-avatar"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getSafeAvatar(null, comm.author_name);
                        }}
                      />
                      <div className="comment-meta">
                        <span className="author-name font-semibold">{comm.author_name}</span>
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

          {/* Activity Timeline & Linked Commits */}
          <div className="section-block">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-muted" />
                <h4 className="section-heading mb-0">Activity History</h4>
              </div>
              {gitHubCommits.some((c) => c.linked_ticket_number && c.linked_ticket_number.toUpperCase() === (selectedItem.ticket_number || '').toUpperCase()) && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                  <GitCommit size={12} /> Linked Commits
                </span>
              )}
            </div>

            {/* Linked GitHub Commits for this ticket */}
            {gitHubCommits
              .filter((c) => c.linked_ticket_number && c.linked_ticket_number.toUpperCase() === (selectedItem.ticket_number || '').toUpperCase())
              .map((commit) => (
                <div key={commit.id} className="p-2.5 mb-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20 flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <GitCommit size={13} /> {commit.id}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{commit.timestamp}</span>
                  </div>
                  <p className="text-slate-200 text-xs">{commit.message}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                    <span>by {commit.author.name} on {commit.branch}</span>
                    <a href={commit.url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">View Commit &rarr;</a>
                  </div>
                </div>
              ))}

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
          font-size: 18px;
          font-weight: 700;
          font-family: inherit;
          color: var(--text-primary);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 6px 8px;
          transition: all var(--transition-fast);
          letter-spacing: -0.015em;
          resize: none;
          line-height: 1.4;
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
          grid-template-columns: 130px 1fr;
          align-items: center;
          gap: 12px;
          font-size: 13px;
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
