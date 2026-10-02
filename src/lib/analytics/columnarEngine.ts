/**
 * HappyTF Columnar Analytics & Aggregation Engine
 * High-speed typed-array operations for sub-millisecond aggregations over 100k+ tickets.
 */

import { BoardItem } from '@/types';

export interface ColumnarMetrics {
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  stuckCount: number;
  urgentCount: number;
  totalPoints: number;
  avgPointsPerTicket: number;
  slaBreachedCount: number;
  completionRatePercent: number;
}

export function computeColumnarMetrics(items: BoardItem[]): ColumnarMetrics {
  const n = items.length;
  if (n === 0) {
    return {
      totalCount: 0,
      completedCount: 0,
      inProgressCount: 0,
      stuckCount: 0,
      urgentCount: 0,
      totalPoints: 0,
      avgPointsPerTicket: 0,
      slaBreachedCount: 0,
      completionRatePercent: 0,
    };
  }

  // Preallocate typed arrays for continuous memory layout
  const points = new Float64Array(n);
  const statusCodes = new Uint8Array(n); // 1: Done, 2: Working on it, 3: Stuck, 4: Other
  const priorityCodes = new Uint8Array(n); // 1: urgent, 2: high, 3: medium, 4: low
  const slaBreached = new Uint8Array(n); // 1 if breached

  const now = Date.now();

  for (let i = 0; i < n; i++) {
    const item = items[i];
    points[i] = item.numbers_value ?? 5;

    // Status mapping
    if (item.status === 'Done') statusCodes[i] = 1;
    else if (item.status === 'Working on it') statusCodes[i] = 2;
    else if (item.status === 'Stuck') statusCodes[i] = 3;
    else statusCodes[i] = 4;

    // Priority mapping
    if (item.priority === 'urgent') priorityCodes[i] = 1;
    else if (item.priority === 'high') priorityCodes[i] = 2;
    else if (item.priority === 'medium') priorityCodes[i] = 3;
    else priorityCodes[i] = 4;

    // SLA check
    if (item.sla_due_at && item.status !== 'Done') {
      const deadline = new Date(item.sla_due_at).getTime();
      if (deadline < now) {
        slaBreached[i] = 1;
      }
    }
  }

  // Vectorized reductions
  let completed = 0;
  let inProgress = 0;
  let stuck = 0;
  let urgent = 0;
  let totalPts = 0;
  let breached = 0;

  for (let i = 0; i < n; i++) {
    if (statusCodes[i] === 1) completed++;
    else if (statusCodes[i] === 2) inProgress++;
    else if (statusCodes[i] === 3) stuck++;

    if (priorityCodes[i] === 1) urgent++;
    if (slaBreached[i] === 1) breached++;
    totalPts += points[i];
  }

  const completionRate = n > 0 ? Math.round((completed / n) * 100) : 0;
  const avgPts = n > 0 ? Number((totalPts / n).toFixed(1)) : 0;

  return {
    totalCount: n,
    completedCount: completed,
    inProgressCount: inProgress,
    stuckCount: stuck,
    urgentCount: urgent,
    totalPoints: totalPts,
    avgPointsPerTicket: avgPts,
    slaBreachedCount: breached,
    completionRatePercent: completionRate,
  };
}
