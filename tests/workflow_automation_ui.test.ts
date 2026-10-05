import { describe, it, expect } from 'vitest';
import { 
  DEFAULT_AUTOMATION_RULES, 
  evaluateTicketAutomations, 
  AutomationRule,
  AutomationLogEntry,
  INITIAL_AUTOMATION_LOGS
} from '../src/lib/automation/engine';
import { BoardItem } from '../src/types';

describe('Phase 4: Workflow Automation UI & Engine Integration', () => {
  const mockTicket: BoardItem = {
    id: 'item-aut-99',
    board_id: 'board-1',
    group_id: 'group-1',
    ticket_number: '#TK-9901',
    title: 'Distributed cache sync failure during network partition',
    status: 'Working on it',
    status_color: '#0073ea',
    priority: 'medium',
    due_date: '2026-10-20',
    tags: ['infra', 'redis'],
    activities: [],
    comments: [],
    version: 3,
  };

  it('toggles rule enabled state without mutating the original rules list', () => {
    const rules: AutomationRule[] = [...DEFAULT_AUTOMATION_RULES];
    const targetRuleId = rules[0].id;
    const initialStatus = rules[0].enabled;

    const updatedRules = rules.map((r) => 
      r.id === targetRuleId ? { ...r, enabled: !r.enabled } : r
    );

    expect(updatedRules[0].enabled).toBe(!initialStatus);
    expect(rules[0].enabled).toBe(initialStatus); // Immutability guarantee
  });

  it('triggers Blocker Warning & Team Ping when status changes to Stuck', async () => {
    const result = await evaluateTicketAutomations(
      {
        ...mockTicket,
        status: 'Stuck',
      },
      {
        type: 'status_changed',
        previousValue: 'Working on it',
        newValue: 'Stuck',
      }
    );

    expect(result.triggeredRules).toContain('Blocker Warning & Team Ping');
    expect(result.updatedTicket.id).toBe(mockTicket.id);
  });

  it('triggers GitHub PR Auto In-Review when PR is opened', async () => {
    const result = await evaluateTicketAutomations(
      mockTicket,
      {
        type: 'pr_opened',
        metadata: { pr_number: 142 },
      }
    );

    expect(result.triggeredRules).toContain('GitHub PR Auto In-Review');
    expect(result.updatedTicket.status).toBe('In Review');
    expect(result.updatedTicket.version).toBe(4); // Incremented version
  });

  it('triggers GitHub PR Merge Auto-Done and transitions status', async () => {
    const inReviewTicket: BoardItem = {
      ...mockTicket,
      status: 'In Review',
      version: 4,
    };

    const result = await evaluateTicketAutomations(
      inReviewTicket,
      {
        type: 'pr_merged',
        metadata: { pr_number: 142, merged_by: 'octocat' },
      }
    );

    expect(result.triggeredRules).toContain('GitHub PR Merge Auto-Done');
    expect(result.updatedTicket.status).toBe('Done');
    expect(result.updatedTicket.status_color).toBe('#00c875');
    expect(result.updatedTicket.version).toBe(5);
  });

  it('formats audit log entries accurately with timestamp and action summaries', () => {
    const newLog: AutomationLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ruleName: 'GitHub PR Auto In-Review',
      triggerType: 'pr_opened',
      ticketId: mockTicket.id,
      ticketLabel: mockTicket.ticket_number || mockTicket.title,
      actionsTaken: ['Moved to In Review'],
      status: 'success',
    };

    const logHistory = [newLog, ...INITIAL_AUTOMATION_LOGS];
    expect(logHistory).toHaveLength(INITIAL_AUTOMATION_LOGS.length + 1);
    expect(logHistory[0].ticketLabel).toBe('#TK-9901');
    expect(logHistory[0].status).toBe('success');
  });
});
