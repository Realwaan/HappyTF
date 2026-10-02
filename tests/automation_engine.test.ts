import { describe, it, expect } from 'vitest';
import { evaluateTicketAutomations, DEFAULT_AUTOMATION_RULES } from '../src/lib/automation/engine';
import { BoardItem } from '../src/types';

describe('Phase 4: Workflow Automation Engine (IFTTT)', () => {
  const baseTicket: BoardItem = {
    id: 'item-101',
    board_id: 'board-1',
    group_id: 'group-1',
    ticket_number: '#TK-101',
    title: 'PostgreSQL connection pool exhausted in production',
    status: 'Pending',
    status_color: '#c4c4c4',
    priority: 'medium',
    due_date: '2026-10-15',
    tags: ['database'],
    activities: [],
    comments: [],
    version: 1,
  };

  it('Escalates SLA deadline to 2 hours when priority changes to urgent', async () => {
    const updatedWithUrgent: BoardItem = {
      ...baseTicket,
      priority: 'urgent',
    };

    const before = Date.now();
    const result = await evaluateTicketAutomations(
      updatedWithUrgent,
      {
        type: 'priority_changed',
        previousValue: 'medium',
        newValue: 'urgent',
      }
    );

    expect(result.triggeredRules).toContain('Urgent SLA Escalation & Discord Alert');
    expect(result.updatedTicket.sla_due_at).toBeDefined();

    const deadlineTime = new Date(result.updatedTicket.sla_due_at!).getTime();
    const expectedApprox = before + 2 * 3600 * 1000;
    // Within 5 seconds tolerance
    expect(Math.abs(deadlineTime - expectedApprox)).toBeLessThan(5000);
    expect(result.updatedTicket.version).toBe(2);
  });

  it('Auto-advances ticket to "In Review" on PR opened trigger', async () => {
    const result = await evaluateTicketAutomations(
      baseTicket,
      {
        type: 'pr_opened',
        metadata: { pr_number: 99 },
      }
    );

    expect(result.triggeredRules).toContain('GitHub PR Auto In-Review');
    expect(result.updatedTicket.status).toBe('In Review');
    expect(result.updatedTicket.status_color).toBe('#a25ddc');
  });

  it('Auto-advances ticket to "Done" on PR merged trigger', async () => {
    const result = await evaluateTicketAutomations(
      {
        ...baseTicket,
        status: 'In Review',
      },
      {
        type: 'pr_merged',
        metadata: { pr_number: 100 },
      }
    );

    expect(result.triggeredRules).toContain('GitHub PR Merge Auto-Done');
    expect(result.updatedTicket.status).toBe('Done');
    expect(result.updatedTicket.status_color).toBe('#00c875');
  });
});
