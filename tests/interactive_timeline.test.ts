import { describe, it, expect } from 'vitest';
import {
  calculateItemDurationDays,
  addDays,
  detectDependencyCycle,
  calculateCriticalPath,
  cascadeScheduleShift,
  addDependencyLink,
  removeDependencyLink,
} from '../src/lib/timeline/criticalPathEngine';
import { BoardItem } from '../src/types';

describe('Phase 7: Interactive Gantt & Critical Path Engine Tests', () => {
  const baseItem: BoardItem = {
    id: 'tk-1',
    board_id: 'board-1',
    group_id: 'group-1',
    title: 'Database Schema Migration',
    status: 'Working on it',
    status_color: '#f59e0b',
    priority: 'high',
    start_date: '2026-10-10',
    due_date: '2026-10-12',
    tags: ['Database'],
    activities: [],
    comments: [],
    version: 1,
  };

  it('calculates duration in days correctly', () => {
    expect(calculateItemDurationDays('2026-10-10', '2026-10-12')).toBe(3);
    expect(calculateItemDurationDays('2026-10-10', '2026-10-10')).toBe(1);
    expect(calculateItemDurationDays(undefined, undefined)).toBe(1);
  });

  it('adds days correctly to ISO date strings', () => {
    expect(addDays('2026-10-10', 3)).toBe('2026-10-13');
    expect(addDays('2026-10-10', -2)).toBe('2026-10-08');
  });

  it('identifies critical bottleneck path and calculates float correctly', () => {
    const item1: BoardItem = {
      ...baseItem,
      id: 'task-1',
      start_date: '2026-10-01',
      due_date: '2026-10-03', // 3 days
      blocks: ['task-2', 'task-3'],
    };

    const item2: BoardItem = {
      ...baseItem,
      id: 'task-2',
      start_date: '2026-10-04',
      due_date: '2026-10-07', // 4 days (Total path = 3 + 4 + 2 = 9 days)
      blocked_by: ['task-1'],
      blocks: ['task-4'],
    };

    const item3: BoardItem = {
      ...baseItem,
      id: 'task-3',
      start_date: '2026-10-04',
      due_date: '2026-10-05', // 2 days (Total path = 3 + 2 + 2 = 7 days -> 2 days float)
      blocked_by: ['task-1'],
      blocks: ['task-4'],
    };

    const item4: BoardItem = {
      ...baseItem,
      id: 'task-4',
      start_date: '2026-10-08',
      due_date: '2026-10-09', // 2 days
      blocked_by: ['task-2', 'task-3'],
    };

    const cpm = calculateCriticalPath([item1, item2, item3, item4]);

    expect(cpm.hasCycle).toBe(false);
    expect(cpm.totalProjectDurationDays).toBe(9);
    expect(cpm.criticalPathItemIds).toEqual(expect.arrayContaining(['task-1', 'task-2', 'task-4']));
    expect(cpm.criticalPathItemIds).not.toContain('task-3');
    expect(cpm.nodeMetrics['task-3'].slack).toBe(2);
    expect(cpm.nodeMetrics['task-2'].slack).toBe(0);
  });

  it('detects cycles and blocks circular dependency additions', () => {
    const itemA: BoardItem = { ...baseItem, id: 'A', blocks: ['B'] };
    const itemB: BoardItem = { ...baseItem, id: 'B', blocked_by: ['A'], blocks: ['C'] };
    const itemC: BoardItem = { ...baseItem, id: 'C', blocked_by: ['B'] };

    const items = [itemA, itemB, itemC];

    // C blocking A would create circular loop (A -> B -> C -> A)
    const wouldCauseCycle = detectDependencyCycle(items, 'C', 'A');
    expect(wouldCauseCycle).toBe(true);

    const result = addDependencyLink(items, 'C', 'A');
    expect(result.success).toBe(false);
    expect(result.error).toContain('circular dependency');
  });

  it('cascades schedule forward when prerequisite is pushed back', () => {
    const parent: BoardItem = {
      ...baseItem,
      id: 'p-1',
      start_date: '2026-10-01',
      due_date: '2026-10-03',
      blocks: ['c-1'],
      version: 1,
    };

    const child: BoardItem = {
      ...baseItem,
      id: 'c-1',
      start_date: '2026-10-04',
      due_date: '2026-10-06',
      blocked_by: ['p-1'],
      version: 1,
    };

    // Delay parent by 3 days -> parent due date becomes Oct 6
    const { updatedItems, shiftedCount } = cascadeScheduleShift([parent, child], 'p-1', 3);

    expect(shiftedCount).toBe(2);
    const updatedParent = updatedItems.find((i) => i.id === 'p-1')!;
    const updatedChild = updatedItems.find((i) => i.id === 'c-1')!;

    expect(updatedParent.start_date).toBe('2026-10-04');
    expect(updatedParent.due_date).toBe('2026-10-06');
    expect(updatedParent.version).toBe(2);

    // Child must cascade to start the day after parent finishes (Oct 7)
    expect(updatedChild.start_date).toBe('2026-10-07');
    expect(updatedChild.due_date).toBe('2026-10-09');
    expect(updatedChild.version).toBe(2);
  });
});
