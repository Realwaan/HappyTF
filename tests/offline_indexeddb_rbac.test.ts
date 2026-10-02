import { describe, it, expect } from 'vitest';
import { RbacAuthority } from '../src/lib/auth/rbac';
import { computeColumnarMetrics } from '../src/lib/analytics/columnarEngine';
import { BoardItem } from '../src/types';

describe('Phase 5: Enterprise RBAC Authority', () => {
  it('Allows Workspace Owner and Admin to delete tickets', () => {
    const ownerAllowed = RbacAuthority.canDeleteTicket(
      { userId: 'usr-1', workspaceRole: 'owner' },
      'usr-someone-else'
    );
    const adminAllowed = RbacAuthority.canDeleteTicket(
      { userId: 'usr-2', workspaceRole: 'admin' },
      'usr-someone-else'
    );

    expect(ownerAllowed).toBe(true);
    expect(adminAllowed).toBe(true);
  });

  it('Allows CapStoneFlow PM to delete tickets', () => {
    const pmAllowed = RbacAuthority.canDeleteTicket(
      { userId: 'usr-3', workspaceRole: 'member', capStoneFlowRole: 'PM' },
      'usr-someone-else'
    );
    expect(pmAllowed).toBe(true);
  });

  it('Allows ticket author to delete their own ticket', () => {
    const authorAllowed = RbacAuthority.canDeleteTicket(
      { userId: 'usr-4', workspaceRole: 'member' },
      'usr-4'
    );
    expect(authorAllowed).toBe(true);
  });

  it('Denies general members and viewers from deleting other people tickets', () => {
    const memberDenied = RbacAuthority.canDeleteTicket(
      { userId: 'usr-5', workspaceRole: 'member' },
      'usr-other'
    );
    const viewerDenied = RbacAuthority.canDeleteTicket(
      { userId: 'usr-6', workspaceRole: 'viewer' },
      'usr-other'
    );

    expect(memberDenied).toBe(false);
    expect(viewerDenied).toBe(false);
  });

  it('Enforces role constraints on claiming tickets', () => {
    // Developers and general members can claim
    expect(
      RbacAuthority.canClaimTicket({ userId: 'u-1', workspaceRole: 'member', capStoneFlowRole: 'Developer' })
    ).toBe(true);

    // Viewers cannot claim
    expect(
      RbacAuthority.canClaimTicket({ userId: 'u-2', workspaceRole: 'viewer' })
    ).toBe(false);

    // QA cannot claim Developer tickets
    expect(
      RbacAuthority.canClaimTicket({ userId: 'u-3', workspaceRole: 'member', capStoneFlowRole: 'QA' })
    ).toBe(false);
  });
});

describe('Phase 5: Columnar High-Throughput Aggregations Engine', () => {
  const sampleItems: BoardItem[] = [
    {
      id: 'i-1',
      board_id: 'b-1',
      group_id: 'g-1',
      title: 'Task 1',
      status: 'Done',
      status_color: '#00c875',
      priority: 'high',
      due_date: '2026-10-01',
      numbers_value: 8,
      tags: [],
      activities: [],
      comments: [],
    },
    {
      id: 'i-2',
      board_id: 'b-1',
      group_id: 'g-1',
      title: 'Task 2',
      status: 'Working on it',
      status_color: '#0073ea',
      priority: 'urgent',
      due_date: '2026-10-02',
      sla_due_at: '2020-01-01T00:00:00Z', // Breached SLA
      numbers_value: 5,
      tags: [],
      activities: [],
      comments: [],
    },
    {
      id: 'i-3',
      board_id: 'b-1',
      group_id: 'g-1',
      title: 'Task 3',
      status: 'Stuck',
      status_color: '#e2445c',
      priority: 'medium',
      due_date: '2026-10-03',
      numbers_value: 3,
      tags: [],
      activities: [],
      comments: [],
    },
    {
      id: 'i-4',
      board_id: 'b-1',
      group_id: 'g-1',
      title: 'Task 4',
      status: 'Pending',
      status_color: '#c4c4c4',
      priority: 'low',
      due_date: '2026-10-04',
      numbers_value: 4,
      tags: [],
      activities: [],
      comments: [],
    },
  ];

  it('Computes fast columnar metrics across dataset', () => {
    const metrics = computeColumnarMetrics(sampleItems);

    expect(metrics.totalCount).toBe(4);
    expect(metrics.completedCount).toBe(1);
    expect(metrics.inProgressCount).toBe(1);
    expect(metrics.stuckCount).toBe(1);
    expect(metrics.urgentCount).toBe(1);
    expect(metrics.totalPoints).toBe(20); // 8 + 5 + 3 + 4
    expect(metrics.avgPointsPerTicket).toBe(5);
    expect(metrics.slaBreachedCount).toBe(1);
    expect(metrics.completionRatePercent).toBe(25); // 1 out of 4 = 25%
  });

  it('Handles empty array gracefully', () => {
    const metrics = computeColumnarMetrics([]);
    expect(metrics.totalCount).toBe(0);
    expect(metrics.completedCount).toBe(0);
    expect(metrics.completionRatePercent).toBe(0);
  });
});
