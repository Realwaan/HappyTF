/**
 * mondayDB Architecture: Columnar Aggregation & Rollup Engine
 * 
 * Computes high-throughput columnar aggregations for Groups and Boards.
 * Powers the signature Vibe status battery distribution bar, numeric rollups,
 * and nested sub-item completion metrics.
 */

import { BoardItem } from '../../types';
import { GroupAggregation, BoardAggregation, StatusBatterySegment } from './types';

// Standard Vibe status colors
const STATUS_COLORS: Record<string, string> = {
  'Done': '#10b981',
  'Working on it': '#f59e0b',
  'In Review': '#8b5cf6',
  'Stuck': '#ef4444',
  'Pending': '#64748b',
};

/**
 * Calculates status battery distribution
 */
export function calculateStatusBattery(items: BoardItem[]): StatusBatterySegment[] {
  if (items.length === 0) return [];

  const counts: Record<string, number> = {};
  items.forEach((item) => {
    const s = item.status || 'Pending';
    counts[s] = (counts[s] || 0) + 1;
  });

  const total = items.length;
  const segments: StatusBatterySegment[] = [];

  // Order priority: Done, Working on it, In Review, Stuck, Pending
  const orderedKeys = ['Done', 'Working on it', 'In Review', 'Stuck', 'Pending'];
  const allKeys = Array.from(new Set([...orderedKeys, ...Object.keys(counts)]));

  for (const label of allKeys) {
    const count = counts[label];
    if (count && count > 0) {
      segments.push({
        label,
        color: STATUS_COLORS[label] || '#94a3b8',
        count,
        percentage: Math.round((count / total) * 100),
      });
    }
  }

  return segments;
}

/**
 * Computes aggregations for a single Group of items
 */
export function calculateGroupAggregation(groupId: string, items: BoardItem[]): GroupAggregation {
  const groupItems = items.filter((item) => item.group_id === groupId);
  const itemCount = groupItems.length;

  let subItemCount = 0;
  let subItemsCompleted = 0;
  let numbersSum = 0;

  const validDates: number[] = [];

  groupItems.forEach((item) => {
    // Sub-items calculation (support both sub_items and subtasks)
    const subs = (item.sub_items && item.sub_items.length > 0) 
      ? item.sub_items 
      : (item.subtasks || []);

    if (subs.length > 0) {
      subItemCount += subs.length;
      subItemsCompleted += subs.filter((st) => st.completed || ('status' in st && st.status === 'Done')).length;
    }

    // Numbers calculation (use numbers_value if present, otherwise extract from ticket or default)
    if (typeof item.numbers_value === 'number') {
      numbersSum += item.numbers_value;
    } else if (item.ticket_number) {
      const match = item.ticket_number.match(/\d+/);
      if (match) {
        numbersSum += parseInt(match[0], 10) % 100; // normalized demo metric
      }
    }

    if (item.due_date) {
      const d = new Date(item.due_date).getTime();
      if (!isNaN(d)) validDates.push(d);
    }
  });

  const subItemProgressPercent = subItemCount > 0 
    ? Math.round((subItemsCompleted / subItemCount) * 100) 
    : 0;

  const numbersAvg = itemCount > 0 ? Math.round((numbersSum / itemCount) * 10) / 10 : 0;

  let timelineSpan: GroupAggregation['timelineSpan'];
  if (validDates.length > 0) {
    const minDate = new Date(Math.min(...validDates));
    const maxDate = new Date(Math.max(...validDates));
    const days = Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24));
    timelineSpan = {
      earliest: minDate.toISOString().split('T')[0],
      latest: maxDate.toISOString().split('T')[0],
      days: Math.max(days, 1),
    };
  }

  return {
    groupId,
    itemCount,
    subItemCount,
    subItemsCompleted,
    subItemProgressPercent,
    statusBattery: calculateStatusBattery(groupItems),
    numbersSum,
    numbersAvg,
    timelineSpan,
  };
}

/**
 * Computes aggregations across the entire board
 */
export function calculateBoardAggregation(items: BoardItem[]): BoardAggregation {
  const totalItems = items.length;
  let totalSubItems = 0;
  let totalSubItemsCompleted = 0;
  let totalNumbersSum = 0;

  items.forEach((item) => {
    const subs = (item.sub_items && item.sub_items.length > 0)
      ? item.sub_items
      : (item.subtasks || []);

    if (subs.length > 0) {
      totalSubItems += subs.length;
      totalSubItemsCompleted += subs.filter((st) => st.completed || ('status' in st && st.status === 'Done')).length;
    }

    if (typeof item.numbers_value === 'number') {
      totalNumbersSum += item.numbers_value;
    } else if (item.ticket_number) {
      const match = item.ticket_number.match(/\d+/);
      if (match) totalNumbersSum += parseInt(match[0], 10) % 100;
    }
  });

  const overallProgressPercent = totalSubItems > 0
    ? Math.round((totalSubItemsCompleted / totalSubItems) * 100)
    : 0;

  const averageNumbers = totalItems > 0 
    ? Math.round((totalNumbersSum / totalItems) * 10) / 10 
    : 0;

  return {
    totalItems,
    totalSubItems,
    totalSubItemsCompleted,
    overallProgressPercent,
    statusBattery: calculateStatusBattery(items),
    totalNumbersSum,
    averageNumbers,
  };
}
