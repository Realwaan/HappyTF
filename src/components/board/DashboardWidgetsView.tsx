'use client';

import React from 'react';
import { BoardItem, BoardSummary } from '../../types';
import { calculateBoardAggregation } from '../../lib/mondaydb';
import { StatusBatteryBar } from './StatusBatteryBar';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { 
  PieChart, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Zap, 
  Layers,
  ArrowRight
} from 'lucide-react';

interface DashboardWidgetsViewProps {
  board: BoardSummary;
  items: BoardItem[];
  onSelectItem: (item: BoardItem) => void;
}

export const DashboardWidgetsView: React.FC<DashboardWidgetsViewProps> = ({ board, items, onSelectItem }) => {
  const agg = calculateBoardAggregation(items);

  // SLA calculations
  const urgentTickets = items.filter((i) => i.priority === 'urgent' && i.status !== 'Done');
  const breachedTickets = items.filter((i) => {
    if (i.status === 'Done' || !i.sla_due_at) return false;
    return new Date(i.sla_due_at).getTime() < Date.now();
  });

  // Assignee distribution
  const assigneeStats: Record<string, { name: string; avatar: string; count: number; doneCount: number }> = {};
  items.forEach((item) => {
    if (!item.assignee) return;
    const id = item.assignee.id || 'unassigned';
    if (!assigneeStats[id]) {
      assigneeStats[id] = {
        name: item.assignee.name || 'Unassigned',
        avatar: item.assignee.avatar || '',
        count: 0,
        doneCount: 0,
      };
    }
    assigneeStats[id].count += 1;
    if (item.status === 'Done') assigneeStats[id].doneCount += 1;
  });

  const slaCompliancePercent = items.length > 0 
    ? Math.max(0, Math.round(((items.length - breachedTickets.length) / items.length) * 100))
    : 100;

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Top Metric Cards Grid */}
      <div className="dashboard-grid">
        {/* 1. Status Distribution Battery Widget */}
        <div className="widget-card span-two">
          <div className="widget-header">
            <div className="widget-title-group">
              <span className="widget-icon emerald">
                <PieChart size={16} />
              </span>
              <h4 className="widget-title">Board Status Battery</h4>
            </div>
            <span className="badge-pill">
              {agg.totalItems} total items
            </span>
          </div>

          <div className="widget-body">
            <StatusBatteryBar segments={agg.statusBattery} height={26} showLabels />
          </div>

          <div className="subtask-metrics-grid">
            <div className="metric-box">
              <span className="metric-sublabel">Total Sub-tasks</span>
              <span className="metric-value">{agg.totalSubItems}</span>
            </div>
            <div className="metric-box">
              <span className="metric-sublabel">Completed</span>
              <span className="metric-value emerald">{agg.totalSubItemsCompleted}</span>
            </div>
            <div className="metric-box">
              <span className="metric-sublabel">Progress Rate</span>
              <span className="metric-value indigo">{agg.overallProgressPercent}%</span>
            </div>
          </div>
        </div>

        {/* 2. Velocity & Story Points KPI */}
        <div className="widget-card">
          <div className="widget-header">
            <div className="widget-title-group">
              <span className="widget-icon indigo">
                <TrendingUp size={16} />
              </span>
              <h4 className="widget-title">Velocity & Story Points</h4>
            </div>
            <span className="live-indicator" title="Calculated live from mondayDB" />
          </div>

          <div className="kpi-body">
            <div className="kpi-huge-number">
              {agg.totalNumbersSum} <span className="kpi-unit">pts planned</span>
            </div>
            <p className="kpi-subtext">
              Average per item: <strong>{agg.averageNumbers} pts</strong>
            </p>
          </div>

          <div className="notice-box info">
            <Zap size={14} className="notice-icon" />
            <span>Sprint pacing is healthy. Calculated via columnar engine.</span>
          </div>
        </div>

        {/* 3. SLA Health & Risk Monitor */}
        <div className="widget-card">
          <div className="widget-header">
            <div className="widget-title-group">
              <span className="widget-icon amber">
                <AlertTriangle size={16} />
              </span>
              <h4 className="widget-title">SLA & Priority Health</h4>
            </div>
            <span className={`compliance-tag ${slaCompliancePercent >= 90 ? 'safe' : 'risk'}`}>
              {slaCompliancePercent}% compliance
            </span>
          </div>

          <div className="kpi-body">
            <div className="kpi-huge-number">
              {urgentTickets.length} <span className="kpi-unit amber">urgent tickets</span>
            </div>
            <p className="kpi-subtext">
              {breachedTickets.length > 0 ? (
                <span className="risk-text">⚠️ {breachedTickets.length} ticket(s) breached SLA</span>
              ) : (
                <span className="safe-text">✓ All active SLAs are within threshold</span>
              )}
            </p>
          </div>

          {urgentTickets.length > 0 && (
            <div className="urgent-list">
              {urgentTickets.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="urgent-item-row"
                  onClick={() => onSelectItem(item)}
                >
                  <span className="urgent-ticket-id">
                    {item.ticket_number || `#TK-${item.id.replace('item-', '').padStart(3, '0')}`}
                  </span>
                  <span className="urgent-ticket-title">{item.title}</span>
                  <ArrowRight size={12} className="urgent-arrow" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Team Capacity & Allocation (Spans Full Row) */}
        <div className="widget-card span-full">
          <div className="widget-header">
            <div className="widget-title-group">
              <span className="widget-icon cyan">
                <Users size={16} />
              </span>
              <h4 className="widget-title">Team Member Workload Allocation</h4>
            </div>
            <span className="badge-pill">{Object.keys(assigneeStats).length} Collaborators</span>
          </div>

          <div className="team-grid">
            {Object.entries(assigneeStats).map(([id, stat]) => {
              const completionPercent = stat.count > 0 ? Math.round((stat.doneCount / stat.count) * 100) : 0;
              return (
                <div key={id} className="team-card">
                  <img src={getSafeAvatar(stat.avatar, stat.name)} alt={stat.name} className="member-avatar" />
                  <div className="member-info">
                    <div className="member-header">
                      <span className="member-name">{stat.name}</span>
                      <span className="member-tasks-badge">{stat.count} tasks</span>
                    </div>
                    {/* Progress bar */}
                    <div className="progress-track">
                      <div 
                        className="progress-fill"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                    <div className="progress-sub">
                      <span>{stat.doneCount} resolved</span>
                      <span>{completionPercent}% completed</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          padding: 8px 0 24px 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        @media (max-width: 1200px) {
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        .widget-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-sm);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }

        .widget-card:hover {
          border-color: var(--border-default);
          box-shadow: var(--shadow-md);
        }

        .widget-card.span-two {
          grid-column: span 2;
        }

        .widget-card.span-full {
          grid-column: 1 / -1;
        }

        @media (max-width: 1200px) {
          .widget-card.span-two {
            grid-column: span 2;
          }
        }

        @media (max-width: 640px) {
          .widget-card.span-two,
          .widget-card.span-full {
            grid-column: span 1;
          }
        }

        .widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .widget-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .widget-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
        }

        .widget-icon.emerald {
          background: rgba(62, 207, 142, 0.15);
          color: var(--primary);
        }

        .widget-icon.indigo {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
        }

        .widget-icon.amber {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }

        .widget-icon.cyan {
          background: rgba(6, 182, 212, 0.15);
          color: #22d3ee;
        }

        .widget-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .badge-pill {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-muted);
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          padding: 3px 8px;
          border-radius: var(--radius-full);
        }

        .live-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #818cf8;
          box-shadow: 0 0 8px #818cf8;
          animation: pulse 2s infinite;
        }

        .compliance-tag {
          font-size: 11px;
          font-family: var(--font-mono);
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .compliance-tag.safe {
          background: rgba(62, 207, 142, 0.15);
          color: var(--primary);
          border: 1px solid rgba(62, 207, 142, 0.3);
        }

        .compliance-tag.risk {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .widget-body {
          margin: 8px 0 16px 0;
        }

        .subtask-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          padding-top: 14px;
          border-top: 1px solid var(--border-subtle);
        }

        .metric-box {
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .metric-sublabel {
          font-size: 10px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .metric-value {
          font-size: 18px;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--text-primary);
        }

        .metric-value.emerald {
          color: var(--primary);
        }

        .metric-value.indigo {
          color: #818cf8;
        }

        .kpi-body {
          margin: auto 0;
          padding: 8px 0;
        }

        .kpi-huge-number {
          font-size: 28px;
          font-weight: 800;
          font-family: var(--font-mono);
          color: var(--text-primary);
          letter-spacing: -0.02em;
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .kpi-unit {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          font-family: var(--font-main);
        }

        .kpi-unit.amber {
          color: #fbbf24;
        }

        .kpi-subtext {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .safe-text {
          color: var(--primary);
        }

        .risk-text {
          color: #f87171;
          font-weight: 600;
        }

        .notice-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          margin-top: 12px;
        }

        .notice-box.info {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.25);
          color: #c7d2fe;
        }

        .notice-icon {
          color: #818cf8;
          flex-shrink: 0;
        }

        .urgent-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 12px;
        }

        .urgent-item-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-size: 11px;
          cursor: pointer;
          text-align: left;
          transition: background var(--transition-fast), border-color var(--transition-fast);
        }

        .urgent-item-row:hover {
          background: var(--bg-elevated);
          border-color: var(--border-default);
        }

        .urgent-ticket-id {
          font-family: var(--font-mono);
          font-weight: 700;
          color: #fbbf24;
          flex-shrink: 0;
        }

        .urgent-ticket-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--text-secondary);
        }

        .urgent-arrow {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }

        .team-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-fast);
        }

        .team-card:hover {
          border-color: var(--border-default);
        }

        .member-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid var(--border-subtle);
        }

        .member-info {
          flex: 1;
          min-width: 0;
        }

        .member-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .member-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .member-tasks-badge {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 400;
        }

        .progress-track {
          width: 100%;
          height: 6px;
          background: var(--bg-surface);
          border-radius: 9999px;
          overflow: hidden;
          border: 1px solid var(--border-subtle);
        }

        .progress-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 9999px;
          transition: width 0.3s ease;
        }

        .progress-sub {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--text-muted);
          margin-top: 4px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
};
