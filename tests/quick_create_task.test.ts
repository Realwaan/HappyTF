import { describe, it, expect } from 'vitest';
import { getDefaultBoardGroups } from '../src/lib/mock-data';
import { BoardGroup } from '../src/types';

describe('Quick Create Task & Board Groups Fallback', () => {
  it('generates standard workflow groups for any board ID', () => {
    const groups = getDefaultBoardGroups('board-getting-started');

    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.name)).toEqual(['To Do', 'In Progress', 'Done']);
    expect(groups.every((g) => g.board_id === 'board-getting-started')).toBe(true);
    expect(groups[0].id).toContain('todo');
    expect(groups[0].color).toBe('#6366f1');
  });

  it('computes effective groups fallback when boardGroups is empty', () => {
    const emptyBoardGroups: BoardGroup[] = [];
    const activeBoardId = 'board-launchpad';

    const effectiveGroups =
      emptyBoardGroups.length > 0
        ? emptyBoardGroups
        : getDefaultBoardGroups(activeBoardId || 'default');

    expect(effectiveGroups).toHaveLength(3);
    expect(effectiveGroups[0].name).toBe('To Do');
    expect(effectiveGroups[0].id).toBe(`grp-${activeBoardId}-todo`);

    // Status Column select value should default to first available group, never blank
    const selectedGroupId = effectiveGroups[0]?.id || '';
    expect(selectedGroupId).toBeTruthy();
    expect(selectedGroupId).toBe('grp-board-launchpad-todo');
  });

  it('preserves custom boardGroups when defined on a board', () => {
    const customGroups: BoardGroup[] = [
      { id: 'grp-triage', board_id: 'board-custom', name: 'Triage', color: '#ec4899' },
      { id: 'grp-dev', board_id: 'board-custom', name: 'In Development', color: '#f59e0b' },
    ];

    const effectiveGroups =
      customGroups.length > 0
        ? customGroups
        : getDefaultBoardGroups('board-custom');

    expect(effectiveGroups).toHaveLength(2);
    expect(effectiveGroups[0].name).toBe('Triage');
  });
});
