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
  height = 18, 
  showLabels = false 
}) => {
  if (!segments || segments.length === 0) {
    return (
      <div 
        className="w-full rounded bg-slate-800/60 border border-slate-700/40 flex items-center justify-center text-[10px] text-slate-500 font-mono"
        style={{ height }}
      >
        No items
      </div>
    );
  }

  return (
    <div className="status-battery-container flex flex-col gap-1 w-full">
      <div 
        className="status-battery-track flex rounded overflow-hidden shadow-inner"
        style={{ height, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        {segments.map((seg, idx) => (
          <div
            key={seg.label}
            className="battery-segment transition-all duration-300 relative group cursor-pointer"
            style={{
              width: `${seg.percentage}%`,
              backgroundColor: seg.color,
              borderRight: idx < segments.length - 1 ? '1.5px solid rgba(15, 23, 42, 0.8)' : 'none',
            }}
            title={`${seg.label}: ${seg.count} (${seg.percentage}%)`}
          >
            {/* Tooltip on hover */}
            <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] font-sans font-medium text-white shadow-xl z-50 whitespace-nowrap">
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: seg.color }} />
              {seg.label}: <strong>{seg.count}</strong> ({seg.percentage}%)
            </div>
          </div>
        ))}
      </div>

      {showLabels && (
        <div className="flex items-center flex-wrap gap-2 text-[10px] text-slate-400 font-mono mt-1">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: seg.color }} />
              <span>{seg.label} ({seg.percentage}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
