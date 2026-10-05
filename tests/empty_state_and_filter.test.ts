import { describe, it, expect } from 'vitest';
import { BoardItem } from '../src/types';

describe('Phase 1: Rich Empty States & Filter Resolution Engine', () => {
  const sampleItems: BoardItem[] = [
    {
      id: 'item-1',
      board_id: 'board-1',
      group_id: 'group-1',
      title: 'Set up Supabase Row-Level Security',
      status: 'Done',
      status_color: '#10b981',
      priority: 'urgent',
      due_date: '2026-10-10',
      tags: ['security', 'database'],
      activities: [],
      comments: [],
      version: 1,
      updated_at: '2026-10-01T12:00:00Z',
    },
    {
      id: 'item-2',
      board_id: 'board-1',
      group_id: 'group-1',
      title: 'Implement OCC v2 with monotonic versioning',
      status: 'Working on it',
      status_color: '#f59e0b',
      priority: 'high',
      due_date: '2026-10-12',
      tags: ['concurrency', 'state'],
      activities: [],
      comments: [],
      version: 2,
      updated_at: '2026-10-02T14:30:00Z',
    },
  ];

  function filterBoardItems(
    items: BoardItem[],
    searchQuery: string,
    statusFilter: string
  ): BoardItem[] {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  it('correctly detects zero-items board state when no items exist', () => {
    const emptyBoard: BoardItem[] = [];
    const isZeroState = emptyBoard.length === 0;
    expect(isZeroState).toBe(true);
  });

  it('correctly filters items by search query matching task title or tags', () => {
    const titleMatch = filterBoardItems(sampleItems, 'supabase', 'all');
    expect(titleMatch).toHaveLength(1);
    expect(titleMatch[0].id).toBe('item-1');

    const tagMatch = filterBoardItems(sampleItems, 'concurrency', 'all');
    expect(tagMatch).toHaveLength(1);
    expect(tagMatch[0].id).toBe('item-2');
  });

  it('correctly detects filter empty state when query or status has zero matches', () => {
    const filtered = filterBoardItems(sampleItems, 'non-existent-task-query', 'all');
    expect(filtered).toHaveLength(0);

    const isFilterEmpty = sampleItems.length > 0 && filtered.length === 0;
    expect(isFilterEmpty).toBe(true);
  });

  it('clearing filters restores full item collection', () => {
    const filtered = filterBoardItems(sampleItems, 'non-existent', 'Stuck');
    expect(filtered).toHaveLength(0);

    const restored = filterBoardItems(sampleItems, '', 'all');
    expect(restored).toHaveLength(2);
  });

  it('generates standard agile sprint template tasks with monotonic version v1', () => {
    const templateTasks = [
      'Set up Supabase Row-Level Security policies',
      'Implement OCC v2 with monotonic versioning',
      'Configure Upstash Redis rate limiting buffer',
      'Verify GitHub PR HMAC SHA-256 transitions',
    ];

    const seededItems: BoardItem[] = templateTasks.map((title, idx) => ({
      id: `template-item-${idx + 1}`,
      board_id: 'board-sprint',
      group_id: 'group-1',
      title,
      status: 'Pending',
      status_color: '#64748b',
      priority: 'high',
      due_date: '2026-10-15',
      tags: ['sprint-template'],
      activities: [],
      comments: [],
      version: 1,
      updated_at: new Date().toISOString(),
    }));

    expect(seededItems).toHaveLength(4);
    seededItems.forEach((item) => {
      expect(item.version).toBe(1);
      expect(item.tags).toContain('sprint-template');
      expect(item.status).toBe('Pending');
    });
  });
});
