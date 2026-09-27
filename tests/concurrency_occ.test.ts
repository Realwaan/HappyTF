import { describe, it, expect } from 'vitest';

interface TicketState {
  id: string;
  title: string;
  status: string;
  version: number;
}

class TicketService {
  private tickets: Map<string, TicketState> = new Map();

  create(ticket: Omit<TicketState, 'version'>): TicketState {
    const record: TicketState = { ...ticket, version: 1 };
    this.tickets.set(record.id, record);
    return record;
  }

  get(id: string): TicketState | undefined {
    return this.tickets.get(id);
  }

  updateWithOCC(
    id: string,
    updates: Partial<Omit<TicketState, 'id' | 'version'>>,
    expectedVersion: number
  ): { success: boolean; error?: string; ticket?: TicketState } {
    const existing = this.tickets.get(id);
    if (!existing) {
      return { success: false, error: 'Ticket not found' };
    }

    if (existing.version !== expectedVersion) {
      return {
        success: false,
        error: `409 Conflict: Concurrent modification detected. Current version is ${existing.version}, expected ${expectedVersion}`,
      };
    }

    const updated: TicketState = {
      ...existing,
      ...updates,
      version: existing.version + 1,
    };
    this.tickets.set(id, updated);
    return { success: true, ticket: updated };
  }
}

describe('Optimistic Concurrency Control (OCC) & Race Condition Guards', () => {
  it('successfully updates ticket when expected version matches', () => {
    const service = new TicketService();
    const ticket = service.create({ id: 't-101', title: 'Login Bug', status: 'TODO' });

    const result = service.updateWithOCC('t-101', { status: 'IN_PROGRESS' }, 1);
    expect(result.success).toBe(true);
    expect(result.ticket?.version).toBe(2);
    expect(result.ticket?.status).toBe('IN_PROGRESS');
  });

  it('rejects stale concurrent update when version has progressed', () => {
    const service = new TicketService();
    service.create({ id: 't-102', title: 'Payment Error', status: 'OPEN' });

    // Client A updates version 1 -> 2
    const resA = service.updateWithOCC('t-102', { status: 'IN_PROGRESS' }, 1);
    expect(resA.success).toBe(true);

    // Client B still has version 1 cached and attempts to update
    const resB = service.updateWithOCC('t-102', { title: 'Payment Gateway Timeout' }, 1);
    expect(resB.success).toBe(false);
    expect(resB.error).toContain('409 Conflict');

    // State remains what Client A set
    const current = service.get('t-102');
    expect(current?.version).toBe(2);
    expect(current?.status).toBe('IN_PROGRESS');
  });

  it('handles simultaneous race conditions deterministically', async () => {
    const service = new TicketService();
    service.create({ id: 't-103', title: 'Security Advisory', status: 'NEW' });

    // Worker 1 and Worker 2 both try to transition the ticket from version 1
    const attempts = [
      () => service.updateWithOCC('t-103', { status: 'CLAIMED_BY_AGENT_1' }, 1),
      () => service.updateWithOCC('t-103', { status: 'CLAIMED_BY_AGENT_2' }, 1),
    ];

    const results = attempts.map((fn) => fn());
    const successfulAttempts = results.filter((r) => r.success);
    const rejectedAttempts = results.filter((r) => !r.success);

    // Exactly one must succeed, and exactly one must be rejected with 409 Conflict
    expect(successfulAttempts.length).toBe(1);
    expect(rejectedAttempts.length).toBe(1);
    expect(rejectedAttempts[0].error).toContain('409 Conflict');
  });
});
