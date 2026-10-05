'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { BoardItem, BoardGroup, UserProfile } from '../../types';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { playClickSound, playTransitionSound, playCompleteSound } from '../../lib/soundFx';
import {
  AlertCircle,
  Clock,
  MessageSquare,
  Bot,
  Sparkles,
  Grip,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollaboratorUser {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
}

interface StatusOption {
  label: BoardItem['status'];
  color: string;
  icon: React.ReactNode;
  className: string;
}

interface KanbanBoardProps {
  statusOptions: StatusOption[];
  filteredItems: BoardItem[];
  currentUser: UserProfile | null;
  focusedTeammatesByItem: Map<string, CollaboratorUser>;
  onUpdateItem: (id: string, changes: Partial<BoardItem>, version: number) => void;
  onOpenDetail: (item: BoardItem) => void;
  onClaimItem: (id: string, version: number) => void;
  onAddItem: (groupId: string, title: string) => void;
  boardGroups: BoardGroup[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR_MAP: Partial<Record<string, string>> = {
  'Working on it': '#f59e0b',
  'In Review': '#8b5cf6',
  Done: '#10b981',
  Stuck: '#ef4444',
  Pending: '#64748b',
};

function getStatusColor(status: string): string {
  return STATUS_COLOR_MAP[status] ?? '#64748b';
}

function SlaPill({ item }: { item: BoardItem }) {
  if (item.status === 'Done' || !item.sla_due_at) return null;
  const diffMs = new Date(item.sla_due_at).getTime() - Date.now();
  if (diffMs <= 0)
    return (
      <span className="kb-sla-pill sla-breach">
        <AlertCircle size={9} /> SLA Breached
      </span>
    );
  const hours = Math.round(diffMs / 3_600_000);
  if (hours <= 4)
    return (
      <span className="kb-sla-pill sla-warn">
        <Clock size={9} /> {hours}h SLA
      </span>
    );
  return null;
}

function SourceBadge({ item }: { item: BoardItem }) {
  if (item.external_source === 'discord' || item.discord_thread_id)
    return (
      <span className="kb-source-badge discord-badge">
        <Bot size={10} /> Discord
      </span>
    );
  return null;
}

const PRIORITY_CLASS: Record<string, string> = {
  urgent: 'badge-urgent',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
};

// ─── Sortable Card ────────────────────────────────────────────────────────────

interface SortableCardProps {
  card: BoardItem;
  currentUser: UserProfile | null;
  activeViewer?: CollaboratorUser;
  onOpenDetail: (item: BoardItem) => void;
  onClaimItem: (id: string, version: number) => void;
  isDragOverlay?: boolean;
}

export function SortableCard({
  card,
  currentUser,
  activeViewer,
  onOpenDetail,
  onClaimItem,
  isDragOverlay = false,
}: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: isDragOverlay,
  });

  const baseStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragOverlay ? undefined : (transition ?? 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)'),
    opacity: isDragging ? 0 : 1,
  };

  const overlayStyle: React.CSSProperties = isDragOverlay
    ? {
        boxShadow: '0 28px 56px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(99,102,241,0.6)',
        transform: 'rotate(2deg) scale(1.04)',
        cursor: 'grabbing',
        border: '1.5px solid rgba(99,102,241,0.5)',
      }
    : activeViewer
    ? {
        borderColor: activeViewer.color,
        boxShadow: `0 0 16px ${activeViewer.color}50, inset 0 0 0 1px ${activeViewer.color}80`,
      }
    : {};

  const ticketNumber = card.ticket_number ?? `#TK-${card.id.replace('item-', '').padStart(3, '0')}`;
  const subtaskCount = card.subtasks?.length ?? 0;
  const completedSubtasks = card.subtasks?.filter((s) => s.completed).length ?? 0;
  const visibleTags = card.tags?.filter((t) => t.toLowerCase() !== 'ticket') ?? [];

  return (
    <div
      ref={setNodeRef}
      style={{ ...baseStyle, ...overlayStyle }}
      className={`kb-card ${isDragOverlay ? 'kb-card-overlay' : ''}`}
      id={`kanban-card-${card.id}`}
      onClick={() => !isDragOverlay && onOpenDetail(card)}
    >
      {/* Drag handle – only visible on hover, does not trigger card click */}
      {!isDragOverlay && (
        <button
          className="kb-drag-handle"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder or change status"
          type="button"
          aria-label="Drag card"
        >
          <Grip size={13} />
        </button>
      )}

      {/* Top row */}
      <div className="kb-card-top">
        <span className="kb-ticket-key">{ticketNumber}</span>
        <div className="kb-card-top-right">
          <SourceBadge item={card} />
          <span className={`badge ${PRIORITY_CLASS[card.priority] ?? 'badge-low'}`}>{card.priority}</span>
        </div>
      </div>

      {/* Collaborator presence ring */}
      {activeViewer && (
        <div
          className="kb-presence-pill"
          style={{
            backgroundColor: `${activeViewer.color}22`,
            color: activeViewer.color,
            border: `1px solid ${activeViewer.color}55`,
          }}
        >
          <img
            src={getSafeAvatar(activeViewer.avatar, activeViewer.name)}
            alt={activeViewer.name}
            className="kb-presence-avatar"
          />
          <span>{activeViewer.name.split(' ')[0]} is here</span>
        </div>
      )}

      {/* Title */}
      <h4 className="kb-card-title">{card.title}</h4>

      {/* SLA + subtasks meta */}
      <div className="kb-meta-row">
        <SlaPill item={card} />
        {subtaskCount > 0 && (
          <span className="kb-subtask-pill">
            {completedSubtasks}/{subtaskCount} subtasks
          </span>
        )}
      </div>

      {/* Tags */}
      {visibleTags.length > 0 && (
        <div className="kb-tags">
          {visibleTags.slice(0, 3).map((t) => (
            <span key={t} className="tag-pill">{t}</span>
          ))}
          {visibleTags.length > 3 && (
            <span className="tag-pill tag-pill-more">+{visibleTags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="kb-card-footer">
        <div className="kb-assignee-row">
          <img
            src={getSafeAvatar(card.assignee?.avatar, card.assignee?.name)}
            alt={card.assignee?.name ?? 'Unassigned'}
            className="mini-avatar"
          />
          <span className="kb-assignee-name">
            {card.assignee?.name ? card.assignee.name.split(' ')[0] : 'Unassigned'}
          </span>
          {card.assignee?.id !== currentUser?.id && (
            <button
              type="button"
              className="btn-claim-subtle"
              onClick={(e) => {
                e.stopPropagation();
                playClickSound();
                onClaimItem(card.id, card.version ?? 0);
              }}
              title="Claim this task"
            >
              Claim
            </button>
          )}
        </div>
        {(card.comments?.length ?? 0) > 0 && (
          <span className="kb-comment-count">
            <MessageSquare size={11} />
            {card.comments.length}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  colId: string;
  label: BoardItem['status'];
  color: string;
  icon: React.ReactNode;
  cards: BoardItem[];
  isOver: boolean;
  currentUser: UserProfile | null;
  focusedTeammatesByItem: Map<string, CollaboratorUser>;
  onOpenDetail: (item: BoardItem) => void;
  onClaimItem: (id: string, version: number) => void;
  completionRate: number;
}

function KanbanColumn({
  colId,
  label,
  color,
  icon,
  cards,
  isOver,
  currentUser,
  focusedTeammatesByItem,
  onOpenDetail,
  onClaimItem,
  completionRate,
}: KanbanColumnProps) {
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  return (
    <div
      className={`kb-column ${isOver ? 'kb-column-over' : ''}`}
      id={`kanban-col-${colId}`}
      style={{ '--col-color': color } as React.CSSProperties}
    >
      {/* Header */}
      <div className="kb-col-header">
        <div className="kb-col-header-left">
          <span className="kb-col-dot" style={{ backgroundColor: color }} />
          <span className="kb-col-icon">{icon}</span>
          <span className="kb-col-title">{label}</span>
          <span className="kb-col-count">{cards.length}</span>
        </div>
        <div className="kb-col-progress-wrap">
          <div
            className="kb-col-progress-fill"
            style={{ width: `${completionRate}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Sortable cards */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="kb-cards-stack" id={`kb-cards-${colId}`}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              currentUser={currentUser}
              activeViewer={focusedTeammatesByItem.get(card.id)}
              onOpenDetail={onOpenDetail}
              onClaimItem={onClaimItem}
            />
          ))}

          {/* Empty drop zone */}
          {cards.length === 0 && (
            <div className={`kb-empty-col ${isOver ? 'kb-empty-col-over' : ''}`}>
              {isOver ? (
                <>
                  <Sparkles size={16} className="kb-empty-sparkle" />
                  <span>
                    Drop here → <strong>{label}</strong>
                  </span>
                </>
              ) : (
                <>
                  <div className="kb-empty-icon-wrap" style={{ color }}>
                    {icon}
                  </div>
                  <span className="kb-empty-text">No items yet</span>
                  <span className="kb-empty-subtext">Drag a card or create a new task</span>
                </>
              )}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Main KanbanBoard ─────────────────────────────────────────────────────────

export function KanbanBoard({
  statusOptions,
  filteredItems,
  currentUser,
  focusedTeammatesByItem,
  onUpdateItem,
  onOpenDetail,
  onClaimItem,
  onAddItem,
  boardGroups,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<BoardItem | null>(null);
  const [overColLabel, setOverColLabel] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const colMap = useMemo(() => {
    const m = new Map<string, BoardItem[]>();
    statusOptions.forEach((s) => {
      m.set(s.label, filteredItems.filter((i) => i.status === s.label));
    });
    return m;
  }, [statusOptions, filteredItems]);

  const resolveColLabel = useCallback(
    (overId: string | null): string | null => {
      if (!overId) return null;
      const overCard = filteredItems.find((i) => i.id === overId);
      if (overCard) return overCard.status;
      return null;
    },
    [filteredItems]
  );

  function handleDragStart({ active }: DragStartEvent) {
    const card = filteredItems.find((i) => i.id === active.id);
    if (card) { setActiveCard(card); playClickSound(); }
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverColLabel(over ? resolveColLabel(String(over.id)) : null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null);
    setOverColLabel(null);
    if (!over || !active) return;

    const sourceCard = filteredItems.find((i) => i.id === active.id);
    if (!sourceCard) return;

    const targetCard = filteredItems.find((i) => i.id === over.id);
    const targetStatus: BoardItem['status'] | null = targetCard ? targetCard.status : null;

    if (!targetStatus || targetStatus === sourceCard.status) return;

    if (targetStatus === 'Done') playCompleteSound();
    else playTransitionSound();

    onUpdateItem(
      sourceCard.id,
      { status: targetStatus, status_color: getStatusColor(targetStatus) },
      sourceCard.version ?? 0
    );
  }

  const totalItems = filteredItems.length || 1;

  return (
    <div className="kb-root" id="board-kanban-view">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="kb-columns-grid">
          {statusOptions.map((st) => {
            const cards = colMap.get(st.label) ?? [];
            return (
              <KanbanColumn
                key={st.label}
                colId={st.className}
                label={st.label}
                color={st.color}
                icon={st.icon}
                cards={cards}
                isOver={overColLabel === st.label}
                currentUser={currentUser}
                focusedTeammatesByItem={focusedTeammatesByItem}
                onOpenDetail={onOpenDetail}
                onClaimItem={onClaimItem}
                completionRate={Math.round((cards.length / totalItems) * 100)}
              />
            );
          })}
        </div>

        <DragOverlay
          dropAnimation={{
            duration: 300,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeCard ? (
            <SortableCard
              card={activeCard}
              currentUser={currentUser}
              onOpenDetail={() => {}}
              onClaimItem={() => {}}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <style jsx>{`
        .kb-root {
          width: 100%;
          overflow-x: auto;
          padding-bottom: 24px;
        }
        .kb-columns-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(240px, 1fr));
          gap: 12px;
          min-width: 900px;
          align-items: flex-start;
        }

        /* ── Column ── */
        .kb-column {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 480px;
          transition: border-color 150ms, background 150ms, box-shadow 150ms;
          position: relative;
        }
        .kb-column::before {
          content: '';
          position: absolute;
          top: 0;
          left: 14px;
          right: 14px;
          height: 3px;
          background: var(--col-color, transparent);
          border-radius: 0 0 6px 6px;
          opacity: 0.55;
        }
        .kb-column-over {
          border-color: var(--col-color, #6366f1);
          background: color-mix(in srgb, var(--col-color, #6366f1) 8%, var(--bg-subtle, #1a1d27));
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--col-color, #6366f1) 28%, transparent), 0 10px 36px rgba(0, 0, 0, 0.3);
        }

        /* ── Column Header ── */
        .kb-col-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .kb-col-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .kb-col-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .kb-col-icon {
          display: flex;
          align-items: center;
          color: var(--col-color);
        }
        .kb-col-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
          flex: 1;
        }
        .kb-col-count {
          font-size: 11px;
          font-family: var(--font-mono);
          padding: 1px 7px;
          border-radius: 10px;
          background: var(--bg-elevated);
          color: var(--text-muted);
          border: 1px solid var(--border-subtle);
        }
        .kb-col-progress-wrap {
          height: 3px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          overflow: hidden;
        }
        .kb-col-progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 400ms cubic-bezier(0.25, 1, 0.5, 1);
          opacity: 0.65;
        }

        /* ── Cards ── */
        .kb-cards-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .kb-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 10px;
          padding: 12px 14px 10px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 7px;
          position: relative;
          transition: transform 180ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 180ms, border-color 180ms;
          user-select: none;
        }
        .kb-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-highlight);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        }
        .kb-card-overlay {
          cursor: grabbing !important;
        }
        .kb-drag-handle {
          position: absolute;
          top: 10px;
          right: 10px;
          color: var(--text-muted);
          opacity: 0;
          padding: 3px;
          border-radius: 4px;
          transition: opacity 150ms, background 150ms;
          cursor: grab;
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kb-card:hover .kb-drag-handle {
          opacity: 1;
        }
        .kb-drag-handle:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
        }
        .kb-drag-handle:active {
          cursor: grabbing;
        }
        .kb-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          flex-wrap: wrap;
        }
        .kb-ticket-key {
          font-size: 10px;
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--text-muted);
          background: var(--bg-subtle);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
          letter-spacing: 0.04em;
        }
        .kb-card-top-right {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-right: 20px;
        }
        .kb-card-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          margin: 0;
        }
        .kb-presence-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 600;
          animation: kb-pulse 2s ease-in-out infinite;
        }
        .kb-presence-avatar {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          object-fit: cover;
        }
        .kb-meta-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          min-height: 18px;
        }
        .kb-sla-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          font-family: var(--font-mono);
        }
        .sla-breach {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
          animation: kb-pulse 1.5s ease-in-out infinite;
        }
        .sla-warn {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .kb-subtask-pill {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.04);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
        }
        .kb-tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .tag-pill-more {
          color: var(--text-muted);
          background: var(--bg-elevated);
        }
        .kb-source-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 10px;
          font-family: var(--font-mono);
          font-weight: 600;
        }
        .discord-badge {
          background: rgba(88, 101, 242, 0.15);
          color: #8ea1e1;
          border: 1px solid rgba(88, 101, 242, 0.35);
        }
        .kb-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 8px;
          border-top: 1px solid var(--border-subtle);
        }
        .kb-assignee-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .kb-assignee-name {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .kb-comment-count {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        /* ── Empty state ── */
        .kb-empty-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 28px 12px;
          text-align: center;
          border: 1.5px dashed var(--border-subtle);
          border-radius: 10px;
          color: var(--text-muted);
          font-size: 12px;
          transition: all 200ms;
          min-height: 140px;
        }
        .kb-empty-col-over {
          border-color: var(--col-color, #6366f1);
          background: color-mix(in srgb, var(--col-color, #6366f1) 10%, transparent);
          color: var(--col-color, #6366f1);
          font-weight: 600;
        }
        .kb-empty-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kb-empty-text {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .kb-empty-subtext {
          font-size: 11px;
          color: var(--text-muted);
        }
        .kb-empty-sparkle {
          color: var(--col-color, #6366f1);
          animation: kb-spin 1.2s linear infinite;
        }
        @keyframes kb-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes kb-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
