import { describe, it, expect } from 'vitest';
import {
  generateSprintSummary,
  analyzeSprintRisks,
  generateSmartTicketsFromPrompt,
  parseNaturalLanguageFilter,
  rebalanceWorkload,
} from '../src/lib/ai/sprintCopilot';
import { BoardItem, BoardGroup, WorkspaceMember } from '../src/types';

describe('AI Sprint Copilot Domain Engine', () => {
  const mockGroups: BoardGroup[] = [
    { id: 'group-backlog', name: 'Backlog', title: 'Backlog', color: '#6366f1', board_id: 'board-1', position: 0, collapsed: false },
    { id: 'group-active', name: 'In Progress', title: 'In Progress', color: '#f59e0b', board_id: 'board-1', position: 1, collapsed: false },
    { id: 'group-done', name: 'Done', title: 'Done', color: '#3ecf8e', board_id: 'board-1', position: 2, collapsed: false },
  ];

  const mockItems: BoardItem[] = [
    {
      id: 'TK-1001',
      title: 'Implement OAuth SSO',
      status: 'Done',
      status_color: '#3ecf8e',
      priority: 'high',
      assignee: { id: 'u-1', name: 'Alice Walker', avatar: '' },
      group_id: 'group-done',
      board_id: 'board-1',
      estimate_points: 5,
      version: 2,
      due_date: '2026-10-10',
      tags: ['auth'],
      activities: [],
      comments: [],
    },
    {
      id: 'TK-1002',
      title: 'Database connection pooling bottleneck',
      status: 'Stuck',
      status_color: '#ef4444',
      priority: 'urgent',
      assignee: { id: 'u-1', name: 'Alice Walker', avatar: '' },
      group_id: 'group-active',
      board_id: 'board-1',
      estimate_points: 8,
      version: 4,
      due_date: '2026-10-10',
      tags: ['db'],
      activities: [],
      comments: [],
    },
    {
      id: 'TK-1003',
      title: 'Dark mode contrast accessibility audit',
      status: 'Working on it',
      status_color: '#f59e0b',
      priority: 'medium',
      assignee: { id: 'u-2', name: 'Bob Dylan', avatar: '' },
      group_id: 'group-active',
      board_id: 'board-1',
      estimate_points: 3,
      version: 1,
      due_date: '2026-10-12',
      tags: ['a11y'],
      activities: [],
      comments: [],
    },
    {
      id: 'TK-1004',
      title: 'Mobile touch gesture flaky behavior',
      status: 'Working on it',
      status_color: '#f59e0b',
      priority: 'low',
      assignee: undefined,
      group_id: 'group-backlog',
      board_id: 'board-1',
      estimate_points: undefined,
      version: 1,
      due_date: '2026-10-15',
      tags: ['mobile'],
      activities: [],
      comments: [],
    },
  ];

  const mockMembers: WorkspaceMember[] = [
    {
      id: 'mem-1',
      workspace_id: 'ws-1',
      user_id: 'u-1',
      role: 'owner',
      joined_at: '2026-01-01',
      profile: { id: 'u-1', full_name: 'Alice Walker', email: 'alice@example.com', created_at: '2026-01-01' },
      user: { id: 'u-1', full_name: 'Alice Walker', email: 'alice@example.com' },
    },
    {
      id: 'mem-2',
      workspace_id: 'ws-1',
      user_id: 'u-2',
      role: 'member',
      joined_at: '2026-01-01',
      profile: { id: 'u-2', full_name: 'Bob Dylan', email: 'bob@example.com', created_at: '2026-01-01' },
      user: { id: 'u-2', full_name: 'Bob Dylan', email: 'bob@example.com' },
    },
    {
      id: 'mem-3',
      workspace_id: 'ws-1',
      user_id: 'u-3',
      role: 'member',
      joined_at: '2026-01-01',
      profile: { id: 'u-3', full_name: 'Charlie Davis', email: 'charlie@example.com', created_at: '2026-01-01' },
      user: { id: 'u-3', full_name: 'Charlie Davis', email: 'charlie@example.com' },
    },
  ];

  it('generates accurate sprint summary metrics and velocity insights', () => {
    const summary = generateSprintSummary('Sprint 42 - Core Platform', mockItems);

    expect(summary.boardName).toBe('Sprint 42 - Core Platform');
    expect(summary.totalTickets).toBe(4);
    expect(summary.completedTickets).toBe(1);
    expect(summary.totalPoints).toBe(16); // 5 + 8 + 3
    expect(summary.completedPoints).toBe(5);
    expect(summary.completionPercentage).toBe(25);
    expect(summary.stuckCount).toBe(1);
    expect(summary.velocityScore).toBeGreaterThan(0);
    expect(summary.retroHighlights.whatWentWell.length).toBeGreaterThan(0);
    expect(summary.retroHighlights.blockers.length).toBeGreaterThan(0);
  });

  it('analyzes sprint risks, detecting urgent stuck items and unassigned tasks', () => {
    const riskAnalysis = analyzeSprintRisks(mockItems);

    expect(['high', 'critical']).toContain(riskAnalysis.overallRisk);
    expect(riskAnalysis.riskScore).toBeGreaterThanOrEqual(60);
    expect(riskAnalysis.urgentStuckTickets.length).toBe(1);
    expect(riskAnalysis.urgentStuckTickets[0].id).toBe('TK-1002');
    expect(riskAnalysis.unassignedTickets.length).toBe(1);
    expect(riskAnalysis.unassignedTickets[0].id).toBe('TK-1004');
    expect(riskAnalysis.missingEstimatesCount).toBe(1);
    expect(riskAnalysis.recommendations.length).toBeGreaterThan(0);
  });

  it('generates smart decomposed tickets from natural language prompt', () => {
    const prompt = 'Implement Google and GitHub OAuth authentication with error boundary and refresh token handling';
    const plan = generateSmartTicketsFromPrompt(prompt, mockGroups);

    expect(plan.tickets.length).toBeGreaterThanOrEqual(2);
    for (const ticket of plan.tickets) {
      expect(ticket.title).toBeTruthy();
      expect(ticket.description).toContain('Acceptance Criteria');
      expect(ticket.priority).toMatch(/urgent|high|medium|low/);
      expect(ticket.estimate_points).toBeGreaterThan(0);
      expect(ticket.tags?.length).toBeGreaterThan(0);
      expect(mockGroups.some(g => g.id === ticket.group_id)).toBe(true);
    }
  });

  it('rebalances workload, identifying overloaded members and recommending shifts', () => {
    // Alice has 8 active points (TK-1001 is Done), Bob has 3, Charlie has 0
    const rebalance = rebalanceWorkload(mockItems, mockMembers);

    expect(rebalance.memberLoads.length).toBe(3);
    const aliceLoad = rebalance.memberLoads.find(m => m.name === 'Alice Walker');
    const charlieLoad = rebalance.memberLoads.find(m => m.name === 'Charlie Davis');

    expect(aliceLoad).toBeDefined();
    expect(aliceLoad?.points).toBe(8);
    expect(charlieLoad).toBeDefined();
    expect(charlieLoad?.points).toBe(0);
    expect(charlieLoad?.capacityStatus).toBe('available');
    expect(rebalance.recommendedShifts.length).toBeGreaterThan(0);
  });

  it('parses natural language filter queries into matching ticket IDs', () => {
    const stuckMatches = parseNaturalLanguageFilter('urgent stuck', mockItems);
    expect(stuckMatches.matchedItemIds).toContain('TK-1002');
    expect(stuckMatches.matchedItemIds.length).toBe(1);

    const aliceMatches = parseNaturalLanguageFilter('Alice Walker', mockItems);
    expect(aliceMatches.matchedItemIds).toContain('TK-1001');
    expect(aliceMatches.matchedItemIds).toContain('TK-1002');
    expect(aliceMatches.matchedItemIds.length).toBe(2);
  });
});
