'use client';

import React from 'react';
import { BoardItem, BoardGroup } from '../../types';
import { Calendar } from 'lucide-react';
import { getSafeAvatar } from '../../lib/avatarHelper';

interface TimelineViewProps {
  groups: BoardGroup[];
  items: BoardItem[];
  onSelectItem: (item: BoardItem) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ groups, items, onSelectItem }) => {
  // Generate dates for the current timeline view (next 14 days)
  const today = new Date();
  const timelineDays: { dateStr: string; label: string; isToday: boolean; dayNum: number }[] = [];

  for (let i = -2; i < 12; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = i === 0;
    timelineDays.push({
      dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
      isToday,
      dayNum: i,
    });
  }

  return (
    <div className="timeline-gantt-card animate-fade-in" id="timeline-gantt-view">
      {/* Top Header */}
      <div className="timeline-top-bar">
        <div className="top-title-group">
          <Calendar size={16} className="text-emerald-400" />
          <span className="font-semibold text-sm">Timeline & Gantt Engine</span>
          <span className="items-count-pill font-mono">
            {items.length} items scheduled
          </span>
        </div>
        <div className="legend-group">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#10b981' }} />
            <span>Done</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }} />
            <span>In Progress</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#8b5cf6' }} />
            <span>In Review</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#ef4444' }} />
            <span>Stuck / Critical</span>
          </div>
        </div>
      </div>

      {/* Horizontal Gantt Grid */}
      <div className="gantt-scroll-viewport">
        <div className="gantt-content-width">
          {/* Calendar Header Row */}
          <div className="gantt-calendar-header">
            <div className="header-task-col">
              Task / Sprint Deliverable
            </div>
            <div className="header-days-grid">
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
                {groupItems.map((item, idx) => {
                  const startOffset = Math.max(0, (idx * 2 + 1) % 9);
                  const spanDays = Math.min(3 + (idx % 4), 14 - startOffset);

                  return (
                    <div 
                      key={item.id}
                      className="gantt-item-row"
                      onClick={() => onSelectItem(item)}
                      title={`Click to view details for ${item.title}`}
                    >
                      {/* Left: Item Info */}
                      <div className="item-meta-col">
                        <img 
                          src={getSafeAvatar(item.assignee?.avatar, item.assignee?.name)} 
                          alt={item.assignee?.name || 'Assignee'} 
                          className="item-assignee-avatar" 
                        />
                        <span className="item-name-text">
                          {item.title}
                        </span>
                      </div>

                      {/* Right: Interactive Gantt Canvas */}
                      <div className="item-gantt-canvas">
                        {/* Day Column Guides */}
                        <div className="day-grid-guides">
                          {timelineDays.map((td) => (
                            <div 
                              key={td.dateStr} 
                              className={`day-guide-slot ${td.isToday ? 'today-slot' : ''}`}
                            />
                          ))}
                        </div>

                        {/* Positioned Gantt Bar */}
                        <div 
                          className="gantt-bar"
                          style={{
                            left: `${(startOffset / 14) * 100}%`,
                            width: `${(spanDays / 14) * 100}%`,
                            backgroundColor: item.status_color || '#3ecf8e',
                          }}
                        >
                          <span className="gantt-bar-label">
                            {item.status} · {spanDays}d
                          </span>
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
        }

        .items-count-pill {
          font-size: 11px;
          color: var(--text-muted);
          background: var(--bg-elevated);
          padding: 2px 8px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
        }

        .legend-group {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        /* Viewport & Scrolling */
        .gantt-scroll-viewport {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .gantt-content-width {
          min-width: 1180px;
        }

        /* Header Row */
        .gantt-calendar-header {
          display: grid;
          grid-template-columns: 280px 1fr;
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
          grid-template-columns: repeat(14, minmax(64px, 1fr));
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
          grid-template-columns: 280px 1fr;
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
          grid-template-columns: 280px 1fr;
          align-items: center;
          border-bottom: 1px solid var(--border-subtle);
          transition: background var(--transition-fast);
          cursor: pointer;
        }

        .gantt-item-row:hover {
          background: var(--bg-hover);
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
          width: 22px;
          height: 22px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid var(--border-subtle);
        }

        .item-name-text {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Gantt Bar Canvas */
        .item-gantt-canvas {
          position: relative;
          height: 38px;
          display: flex;
          align-items: center;
          padding: 0 4px;
        }

        .day-grid-guides {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(14, minmax(64px, 1fr));
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
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: filter var(--transition-fast), transform var(--transition-fast);
          z-index: 2;
        }

        .gantt-bar:hover {
          filter: brightness(1.12);
          transform: translateY(-1px);
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
      `}</style>
    </div>
  );
};
