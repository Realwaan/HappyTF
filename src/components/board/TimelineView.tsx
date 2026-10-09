'use client';

import React, { useState, useMemo } from 'react';
import { BoardItem, BoardGroup } from '../../types';
import { Calendar, Zap, AlertTriangle, Link2, Unlink, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { 
  calculateCriticalPath, 
  detectDependencyCycle, 
  addDays 
} from '../../lib/timeline/criticalPathEngine';
import { useApp } from '../../context/AppContext';
import { playClickSound, playTransitionSound, playUrgentSound } from '../../lib/soundFx';

interface TimelineViewProps {
  groups: BoardGroup[];
  items: BoardItem[];
  onSelectItem: (item: BoardItem) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ groups, items, onSelectItem }) => {
  const { 
    addDependencyLink, 
    removeDependencyLink, 
    cascadeScheduleShift, 
    updateBoardItem 
  } = useApp();

  const [highlightCriticalPath, setHighlightCriticalPath] = useState(true);
  const [autoCascadeSchedule, setAutoCascadeSchedule] = useState(true);
  const [viewWindowDays, setViewWindowDays] = useState<14 | 28>(14);
  const [linkingItem, setLinkingItem] = useState<BoardItem | null>(null);

  // Compute Critical Path Method metrics
  const cpm = useMemo(() => calculateCriticalPath(items), [items]);

  // Determine timeline base date range
  const today = useMemo(() => new Date(), []);
  
  const timelineDays = useMemo(() => {
    const days: { dateStr: string; label: string; isToday: boolean; dayNum: number; date: Date }[] = [];
    const baseDate = new Date(today);
    baseDate.setHours(0, 0, 0, 0);

    for (let i = -2; i < viewWindowDays - 2; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = i === 0;
      days.push({
        dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        isToday,
        dayNum: i,
        date: d,
      });
    }
    return days;
  }, [today, viewWindowDays]);

  const startDateStr = timelineDays[0].dateStr;
  const startDateMs = new Date(startDateStr).getTime();
  const dayMs = 1000 * 60 * 60 * 24;

  // Helper to compute left percentage and width percentage for a bar
  const getBarCoordinates = (item: BoardItem) => {
    const sStr = item.start_date || timelineDays[2].dateStr; // default to today if unset
    const dStr = item.due_date || addDays(sStr, 2);

    const sMs = new Date(sStr).getTime();
    const dMs = new Date(dStr).getTime();

    const startOffsetDays = Math.max(0, (sMs - startDateMs) / dayMs);
    const durationDays = Math.max(1, Math.round((dMs - sMs) / dayMs) + 1);

    const leftPercent = Math.min(100, Math.max(0, (startOffsetDays / viewWindowDays) * 100));
    const widthPercent = Math.min(100 - leftPercent, Math.max(2.5, (durationDays / viewWindowDays) * 100));

    return { leftPercent, widthPercent, durationDays, startOffsetDays };
  };

  // Adjust date shift for an item
  const handleShiftItem = (e: React.MouseEvent, item: BoardItem, deltaDays: number) => {
    e.stopPropagation();
    playClickSound();

    if (autoCascadeSchedule) {
      const res = cascadeScheduleShift(item.id, deltaDays);
      if (res.shiftedCount > 1) {
        playTransitionSound();
      }
    } else {
      const currentStart = item.start_date || today.toISOString().split('T')[0];
      const newStart = addDays(currentStart, deltaDays);
      const newDue = addDays(item.due_date, deltaDays);
      updateBoardItem(item.id, { start_date: newStart, due_date: newDue });
    }
  };

  // Quick link / unlink dependency
  const handleToggleDependency = (prerequisiteId: string) => {
    if (!linkingItem) return;

    const isAlreadyBlocked = (linkingItem.blocked_by || []).includes(prerequisiteId);

    if (isAlreadyBlocked) {
      removeDependencyLink(prerequisiteId, linkingItem.id);
      playClickSound();
    } else {
      const res = addDependencyLink(prerequisiteId, linkingItem.id);
      if (res.success) {
        playTransitionSound();
      } else {
        playUrgentSound();
      }
    }
  };

  return (
    <div className="timeline-gantt-card animate-fade-in" id="timeline-gantt-view">
      {/* Top Header & CPM Controls */}
      <div className="timeline-top-bar">
        <div className="top-title-group">
          <Calendar size={17} className="text-emerald-400" />
          <span className="font-semibold text-sm">Timeline & Critical Path Engine</span>
          <span className="items-count-pill font-mono">
            {items.length} scheduled · {cpm.totalProjectDurationDays}d span
          </span>
          {cpm.criticalPathItemIds.length > 0 && (
            <span 
              className={`cpm-badge font-mono ${highlightCriticalPath ? 'cpm-badge-active' : ''}`}
              title="Tasks on the Critical Path directly dictate earliest sprint completion date."
            >
              <Zap size={11} className={highlightCriticalPath ? 'text-amber-300 animate-pulse' : 'text-slate-400'} />
              {cpm.criticalPathItemIds.length} on Critical Path
            </span>
          )}
          {cpm.hasCycle && (
            <span className="cycle-warning-badge font-mono">
              <AlertTriangle size={12} className="text-red-400" />
              Dependency Cycle Detected
            </span>
          )}
        </div>

        <div className="controls-right-group">
          {/* Critical Path Toggle */}
          <button
            type="button"
            id="toggle-critical-path-btn"
            className={`btn-cpm-toggle ${highlightCriticalPath ? 'active' : ''}`}
            onClick={() => {
              setHighlightCriticalPath(!highlightCriticalPath);
              playClickSound();
            }}
            title="Highlight the zero-slack bottleneck path in glowing crimson/amber"
          >
            <Zap size={13} />
            <span>Critical Path Highlight</span>
          </button>

          {/* Auto-Cascade Toggle */}
          <button
            type="button"
            id="toggle-autocascade-btn"
            className={`btn-cascade-toggle ${autoCascadeSchedule ? 'active' : ''}`}
            onClick={() => {
              setAutoCascadeSchedule(!autoCascadeSchedule);
              playClickSound();
            }}
            title="Automatically cascade downstream dependencies when a prerequisite task date shifts"
          >
            <span>Auto-Cascade: {autoCascadeSchedule ? 'ON' : 'OFF'}</span>
          </button>

          {/* Zoom Level */}
          <div className="zoom-toggle-group">
            <button
              type="button"
              className={`zoom-btn ${viewWindowDays === 14 ? 'active' : ''}`}
              onClick={() => setViewWindowDays(14)}
            >
              14d
            </button>
            <button
              type="button"
              className={`zoom-btn ${viewWindowDays === 28 ? 'active' : ''}`}
              onClick={() => setViewWindowDays(28)}
            >
              28d
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Gantt Grid */}
      <div className="gantt-scroll-viewport">
        <div className="gantt-content-width" style={{ minWidth: viewWindowDays === 28 ? '1600px' : '1180px' }}>
          {/* Calendar Header Row */}
          <div className="gantt-calendar-header">
            <div className="header-task-col">
              Task / Dependencies
            </div>
            <div 
              className="header-days-grid" 
              style={{ gridTemplateColumns: `repeat(${viewWindowDays}, minmax(48px, 1fr))` }}
            >
              {timelineDays.map((td) => (
                <div 
                  key={td.dateStr} 
                  className={`header-day-cell ${td.isToday ? 'today-cell' : ''}`}
                >
                  {td.label}
                </div>
              ))}
            </div>
          </div>

          {/* Groups & Items */}
          {groups.map((group) => {
            const groupItems = items.filter((i) => i.group_id === group.id);
            if (groupItems.length === 0) return null;

            return (
              <div key={group.id} className="gantt-group-block">
                {/* Group Heading Row */}
                <div className="gantt-group-header">
                  <div className="group-label-box" style={{ color: group.color }}>
                    <span className="group-color-dot" style={{ backgroundColor: group.color }} />
                    <span>{group.name}</span>
                    <span className="group-count font-mono">({groupItems.length})</span>
                  </div>
                  <div className="group-spacer-line" />
                </div>

                {/* Items in Group */}
                {groupItems.map((item) => {
                  const coords = getBarCoordinates(item);
                  const isCritical = cpm.nodeMetrics[item.id]?.isCritical;
                  const slack = cpm.nodeMetrics[item.id]?.slack ?? 0;
                  const hasBlockers = (item.blocked_by && item.blocked_by.length > 0);
                  const blocksOthers = (item.blocks && item.blocks.length > 0);

                  return (
                    <div 
                      key={item.id}
                      className={`gantt-item-row ${highlightCriticalPath && isCritical ? 'item-row-critical' : ''}`}
                      onClick={() => onSelectItem(item)}
                      title={`Click to view details for ${item.title}`}
                    >
                      {/* Left: Item Info & Dependency Linker */}
                      <div className="item-meta-col">
                        <img 
                          src={getSafeAvatar(item.assignee?.avatar, item.assignee?.name)} 
                          alt={item.assignee?.name || 'Assignee'} 
                          className="item-assignee-avatar" 
                        />
                        <div className="item-meta-text-group">
                          <div className="item-title-line">
                            {item.ticket_number && (
                              <span className="ticket-id-tag font-mono">{item.ticket_number}</span>
                            )}
                            <span className="item-name-text">
                              {item.title}
                            </span>
                          </div>

                          {/* Dependency Chips & Quick Linker */}
                          <div className="dependency-badges-line">
                            {hasBlockers && (
                              <span className="dep-pill dep-blocked-by" title={`Blocked by ${item.blocked_by?.length} task(s)`}>
                                <Link2 size={10} />
                                {item.blocked_by?.length} blocker{item.blocked_by && item.blocked_by.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {blocksOthers && (
                              <span className="dep-pill dep-blocks" title={`Blocks ${item.blocks?.length} task(s)`}>
                                ⛔ blocks {item.blocks?.length}
                              </span>
                            )}
                            <button
                              type="button"
                              className="btn-add-dep-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLinkingItem(linkingItem?.id === item.id ? null : item);
                              }}
                              title="Link prerequisite blockers"
                            >
                              <Link2 size={11} />
                              <span>Deps</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Interactive Gantt Canvas */}
                      <div className="item-gantt-canvas">
                        {/* Day Column Guides */}
                        <div 
                          className="day-grid-guides"
                          style={{ gridTemplateColumns: `repeat(${viewWindowDays}, minmax(48px, 1fr))` }}
                        >
                          {timelineDays.map((td) => (
                            <div 
                              key={td.dateStr} 
                              className={`day-guide-slot ${td.isToday ? 'today-slot' : ''}`}
                            />
                          ))}
                        </div>

                        {/* Positioned Gantt Bar */}
                        <div 
                          className={`gantt-bar ${highlightCriticalPath && isCritical ? 'gantt-bar-critical' : ''}`}
                          style={{
                            left: `${coords.leftPercent}%`,
                            width: `${coords.widthPercent}%`,
                            backgroundColor: item.status_color || '#3ecf8e',
                          }}
                        >
                          {/* Left Shift Handle */}
                          <button
                            type="button"
                            className="bar-shift-handle handle-left"
                            onClick={(e) => handleShiftItem(e, item, -1)}
                            title="Shift task 1 day earlier"
                          >
                            <ChevronLeft size={12} />
                          </button>

                          {/* Bar Content */}
                          <div className="gantt-bar-content">
                            <span className="gantt-bar-label">
                              {item.title}
                            </span>
                            <span className="gantt-duration-pill font-mono">
                              {coords.durationDays}d
                              {highlightCriticalPath && isCritical ? ' · 🚨 0d float' : (slack > 0 ? ` · +${slack}d` : '')}
                            </span>
                          </div>

                          {/* Right Shift Handle */}
                          <button
                            type="button"
                            className="bar-shift-handle handle-right"
                            onClick={(e) => handleShiftItem(e, item, 1)}
                            title="Shift task 1 day later (auto-cascades dependents)"
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Dependency Linker Modal */}
      {linkingItem && (
        <div className="dep-modal-backdrop" onClick={() => setLinkingItem(null)}>
          <div className="dep-modal-panel glass-panel animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="dep-modal-header">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Manage Blockers for {linkingItem.ticket_number || linkingItem.title}
                </h3>
              </div>
              <button 
                type="button"
                className="text-xs text-slate-400 hover:text-white"
                onClick={() => setLinkingItem(null)}
              >
                ✕
              </button>
            </div>

            <p className="dep-modal-desc">
              Select tasks that must be finished <strong>before</strong> this task can start.
              HappyTF enforces cycle detection to prevent deadlocks.
            </p>

            <div className="dep-items-list">
              {items
                .filter((candidate) => candidate.id !== linkingItem.id)
                .map((candidate) => {
                  const isBlockedBy = (linkingItem.blocked_by || []).includes(candidate.id);
                  const wouldCauseCycle = !isBlockedBy && detectDependencyCycle(items, candidate.id, linkingItem.id);

                  return (
                    <div 
                      key={candidate.id}
                      className={`dep-candidate-row ${isBlockedBy ? 'dep-active' : ''} ${wouldCauseCycle ? 'dep-disabled' : ''}`}
                      onClick={() => !wouldCauseCycle && handleToggleDependency(candidate.id)}
                    >
                      <div className="dep-candidate-info">
                        <span className="candidate-ticket-id font-mono">
                          {candidate.ticket_number || candidate.id}
                        </span>
                        <span className="candidate-title truncate">
                          {candidate.title}
                        </span>
                        <span 
                          className="candidate-status-pill"
                          style={{ borderColor: candidate.status_color, color: candidate.status_color }}
                        >
                          {candidate.status}
                        </span>
                      </div>

                      <div className="dep-action-status">
                        {isBlockedBy ? (
                          <span className="pill-linked flex items-center gap-1 font-mono">
                            <Check size={12} /> Blocker
                          </span>
                        ) : wouldCauseCycle ? (
                          <span className="pill-cycle font-mono text-xs">
                            Circular Loop
                          </span>
                        ) : (
                          <span className="pill-add font-mono text-xs">
                            + Set Blocker
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="dep-modal-footer">
              <button
                type="button"
                className="btn-close-dep font-mono"
                onClick={() => setLinkingItem(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .timeline-gantt-card {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--border-default);
          background: var(--bg-surface);
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }

        .timeline-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: var(--bg-subtle);
          border-bottom: 1px solid var(--border-default);
          gap: 16px;
          flex-wrap: wrap;
        }

        .top-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-primary);
          flex-wrap: wrap;
        }

        .items-count-pill {
          font-size: 11px;
          color: var(--text-muted);
          background: var(--bg-elevated);
          padding: 2px 8px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
        }

        .cpm-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #fbbf24;
        }

        .cpm-badge-active {
          background: rgba(239, 68, 68, 0.18);
          border-color: rgba(239, 68, 68, 0.5);
          color: #f87171;
        }

        .cycle-warning-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(239, 68, 68, 0.25);
          border: 1px solid #ef4444;
          color: #fca5a5;
        }

        .controls-right-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-cpm-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 6px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-cpm-toggle:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .btn-cpm-toggle.active {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          color: #fca5a5;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.35);
        }

        .btn-cascade-toggle {
          font-size: 11px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 6px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-cascade-toggle.active {
          background: rgba(16, 185, 129, 0.15);
          border-color: #10b981;
          color: #34d399;
        }

        .zoom-toggle-group {
          display: flex;
          align-items: center;
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          overflow: hidden;
        }

        .zoom-btn {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          background: var(--bg-elevated);
          color: var(--text-muted);
          border: none;
          cursor: pointer;
        }

        .zoom-btn.active {
          background: var(--primary);
          color: #ffffff;
        }

        /* Viewport & Scrolling */
        .gantt-scroll-viewport {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* Header Row */
        .gantt-calendar-header {
          display: grid;
          grid-template-columns: 340px 1fr;
          border-bottom: 1px solid var(--border-default);
          background: var(--bg-subtle);
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        .header-task-col {
          padding: 10px 16px;
          border-right: 1px solid var(--border-subtle);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
        }

        .header-days-grid {
          display: grid;
          text-align: center;
        }

        .header-day-cell {
          padding: 10px 4px;
          border-right: 1px solid var(--border-subtle);
          white-space: nowrap;
        }

        .header-day-cell.today-cell {
          background: rgba(62, 207, 142, 0.12);
          color: var(--primary-light);
          font-weight: 700;
          border-bottom: 2px solid var(--primary);
        }

        /* Groups */
        .gantt-group-block {
          border-bottom: 1px solid var(--border-subtle);
        }

        .gantt-group-header {
          display: grid;
          grid-template-columns: 340px 1fr;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid var(--border-subtle);
          padding: 8px 16px;
          align-items: center;
        }

        .group-label-box {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
        }

        .group-color-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .group-count {
          font-size: 10px;
          color: var(--text-muted);
        }

        /* Item Rows */
        .gantt-item-row {
          display: grid;
          grid-template-columns: 340px 1fr;
          align-items: center;
          border-bottom: 1px solid var(--border-subtle);
          transition: background var(--transition-fast);
          cursor: pointer;
        }

        .gantt-item-row:hover {
          background: var(--bg-hover);
        }

        .item-row-critical {
          background: rgba(239, 68, 68, 0.03);
        }

        .item-meta-col {
          padding: 8px 16px;
          border-right: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }

        .item-assignee-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid var(--border-subtle);
        }

        .item-meta-text-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
          flex: 1;
        }

        .item-title-line {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .ticket-id-tag {
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .item-name-text {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dependency-badges-line {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
        }

        .dep-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 1px 5px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-weight: 500;
        }

        .dep-blocked-by {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .dep-blocks {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fcd34d;
        }

        .btn-add-dep-link {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 4px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          cursor: pointer;
        }

        .btn-add-dep-link:hover {
          color: var(--text-primary);
          border-color: var(--primary);
        }

        /* Gantt Bar Canvas */
        .item-gantt-canvas {
          position: relative;
          height: 42px;
          display: flex;
          align-items: center;
          padding: 0 4px;
        }

        .day-grid-guides {
          position: absolute;
          inset: 0;
          display: grid;
          pointer-events: none;
        }

        .day-guide-slot {
          border-right: 1px solid rgba(255, 255, 255, 0.04);
          height: 100%;
        }

        .day-guide-slot.today-slot {
          background: rgba(62, 207, 142, 0.04);
        }

        .gantt-bar {
          position: absolute;
          height: 28px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all var(--transition-fast);
          z-index: 2;
        }

        .gantt-bar:hover {
          filter: brightness(1.12);
          transform: translateY(-1px);
        }

        .gantt-bar-critical {
          border: 2px solid #ef4444 !important;
          box-shadow: 0 0 14px rgba(239, 68, 68, 0.7), 0 0 2px #ef4444 !important;
        }

        .bar-shift-handle {
          background: rgba(0, 0, 0, 0.3);
          border: none;
          color: rgba(255, 255, 255, 0.7);
          height: 22px;
          width: 16px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity var(--transition-fast), background var(--transition-fast);
        }

        .gantt-bar:hover .bar-shift-handle {
          opacity: 1;
        }

        .bar-shift-handle:hover {
          background: rgba(0, 0, 0, 0.6);
          color: #ffffff;
        }

        .gantt-bar-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          padding: 0 6px;
          overflow: hidden;
        }

        .gantt-bar-label {
          font-size: 11px;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .gantt-duration-pill {
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.35);
          color: rgba(255, 255, 255, 0.9);
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Floating Dependency Linker Modal */
        .dep-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .dep-modal-panel {
          width: 90%;
          max-width: 520px;
          background: rgba(18, 21, 31, 0.98);
          border: 1px solid var(--border-default);
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
        }

        .dep-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .dep-modal-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .dep-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 320px;
          overflow-y: auto;
          margin-bottom: 16px;
        }

        .dep-candidate-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .dep-candidate-row:hover:not(.dep-disabled) {
          border-color: var(--primary);
          background: var(--bg-hover);
        }

        .dep-candidate-row.dep-active {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.12);
        }

        .dep-candidate-row.dep-disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .dep-candidate-info {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1;
        }

        .candidate-ticket-id {
          font-size: 11px;
          color: var(--text-muted);
        }

        .candidate-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .candidate-status-pill {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 4px;
          border: 1px solid;
          white-space: nowrap;
        }

        .pill-linked {
          font-size: 11px;
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.2);
          padding: 3px 8px;
          border-radius: 6px;
        }

        .pill-cycle {
          color: #f87171;
        }

        .pill-add {
          color: var(--text-muted);
        }

        .dep-modal-footer {
          display: flex;
          justify-content: flex-end;
        }

        .btn-close-dep {
          background: var(--primary);
          color: #ffffff;
          padding: 6px 16px;
          border-radius: 6px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};
