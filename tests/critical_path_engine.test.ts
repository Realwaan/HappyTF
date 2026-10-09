import { describe, it, expect } from 'vitest';
import {
  detectDependencyCycle,
  calculateCriticalPath,
  cascadeScheduleShift,
  addDependencyLink,
  removeDependencyLink,
} from '../src/lib/timeline/criticalPathEngine';
import { BoardItem } from '../src/types';

const createMockItem = (
  id: string,
  title: string,
  startDate: string,
  dueDate: string,
  blockedBy: string[] = [],
  blocks: string[] = [],
  version = 1
): BoardItem => ({
  id,
  board_id: 'board-test',
  group_id: 'group-1',
  ticket_number: `TK-${id}`,
  title,
  status: 'Working on it',
  status_color: '#3b82f6',
  priority: 'medium',
  start_date: startDate,
  due_date: dueDate,
  blocked_by: blockedBy,
  blocks: blocks,
  tags: [],
  activities: [],
  comments: [],
  version,
});

describe('Critical Path Method (CPM) & Dependency Engine', () => {
  describe('Dependency Cycle Detection', () => {
    it('detects direct self-dependency as circular', () => {
      const items = [createMockItem('A', 'Task A', '2026-10-01', '2026-10-03')];
      expect(detectDependencyCycle(items, 'A', 'A')).toBe(true);
    });

    it('permits valid linear dependencies without cycles', () => {
      const items = [
        createMockItem('A', 'Task A', '2026-10-01', '2026-10-03', [], ['B']),
        createMockItem('B', 'Task B', '2026-10-04', '2026-10-06', ['A'], ['C']),
        createMockItem('C', 'Task C', '2026-10-07', '2026-10-09', ['B'], []),
      ];
      // Adding D depends on C is valid
      expect(detectDependencyCycle(items, 'C', 'D')).toBe(false);
    });

    it('detects indirect circular dependencies (A -> B -> C -> A)', () => {
      const items = [
        createMockItem('A', 'Task A', '2026-10-01', '2026-10-03', [], ['B']),
        createMockItem('B', 'Task B', '2026-10-04', '2026-10-06', ['A'], ['C']),
        createMockItem('C', 'Task C', '2026-10-07', '2026-10-09', ['B'], []),
      ];
      // Trying to make A depend on C would create C -> A -> B -> C cycle!
      expect(detectDependencyCycle(items, 'C', 'A')).toBe(true);
    });
  });

  describe('Critical Path Calculation', () => {
    it('correctly calculates critical path for sequential and parallel tasks', () => {
      // Scenario:
      // A (3 days) -> B (4 days) -> D (2 days) = 9 days total (Critical Path)
      // A (3 days) -> C (2 days) -> D (2 days) = 7 days total (Float of 2 days on C)
      const items: BoardItem[] = [
        createMockItem('A', 'Arch Spec', '2026-10-01', '2026-10-03', [], ['B', 'C']),
        createMockItem('B', 'Core Engine', '2026-10-04', '2026-10-07', ['A'], ['D']),
        createMockItem('C', 'Design Tokens', '2026-10-04', '2026-10-05', ['A'], ['D']),
        createMockItem('D', 'QA Verification', '2026-10-08', '2026-10-09', ['B', 'C'], []),
      ];

      const result = calculateCriticalPath(items);

      expect(result.hasCycle).toBe(false);
      expect(result.totalProjectDurationDays).toBe(9);
      expect(result.criticalPathItemIds).toContain('A');
      expect(result.criticalPathItemIds).toContain('B');
      expect(result.criticalPathItemIds).toContain('D');
      expect(result.criticalPathItemIds).not.toContain('C');

      // Check float / slack
      expect(result.nodeMetrics['C'].slack).toBe(2);
      expect(result.nodeMetrics['C'].isCritical).toBe(false);
      expect(result.nodeMetrics['B'].slack).toBe(0);
      expect(result.nodeMetrics['B'].isCritical).toBe(true);
    });

    it('handles multiple disconnected or independent tasks gracefully', () => {
      const items: BoardItem[] = [
        createMockItem('A', 'Independent 1', '2026-10-01', '2026-10-05'),
        createMockItem('B', 'Independent 2', '2026-10-01', '2026-10-08'),
      ];

      const result = calculateCriticalPath(items);
      expect(result.hasCycle).toBe(false);
      expect(result.criticalPathItemIds).toContain('B'); // B has longer duration
    });
  });

  describe('Schedule Cascading & OCC Safety', () => {
    it('cascades schedule shifts forward when prerequisite is delayed', () => {
      // A: Oct 1 - Oct 3. B: Oct 4 - Oct 6 (blocked by A).
      // Delay A by 3 days -> A becomes Oct 4 - Oct 6.
      // B must cascade to start on Oct 7 - Oct 9!
      const items: BoardItem[] = [
        createMockItem('A', 'Task A', '2026-10-01', '2026-10-03', [], ['B'], 1),
        createMockItem('B', 'Task B', '2026-10-04', '2026-10-06', ['A'], [], 1),
      ];

      const { updatedItems, shiftedCount } = cascadeScheduleShift(items, 'A', 3);

      expect(shiftedCount).toBe(2);
      const updatedA = updatedItems.find((i) => i.id === 'A')!;
      const updatedB = updatedItems.find((i) => i.id === 'B')!;

      expect(updatedA.start_date).toBe('2026-10-04');
      expect(updatedA.due_date).toBe('2026-10-06');
      expect(updatedA.version).toBe(2);

      expect(updatedB.start_date).toBe('2026-10-07');
      expect(updatedB.due_date).toBe('2026-10-09');
      expect(updatedB.version).toBe(2);
    });

    it('does not shift downstream task if it already has sufficient slack', () => {
      // A: Oct 1 - Oct 2. B: Oct 10 - Oct 12 (blocked by A).
      // Delay A by 2 days -> A ends Oct 4. B still starts Oct 10, no shift needed for B!
      const items: BoardItem[] = [
        createMockItem('A', 'Task A', '2026-10-01', '2026-10-02', [], ['B'], 1),
        createMockItem('B', 'Task B', '2026-10-10', '2026-10-12', ['A'], [], 1),
      ];

      const { updatedItems, shiftedCount } = cascadeScheduleShift(items, 'A', 2);

      expect(shiftedCount).toBe(1); // Only A shifted
      const updatedB = updatedItems.find((i) => i.id === 'B')!;
      expect(updatedB.start_date).toBe('2026-10-10');
      expect(updatedB.version).toBe(1); // Untouched
    });
  });

  describe('Dependency Link Mutations', () => {
    it('adds bidirectional dependency link between items and increments version', () => {
      const items: BoardItem[] = [
        createMockItem('A', 'Task A', '2026-10-01', '2026-10-03', [], [], 1),
        createMockItem('B', 'Task B', '2026-10-04', '2026-10-06', [], [], 1),
      ];

      const result = addDependencyLink(items, 'A', 'B'); // A blocks B (B is blocked by A)
      expect(result.success).toBe(true);

      const itemA = result.items.find((i) => i.id === 'A')!;
      const itemB = result.items.find((i) => i.id === 'B')!;

      expect(itemA.blocks).toContain('B');
      expect(itemA.version).toBe(2);
      expect(itemB.blocked_by).toContain('A');
      expect(itemB.version).toBe(2);
    });

    it('removes bidirectional dependency link cleanly', () => {
      const items: BoardItem[] = [
        createMockItem('A', 'Task A', '2026-10-01', '2026-10-03', [], ['B'], 2),
        createMockItem('B', 'Task B', '2026-10-04', '2026-10-06', ['A'], [], 2),
      ];

      const result = removeDependencyLink(items, 'A', 'B');
      expect(result.success).toBe(true);

      const itemA = result.items.find((i) => i.id === 'A')!;
      const itemB = result.items.find((i) => i.id === 'B')!;

      expect(itemA.blocks).not.toContain('B');
      expect(itemB.blocked_by).not.toContain('A');
    });
  });
});
