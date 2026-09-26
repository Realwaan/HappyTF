'use client';

import React from 'react';
import { StatusBatterySegment } from '../../lib/mondaydb';

interface StatusBatteryBarProps {
  segments: StatusBatterySegment[];
  height?: number;
  showLabels?: boolean;
}

export const StatusBatteryBar: React.FC<StatusBatteryBarProps> = ({ 
  segments, 
  height = 14, 
  showLabels = false 
}) => {
  if (!segments || segments.length === 0) {
    return (
      <div 
        className="status-battery-empty"
        style={{ height: `${height}px` }}
      >
        <span>No items</span>
        <style jsx>{`
          .status-battery-empty {
            width: 100%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.04);
            border: 1px dashed rgba(255, 255, 255, 0.14);
            border-radius: 4px;
            font-size: 10px;
            font-family: var(--font-mono);
            color: var(--text-muted);
            letter-spacing: 0.03em;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="status-battery-wrapper">
      <div 
        className="status-battery-track"
        style={{ height: `${height}px` }}
      >
        {segments.map((seg, idx) => (
          <div
            key={seg.label}
            className="battery-segment"
            style={{
              width: `${Math.max(seg.percentage, 4)}%`,
              backgroundColor: seg.color,
              borderRight: idx < segments.length - 1 ? '1.5px solid rgba(12, 14, 20, 0.9)' : 'none',
            }}
            title={`${seg.label}: ${seg.count} (${seg.percentage}%)`}
          >
            {/* Tooltip on hover */}
            <div className="battery-tooltip">
              <span className="tooltip-dot" style={{ backgroundColor: seg.color }} />
              <span>{seg.label}: <strong>{seg.count}</strong> ({seg.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>

      {showLabels && (
        <div className="status-battery-legend">
          {segments.map((seg) => (
            <div key={seg.label} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: seg.color }} />
              <span>{seg.label} ({seg.percentage}%)</span>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .status-battery-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
          min-width: 140px;
        }

        .status-battery-track {
          width: 100%;
          display: flex;
          align-items: stretch;
          border-radius: 4px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        .battery-segment {
          position: relative;
          height: 100%;
          transition: width 0.3s ease, filter 0.15s ease;
          cursor: pointer;
        }
        .battery-segment:hover {
          filter: brightness(1.2);
          z-index: 20;
        }

        .battery-tooltip {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: #141724;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 6px;
          font-family: var(--font-main);
          font-size: 11px;
          color: #f8fafc;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s ease, transform 0.15s ease;
          z-index: 100;
        }

        .battery-segment:hover .battery-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(-2px);
        }

        .tooltip-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-battery-legend {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-muted);
          margin-top: 4px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .legend-dot {
          width: 7px;
          height: 7px;
          border-radius: 2px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};
