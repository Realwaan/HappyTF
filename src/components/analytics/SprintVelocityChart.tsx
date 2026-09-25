'use client';

import React, { useState } from 'react';
import { BoardItem } from '../../types';
import { 
  TrendingUp, 
  BarChart2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CircleDot,
  Layers,
  Sparkles
} from 'lucide-react';

interface SprintVelocityChartProps {
  items: BoardItem[];
  onFilterPriority?: (priority: string) => void;
  activePriorityFilter?: string;
}

export const SprintVelocityChart: React.FC<SprintVelocityChartProps> = ({
  items,
  onFilterPriority,
  activePriorityFilter = 'all'
}) => {
  const [chartMode, setChartMode] = useState<'velocity' | 'distribution'>('velocity');

  // Velocity points history across recent sprints (committed vs completed story points)
  const sprints = [
    { name: 'Sprint 21', committed: 42, completed: 38 },
    { name: 'Sprint 22', committed: 48, completed: 46 },
    { name: 'Sprint 23', committed: 50, completed: 47 },
    { name: 'Sprint 24', committed: 52, completed: 34, current: true },
  ];

  // Status breakdown of current active items
  const doneCount = items.filter((i) => i.status === 'Done').length;
  const inProgressCount = items.filter((i) => i.status === 'Working on it').length;
  const stuckCount = items.filter((i) => i.status === 'Stuck').length;
  const pendingCount = items.filter((i) => i.status === 'Pending' || i.status === 'In Review').length;
  const totalCount = items.length || 1;

  const donePercent = Math.round((doneCount / totalCount) * 100);
  const inProgressPercent = Math.round((inProgressCount / totalCount) * 100);
  const stuckPercent = Math.round((stuckCount / totalCount) * 100);
  const pendingPercent = 100 - (donePercent + inProgressPercent + stuckPercent);

  // SVG dimensions for velocity chart
  const width = 600;
  const height = 170;
  const paddingX = 60;
  const paddingY = 28;
  const maxPts = 60;

  const getY = (pts: number) => {
    return height - paddingY - (pts / maxPts) * (height - paddingY * 2);
  };

  const getX = (index: number) => {
    return paddingX + index * ((width - paddingX * 2) / (sprints.length - 1));
  };

  // Generate SVG path for line chart
  const committedPointsPath = sprints
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(s.committed)}`)
    .join(' ');

  const completedPointsPath = sprints
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(s.completed)}`)
    .join(' ');

  return (
    <div className="sprint-velocity-card" id="sprint-velocity-analytics">
      {/* Top Bar: Title & Tappable Mode Elicitation */}
      <div className="analytics-header">
        <div className="analytics-title-group">
          <div className="analytics-icon-badge">
            {chartMode === 'velocity' ? <TrendingUp size={16} /> : <BarChart2 size={16} />}
          </div>
          <div>
            <div className="title-row-badge">
              <h3 className="analytics-heading">Sprint Analytics & Cycle Health</h3>
              <span className="sprint-active-pill font-mono">
                Sprint 24 Active
              </span>
            </div>
            <p className="analytics-subtext">
              Deterministic cycle velocity and deliverable flow metrics
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="mode-toggle-group">
          <button
            type="button"
            onClick={() => setChartMode('velocity')}
            className={`mode-btn ${chartMode === 'velocity' ? 'active' : ''}`}
          >
            <TrendingUp size={13} />
            <span>Velocity Trend</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('distribution')}
            className={`mode-btn ${chartMode === 'distribution' ? 'active' : ''}`}
          >
            <BarChart2 size={13} />
            <span>Status Distribution</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      {chartMode === 'velocity' ? (
        <div className="chart-canvas-wrapper">
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-dot dot-committed" />
              <span>Committed Points</span>
            </span>
            <span className="legend-item">
              <span className="legend-dot dot-completed" />
              <span>Completed Points</span>
            </span>
          </div>

          <div className="svg-container">
            <svg viewBox={`0 0 ${width} ${height}`} className="velocity-svg font-mono">
              {/* Grid Lines */}
              {[0, 20, 40, 60].map((val) => (
                <g key={val}>
                  <line
                    x1={paddingX}
                    y1={getY(val)}
                    x2={width - paddingX}
                    y2={getY(val)}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingX - 12}
                    y={getY(val) + 4}
                    fill="#94a3b8"
                    fontSize="10"
                    textAnchor="end"
                  >
                    {val}
                  </text>
                </g>
              ))}

              {/* Area gradient for completed */}
              <defs>
                <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3ecf8e" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#3ecf8e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Paths */}
              <path
                d={`${completedPointsPath} L ${getX(sprints.length - 1)} ${height - paddingY} L ${getX(0)} ${height - paddingY} Z`}
                fill="url(#completedGrad)"
              />

              <path
                d={committedPointsPath}
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="5 5"
              />

              <path
                d={completedPointsPath}
                fill="none"
                stroke="#3ecf8e"
                strokeWidth="2.5"
              />

              {/* Data Points */}
              {sprints.map((s, i) => (
                <g key={s.name}>
                  {/* Committed dot */}
                  <circle
                    cx={getX(i)}
                    cy={getY(s.committed)}
                    r="4"
                    fill="#181c2b"
                    stroke="#94a3b8"
                    strokeWidth="2"
                  />
                  {/* Completed dot */}
                  <circle
                    cx={getX(i)}
                    cy={getY(s.completed)}
                    r="5"
                    fill="#3ecf8e"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  {/* Label */}
                  <text
                    x={getX(i)}
                    y={height - 8}
                    fill={s.current ? '#3ecf8e' : '#cbd5e1'}
                    fontWeight={s.current ? 'bold' : 'normal'}
                    fontSize="11"
                    textAnchor="middle"
                  >
                    {s.name}
                  </text>
                  {/* Point values */}
                  <text
                    x={getX(i)}
                    y={getY(s.completed) - 10}
                    fill="#3ecf8e"
                    fontSize="11"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {s.completed}p
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      ) : (
        /* Status Distribution Bar & Cards */
        <div className="distribution-wrapper">
          <div className="progress-bar-container">
            <div 
              style={{ width: `${donePercent}%` }} 
              className="progress-segment seg-done" 
              title={`Done: ${doneCount} (${donePercent}%)`}
            />
            <div 
              style={{ width: `${inProgressPercent}%` }} 
              className="progress-segment seg-progress" 
              title={`Working on it: ${inProgressCount} (${inProgressPercent}%)`}
            />
            <div 
              style={{ width: `${stuckPercent}%` }} 
              className="progress-segment seg-stuck" 
              title={`Stuck: ${stuckCount} (${stuckPercent}%)`}
            />
            <div 
              style={{ width: `${pendingPercent}%` }} 
              className="progress-segment seg-pending" 
              title={`Pending: ${pendingCount} (${pendingPercent}%)`}
            />
          </div>

          <div className="distribution-cards-grid">
            <div className="dist-card card-done">
              <div className="dist-card-left">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span className="dist-label">Done</span>
              </div>
              <span className="dist-val font-mono">{doneCount} <span className="dist-pct">({donePercent}%)</span></span>
            </div>

            <div className="dist-card card-progress">
              <div className="dist-card-left">
                <Clock size={15} className="text-amber-400" />
                <span className="dist-label">In Flight</span>
              </div>
              <span className="dist-val font-mono">{inProgressCount} <span className="dist-pct">({inProgressPercent}%)</span></span>
            </div>

            <div className="dist-card card-stuck">
              <div className="dist-card-left">
                <AlertCircle size={15} className="text-red-400" />
                <span className="dist-label">Blocked</span>
              </div>
              <span className="dist-val font-mono">{stuckCount} <span className="dist-pct">({stuckPercent}%)</span></span>
            </div>

            <div className="dist-card card-pending">
              <div className="dist-card-left">
                <CircleDot size={15} className="text-slate-400" />
                <span className="dist-label">Pending</span>
              </div>
              <span className="dist-val font-mono">{pendingCount} <span className="dist-pct">({pendingPercent}%)</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Elicitation Filter Chips */}
      {onFilterPriority && (
        <div className="filter-priority-row">
          <span className="filter-priority-label">Filter Tasks by Priority:</span>
          <div className="filter-chips-list">
            {[
              { id: 'all', label: 'All Issues' },
              { id: 'urgent', label: 'P1 Urgent' },
              { id: 'high', label: 'P2 High' },
              { id: 'medium', label: 'P3 Medium' },
              { id: 'low', label: 'P4 Low' },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onFilterPriority(chip.id)}
                className={`priority-chip-btn ${activePriorityFilter === chip.id ? 'active' : ''}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .sprint-velocity-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--shadow-md);
          margin: 20px 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .analytics-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-subtle);
          flex-wrap: wrap;
        }

        .analytics-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .analytics-icon-badge {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(62, 207, 142, 0.12);
          border: 1px solid rgba(62, 207, 142, 0.25);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .title-row-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .analytics-heading {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .sprint-active-pill {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          background: rgba(62, 207, 142, 0.15);
          color: var(--primary);
          border: 1px solid rgba(62, 207, 142, 0.35);
          font-weight: 600;
        }

        .analytics-subtext {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .mode-toggle-group {
          display: flex;
          align-items: center;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 3px;
          gap: 4px;
        }

        .mode-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .mode-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }
        .mode-btn.active {
          background: var(--primary) !important;
          color: var(--on-primary) !important;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        .mode-btn.active svg {
          color: var(--on-primary) !important;
        }

        /* Chart Canvas */
        .chart-canvas-wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chart-legend {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 16px;
          font-size: 12px;
          color: var(--text-muted);
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
        .dot-committed { background: #64748b; }
        .dot-completed { background: #3ecf8e; }

        .svg-container {
          width: 100%;
          overflow-x: auto;
        }

        .velocity-svg {
          width: 100%;
          height: 170px;
          overflow: visible;
        }

        /* Distribution Mode */
        .distribution-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-top: 6px;
        }

        .progress-bar-container {
          height: 14px;
          width: 100%;
          border-radius: 9999px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          display: flex;
          overflow: hidden;
          padding: 2px;
          gap: 2px;
        }

        .progress-segment {
          height: 100%;
          border-radius: 3px;
          transition: width 400ms ease;
        }
        .seg-done { background: #3ecf8e; }
        .seg-progress { background: #f59e0b; }
        .seg-stuck { background: #ef4444; }
        .seg-pending { background: #64748b; }

        .distribution-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 12px;
        }

        .dist-card {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-default);
          background: var(--bg-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .card-done { border-color: rgba(62, 207, 142, 0.3); background: rgba(62, 207, 142, 0.05); }
        .card-progress { border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.05); }
        .card-stuck { border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); }
        .card-pending { border-color: var(--border-subtle); background: var(--bg-subtle); }

        .dist-card-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dist-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .dist-val {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .dist-pct {
          font-size: 10px;
          font-weight: 400;
          color: var(--text-muted);
        }

        /* Filter Chips Row */
        .filter-priority-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
          flex-wrap: wrap;
        }

        .filter-priority-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .filter-chips-list {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .priority-chip-btn {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          background: var(--bg-subtle);
          color: var(--text-secondary);
          border: 1px solid var(--border-default);
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .priority-chip-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-highlight);
        }
        .priority-chip-btn.active {
          background: var(--primary) !important;
          color: var(--on-primary) !important;
          border-color: var(--primary) !important;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};
