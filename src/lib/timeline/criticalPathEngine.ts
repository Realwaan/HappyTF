import { BoardItem } from '../../types';

export interface NodeMetrics {
  duration: number;
  es: number; // Early Start (offset days from project start)
  ef: number; // Early Finish
  ls: number; // Late Start
  lf: number; // Late Finish
  slack: number; // Float / Slack days
  isCritical: boolean;
}

export interface CriticalPathResult {
  hasCycle: boolean;
  cycleIds?: string[];
  totalProjectDurationDays: number;
  criticalPathItemIds: string[];
  nodeMetrics: Record<string, NodeMetrics>;
}

/**
 * Calculates duration in integer days between two YYYY-MM-DD or ISO dates inclusive.
 */
export function calculateItemDurationDays(startDate?: string, dueDate?: string): number {
  if (!startDate || !dueDate) return 1;
  try {
    const s = new Date(startDate);
    const d = new Date(dueDate);
    if (isNaN(s.getTime()) || isNaN(d.getTime())) return 1;
    const diffMs = d.getTime() - s.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  } catch {
    return 1;
  }
}

/**
 * Helper to add days to a YYYY-MM-DD or ISO string.
 */
export function addDays(dateStr: string, days: number): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + days);
      return fallback.toISOString().split('T')[0];
    }
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

/**
 * Detects whether making `prerequisiteId` block `dependentId` would introduce a cycle.
 * Traverses from `dependentId` looking for `prerequisiteId`.
 */
export function detectDependencyCycle(
  items: BoardItem[],
  prerequisiteId: string,
  dependentId: string
): boolean {
  if (prerequisiteId === dependentId) return true;

  const itemMap = new Map<string, BoardItem>(items.map((i) => [i.id, i]));
  const visited = new Set<string>();

  // DFS from dependentId following existing "blocks" edges
  const queue = [dependentId];
  while (queue.length > 0) {
    const currId = queue.pop()!;
    if (currId === prerequisiteId) {
      return true; // Cycle found!
    }

    if (!visited.has(currId)) {
      visited.add(currId);
      const currItem = itemMap.get(currId);
      if (currItem) {
        const successors = new Set<string>([...(currItem.blocks || [])]);
        // Also look for items whose blocked_by includes currId
        items.forEach((item) => {
          if (item.blocked_by && item.blocked_by.includes(currId)) {
            successors.add(item.id);
          }
        });

        for (const succ of successors) {
          if (!visited.has(succ)) {
            queue.push(succ);
          }
        }
      }
    }
  }

  return false;
}

/**
 * Calculates Critical Path using the Critical Path Method (CPM) algorithm.
 * Identifies the sequence of bottleneck tasks where slack === 0.
 */
export function calculateCriticalPath(items: BoardItem[]): CriticalPathResult {
  if (!items || items.length === 0) {
    return {
      hasCycle: false,
      totalProjectDurationDays: 0,
      criticalPathItemIds: [],
      nodeMetrics: {},
    };
  }

  const itemMap = new Map<string, BoardItem>(items.map((i) => [i.id, i]));
  const durations: Record<string, number> = {};
  const predecessors: Record<string, Set<string>> = {};
  const successors: Record<string, Set<string>> = {};

  // Build symmetrical dependency graph
  items.forEach((item) => {
    durations[item.id] = calculateItemDurationDays(item.start_date, item.due_date);
    if (!predecessors[item.id]) predecessors[item.id] = new Set();
    if (!successors[item.id]) successors[item.id] = new Set();
  });

  items.forEach((item) => {
    // blocked_by indicates predecessors
    (item.blocked_by || []).forEach((predId) => {
      if (itemMap.has(predId)) {
        predecessors[item.id].add(predId);
        if (!successors[predId]) successors[predId] = new Set();
        successors[predId].add(item.id);
      }
    });

    // blocks indicates successors
    (item.blocks || []).forEach((succId) => {
      if (itemMap.has(succId)) {
        successors[item.id].add(succId);
        if (!predecessors[succId]) predecessors[succId] = new Set();
        predecessors[succId].add(item.id);
      }
    });
  });

  // Kahn's Algorithm for Topological Sort & Cycle Detection
  const inDegree: Record<string, number> = {};
  items.forEach((item) => {
    inDegree[item.id] = predecessors[item.id].size;
  });

  const zeroInQueue: string[] = items
    .filter((i) => inDegree[i.id] === 0)
    .map((i) => i.id);

  const topoOrder: string[] = [];
  while (zeroInQueue.length > 0) {
    const u = zeroInQueue.shift()!;
    topoOrder.push(u);

    for (const v of successors[u]) {
      inDegree[v]--;
      if (inDegree[v] === 0) {
        zeroInQueue.push(v);
      }
    }
  }

  // If not all items are sorted, a cycle exists
  if (topoOrder.length < items.length) {
    const cycleNodes = items
      .filter((i) => !topoOrder.includes(i.id))
      .map((i) => i.id);
    return {
      hasCycle: true,
      cycleIds: cycleNodes,
      totalProjectDurationDays: 0,
      criticalPathItemIds: [],
      nodeMetrics: {},
    };
  }

  // 1. Forward Pass (Calculate Early Start & Early Finish)
  const es: Record<string, number> = {};
  const ef: Record<string, number> = {};

  for (const u of topoOrder) {
    let maxPredecessorEf = 0;
    for (const p of predecessors[u]) {
      maxPredecessorEf = Math.max(maxPredecessorEf, ef[p]);
    }
    es[u] = maxPredecessorEf;
    ef[u] = es[u] + durations[u];
  }

  // Total project duration is the maximum Early Finish of all nodes
  let totalProjectDuration = 0;
  items.forEach((item) => {
    totalProjectDuration = Math.max(totalProjectDuration, ef[item.id] || 0);
  });

  // 2. Backward Pass (Calculate Late Start & Late Finish)
  const ls: Record<string, number> = {};
  const lf: Record<string, number> = {};

  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const u = topoOrder[i];
    if (successors[u].size === 0) {
      lf[u] = totalProjectDuration;
    } else {
      let minSuccessorLs = Infinity;
      for (const s of successors[u]) {
        minSuccessorLs = Math.min(minSuccessorLs, ls[s]);
      }
      lf[u] = minSuccessorLs;
    }
    ls[u] = lf[u] - durations[u];
  }

  // 3. Compute Slack & Identify Critical Path
  const nodeMetrics: Record<string, NodeMetrics> = {};
  const criticalPathItemIds: string[] = [];

  items.forEach((item) => {
    const id = item.id;
    const slack = Math.max(0, (ls[id] ?? 0) - (es[id] ?? 0));
    const isCritical = slack === 0;

    nodeMetrics[id] = {
      duration: durations[id],
      es: es[id] ?? 0,
      ef: ef[id] ?? 0,
      ls: ls[id] ?? 0,
      lf: lf[id] ?? 0,
      slack,
      isCritical,
    };

    if (isCritical) {
      criticalPathItemIds.push(id);
    }
  });

  return {
    hasCycle: false,
    totalProjectDurationDays: totalProjectDuration,
    criticalPathItemIds,
    nodeMetrics,
  };
}

/**
 * Cascades schedule changes forward to dependent items when a prerequisite is shifted.
 * Preserves OCC monotonic version integrity.
 */
export function cascadeScheduleShift(
  items: BoardItem[],
  movedItemId: string,
  daysShifted: number
): { updatedItems: BoardItem[]; shiftedCount: number } {
  if (daysShifted === 0) return { updatedItems: items, shiftedCount: 0 };

  const itemMap = new Map<string, BoardItem>(items.map((i) => [i.id, { ...i }]));
  const target = itemMap.get(movedItemId);
  if (!target) return { updatedItems: items, shiftedCount: 0 };

  const shiftedItemIds = new Set<string>();

  // 1. Shift the primary moved item
  target.start_date = target.start_date ? addDays(target.start_date, daysShifted) : undefined;
  target.due_date = addDays(target.due_date, daysShifted);
  target.version = (target.version || 1) + 1;
  shiftedItemIds.add(movedItemId);

  // 2. Cascade down the dependency tree
  const queue = [movedItemId];

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const parent = itemMap.get(parentId)!;
    if (!parent.due_date) continue;

    const parentDueDate = new Date(parent.due_date);

    // Find all items directly blocked by parent
    const dependents: BoardItem[] = [];
    itemMap.forEach((item) => {
      const isBlocked =
        (item.blocked_by && item.blocked_by.includes(parentId)) ||
        (parent.blocks && parent.blocks.includes(item.id));
      if (isBlocked && item.id !== parentId) {
        dependents.push(item);
      }
    });

    for (const dep of dependents) {
      const depStartDate = dep.start_date ? new Date(dep.start_date) : new Date(dep.due_date);
      // If dependent starts on or before parent finishes, shift it forward!
      if (depStartDate.getTime() <= parentDueDate.getTime()) {
        const duration = calculateItemDurationDays(dep.start_date, dep.due_date);
        // New start date is 1 day after parent due date
        const nextDayAfterParent = new Date(parentDueDate);
        nextDayAfterParent.setDate(nextDayAfterParent.getDate() + 1);

        const newStartStr = nextDayAfterParent.toISOString().split('T')[0];
        const newDueStr = addDays(newStartStr, duration - 1);

        dep.start_date = newStartStr;
        dep.due_date = newDueStr;
        dep.version = (dep.version || 1) + 1;
        shiftedItemIds.add(dep.id);

        queue.push(dep.id);
      }
    }
  }

  return {
    updatedItems: Array.from(itemMap.values()),
    shiftedCount: shiftedItemIds.size,
  };
}

/**
 * Adds a bidirectional dependency link between prerequisite and dependent.
 * `prerequisiteId` blocks `dependentId` (i.e. `dependentId` is blocked by `prerequisiteId`).
 */
export function addDependencyLink(
  items: BoardItem[],
  prerequisiteId: string,
  dependentId: string
): { success: boolean; error?: string; items: BoardItem[] } {
  if (detectDependencyCycle(items, prerequisiteId, dependentId)) {
    return {
      success: false,
      error: 'Cannot add dependency: this would create a circular dependency cycle.',
      items,
    };
  }

  const updatedItems = items.map((item) => {
    if (item.id === prerequisiteId) {
      const blocks = new Set(item.blocks || []);
      blocks.add(dependentId);
      return {
        ...item,
        blocks: Array.from(blocks),
        version: (item.version || 1) + 1,
      };
    }
    if (item.id === dependentId) {
      const blockedBy = new Set(item.blocked_by || []);
      blockedBy.add(prerequisiteId);
      return {
        ...item,
        blocked_by: Array.from(blockedBy),
        version: (item.version || 1) + 1,
      };
    }
    return item;
  });

  return {
    success: true,
    items: updatedItems,
  };
}

/**
 * Removes a bidirectional dependency link between prerequisite and dependent.
 */
export function removeDependencyLink(
  items: BoardItem[],
  prerequisiteId: string,
  dependentId: string
): { success: boolean; items: BoardItem[] } {
  const updatedItems = items.map((item) => {
    if (item.id === prerequisiteId) {
      return {
        ...item,
        blocks: (item.blocks || []).filter((id) => id !== dependentId),
        version: (item.version || 1) + 1,
      };
    }
    if (item.id === dependentId) {
      return {
        ...item,
        blocked_by: (item.blocked_by || []).filter((id) => id !== prerequisiteId),
        version: (item.version || 1) + 1,
      };
    }
    return item;
  });

  return {
    success: true,
    items: updatedItems,
  };
}
