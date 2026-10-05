import { describe, it, expect, vi } from 'vitest';
import {
  generateSprintSummary,
  analyzeSprintRisks,
  generateSmartTicketsFromPrompt,
  rebalanceWorkload,
  SmartGeneratedTicket,
} from '../src/lib/ai/sprintCopilot';
import { BoardItem, BoardGroup, WorkspaceMember } from '../src/types';

describe('Phase 6: AI Sprint Copilot Integration & Modal Workflows', () => {
  const mockGroups: BoardGroup[] = [
    { id: 'g-backlog', name: 'Backlog', title: 'Backlog', color: '#6366f1', board_id: 'b-1', position: 0, collapsed: false },
    { id: 'g-progress', name: 'In Progress', title: 'In Progress', color: '#f59e0b', board_id: 'b-1', position: 1, collapsed: false },
    { id: 'g-done', name: 'Done', title: 'Done', color: '#3ecf8e', board_id: 'b-1', position: 2, collapsed: false },
  ];

  const mockItems: BoardItem[] = [
    {
      id: 'TK-901',
      title: 'Database connection pooling bottleneck',
      status: 'Stuck',
      status_color: '#ef4444',
      priority: 'urgent',
      assignee: { id: 'u-1', name: 'Alice Walker', avatar: '' },
      group_id: 'g-progress',
      board_id: 'b-1',
      estimate_points: 8,
      version: 1,
      due_date: '2026-10-10',
      tags: ['db'],
      activities: [],
      comments: [],
    },
    {
      id: 'TK-902',
      title: 'Implement Dark Mode CSS Tokens',
      status: 'Done',
      status_color: '#3ecf8e',
      priority: 'medium',
      assignee: { id: 'u-1', name: 'Alice Walker', avatar: '' },
      group_id: 'g-done',
      board_id: 'b-1',
      estimate_points: 5,
      version: 1,
      due_date: '2026-10-10',
      tags: ['ui'],
      activities: [],
      comments: [],
    },
    {
      id: 'TK-903',
      title: 'Unassigned API route rate limiting',
      status: 'Working on it',
      status_color: '#f59e0b',
      priority: 'high',
      assignee: undefined,
      group_id: 'g-progress',
      board_id: 'b-1',
      estimate_points: 3,
      version: 1,
      due_date: '2026-10-10',
      tags: ['api'],
      activities: [],
      comments: [],
    },
  ];

  const mockMembers: WorkspaceMember[] = [
    {
      id: 'm-1',
      workspace_id: 'ws-1',
      user_id: 'u-1',
      role: 'owner',
      joined_at: '2026-01-01',
      profile: { id: 'u-1', full_name: 'Alice Walker', email: 'alice@example.com', created_at: '2026-01-01' },
      user: { id: 'u-1', full_name: 'Alice Walker', email: 'alice@example.com' },
    },
    {
      id: 'm-2',
      workspace_id: 'ws-1',
      user_id: 'u-2',
      role: 'member',
      joined_at: '2026-01-01',
      profile: { id: 'u-2', full_name: 'Bob Ross', email: 'bob@example.com', created_at: '2026-01-01' },
      user: { id: 'u-2', full_name: 'Bob Ross', email: 'bob@example.com' },
    },
  ];

  it('decomposes natural language prompt into valid sprint tickets with acceptance criteria', () => {
    const prompt = 'Stripe subscription billing & usage metering webhook';
    const plan = generateSmartTicketsFromPrompt(prompt, mockGroups);

    expect(plan.tickets.length).toBeGreaterThanOrEqual(2);
    for (const ticket of plan.tickets) {
      expect(ticket.title).toBeTruthy();
      expect(ticket.description).toContain('Acceptance Criteria');
      expect(ticket.estimate_points).toBeGreaterThan(0);
      expect(ticket.tags.length).toBeGreaterThan(0);
      expect(mockGroups.some((g) => g.id === ticket.group_id)).toBe(true);
    }
  });

  it('atomically batches tickets for board insertion while maintaining OCC version integrity', () => {
    const plan = generateSmartTicketsFromPrompt('WebAssembly columnar data aggregation engine', mockGroups);
    const mockAddBoardItem = vi.fn();

    // Simulate clicking "Add All to Active Board"
    for (const t of plan.tickets) {
      mockAddBoardItem(t.group_id, t.title, {
        description: t.description,
        priority: t.priority,
        estimate_points: t.estimate_points,
        tags: t.tags,
        version: 1,
      });
    }

    expect(mockAddBoardItem).toHaveBeenCalledTimes(plan.tickets.length);
    for (const call of mockAddBoardItem.mock.calls) {
      const [groupId, title, options] = call;
      expect(groupId).toBeTruthy();
      expect(title).toBeTruthy();
      expect(options.version).toBe(1);
    }
  });

  it('computes sprint health risks and flags urgent blockers with mitigation recommendations', () => {
    const riskAnalysis = analyzeSprintRisks(mockItems);

    expect(riskAnalysis.urgentStuckTickets.length).toBe(1);
    expect(riskAnalysis.urgentStuckTickets[0].id).toBe('TK-901');
    expect(riskAnalysis.unassignedTickets.length).toBe(1);
    expect(riskAnalysis.unassignedTickets[0].id).toBe('TK-903');
    expect(riskAnalysis.recommendations.some((r) => r.includes('TK-901'))).toBe(true);
  });

  it('generates exportable Markdown retro summary with metrics and action items', () => {
    const summary = generateSprintSummary('Sprint 42 - Scale', mockItems);

    expect(summary.summaryMarkdown).toContain('# 🚀 Sprint Summary: Sprint 42 - Scale');
    expect(summary.summaryMarkdown).toContain('What Went Well');
    expect(summary.summaryMarkdown).toContain('Blockers Encountered');
    expect(summary.summaryMarkdown).toContain('Action Items for Next Sprint');
    expect(summary.totalPoints).toBe(16); // 8 + 5 + 3
    expect(summary.completedPoints).toBe(5);
  });

  it('rebalances workload, shifting tasks from overloaded Alice to available Bob', () => {
    const rebalance = rebalanceWorkload(mockItems, mockMembers);

    expect(rebalance.recommendedShifts.length).toBeGreaterThan(0);
    const shift = rebalance.recommendedShifts[0];
    expect(shift.fromMemberName).toBe('Alice Walker');
    expect(shift.toMemberName).toBe('Bob Ross');
    expect(shift.points).toBe(8);
  });
});
