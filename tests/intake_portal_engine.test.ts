import { describe, it, expect } from 'vitest';
import { 
  IntakeSubmissionSchema, 
  processIntakeSubmission, 
  getSanitizedTrackingTicket,
  mapStatusToCustomerMilestone 
} from '../src/lib/intake/intakeEngine';
import { BoardItem } from '../src/types';

describe('Phase 8: Public Work Intake Portal & External Client Tracker', () => {
  describe('Zod Input Validation', () => {
    it('validates a complete, compliant intake request', () => {
      const validPayload = {
        title: 'Authentication fails on Safari 17 mobile',
        category: 'bug' as const,
        priority: 'high' as const,
        description: 'When tapping the Google OAuth button, the redirect loop resets session cookie.',
        requesterName: 'Elena Rostova',
        requesterEmail: 'elena@enterprise-client.com',
        workspaceId: 'ws-acme-core',
      };

      const result = IntakeSubmissionSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects submissions with invalid email or empty description', () => {
      const invalidPayload = {
        title: 'Hi', // Too short
        category: 'bug' as const,
        priority: 'medium' as const,
        description: '', // Empty
        requesterName: 'A', // Too short
        requesterEmail: 'not-an-email',
        workspaceId: 'ws-acme-core',
      };

      const result = IntakeSubmissionSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        expect(fieldErrors.title).toBeDefined();
        expect(fieldErrors.description).toBeDefined();
        expect(fieldErrors.requesterEmail).toBeDefined();
      }
    });
  });

  describe('Triage & Board Routing Engine', () => {
    it('routes bug reports into board-tickets under triage with OCC v2 token', () => {
      const submission = {
        title: '500 Internal Error on CSV download',
        category: 'bug' as const,
        priority: 'urgent' as const,
        description: 'Exporting >5,000 tickets crashes the Next.js API route handler.',
        requesterName: 'Marcus Dev',
        requesterEmail: 'marcus@partner.io',
        workspaceId: 'ws-acme-core',
      };

      const { ticket, trackingToken, trackingUrl } = processIntakeSubmission(submission);

      expect(ticket.id).toMatch(/^item-in-/);
      expect(ticket.ticket_number).toMatch(/^TK-IN-/);
      expect(ticket.board_id).toBe('board-tickets');
      expect(ticket.group_id).toBe('grp-tk-triage');
      expect(ticket.status).toBe('Working on it');
      expect(ticket.priority).toBe('urgent');
      expect(ticket.external_source).toBe('web');
      expect(ticket.version).toBe(1);
      expect(ticket.tags).toContain('Intake: Bug');
      expect(trackingToken).toBeDefined();
      expect(trackingUrl).toBe(`/track/${ticket.ticket_number}`);
    });

    it('routes feature requests to product backlog with medium priority', () => {
      const submission = {
        title: 'Support SAML 2.0 Okta Single Sign-On',
        category: 'feature' as const,
        priority: 'low' as const,
        description: 'Our security team requires SSO integration before expanding seats.',
        requesterName: 'Sarah Jenkins',
        requesterEmail: 'sarah@bigcorp.com',
        workspaceId: 'ws-acme-core',
      };

      const { ticket } = processIntakeSubmission(submission);

      expect(ticket.board_id).toBe('board-01');
      expect(ticket.tags).toContain('Intake: Feature');
      expect(ticket.tags).toContain('Requested by: sarah@bigcorp.com');
    });
  });

  describe('Customer Progress Tracking Sanitization', () => {
    it('sanitizes internal ticket metadata for external client viewing', () => {
      const internalTicket: BoardItem = {
        id: 'item-in-99',
        board_id: 'board-tickets',
        group_id: 'grp-tk-progress',
        ticket_number: 'TK-IN-1002',
        title: 'Payment gateway timeout',
        status: 'In Review',
        status_color: '#8b5cf6',
        priority: 'urgent',
        due_date: 'Today',
        sla_due_at: new Date(Date.now() + 3600000).toISOString(),
        tags: ['Intake: Bug', 'Stripe', 'Secret-Internal-Tag'],
        assignee: {
          id: 'usr-dev-private-01',
          name: 'Alex Rivera',
          avatar: 'https://avatar.com/alex.jpg',
        },
        description: 'Stripe webhook latency exceeding timeout threshold.',
        activities: [
          { id: 'act-1', author_name: 'Alex Rivera', action: 'Investigating DB pool', timestamp: '10m ago' },
        ],
        comments: [
          {
            id: 'c-1',
            author_name: 'Alex Rivera',
            author_avatar: 'https://avatar.com/alex.jpg',
            content: 'Fix deployed to staging server.',
            timestamp: '5m ago',
            reactions: [],
          },
        ],
        version: 3,
      };

      const clientView = getSanitizedTrackingTicket(internalTicket);

      expect(clientView.ticketNumber).toBe('TK-IN-1002');
      expect(clientView.title).toBe('Payment gateway timeout');
      expect(clientView.milestone).toBe('QA & Verification');
      expect(clientView.progressPercentage).toBe(75);
      expect(clientView.isResolved).toBe(false);
      // Ensure private internal tags and sensitive fields are sanitized
      expect(clientView.tags).not.toContain('Secret-Internal-Tag');
      expect(clientView.assigneeName).toBe('Alex Rivera');
    });

    it('maps all internal status states to consistent customer milestones', () => {
      expect(mapStatusToCustomerMilestone('Pending')).toBe('Triage & In Review');
      expect(mapStatusToCustomerMilestone('Working on it')).toBe('Active Development');
      expect(mapStatusToCustomerMilestone('In Review')).toBe('QA & Verification');
      expect(mapStatusToCustomerMilestone('Done')).toBe('Resolved & Shipped');
      expect(mapStatusToCustomerMilestone('Stuck')).toBe('Under Investigation');
    });

    it('calculates deterministic SLA deadlines according to priority tiers', () => {
      const now = Date.now();
      
      const urgent = processIntakeSubmission({
        title: 'Crash in checkout',
        category: 'bug',
        priority: 'urgent',
        description: 'Users cannot submit orders.',
        requesterName: 'VIP Customer',
        requesterEmail: 'vip@client.com',
      });
      const urgentHours = (new Date(urgent.ticket.sla_due_at!).getTime() - now) / 3600000;
      expect(Math.round(urgentHours)).toBe(2);

      const high = processIntakeSubmission({
        title: 'High priority defect',
        category: 'bug',
        priority: 'high',
        description: 'Users experiencing delays.',
        requesterName: 'Manager',
        requesterEmail: 'mgr@client.com',
      });
      const highHours = (new Date(high.ticket.sla_due_at!).getTime() - now) / 3600000;
      expect(Math.round(highHours)).toBe(24);

      const low = processIntakeSubmission({
        title: 'Low priority question',
        category: 'support',
        priority: 'low',
        description: 'Just asking about pricing.',
        requesterName: 'Inquirer',
        requesterEmail: 'inq@client.com',
      });
      const lowHours = (new Date(low.ticket.sla_due_at!).getTime() - now) / 3600000;
      expect(Math.round(lowHours)).toBe(168);
    });

    it('respects explicit targetBoardId override from share links', () => {
      const res = processIntakeSubmission({
        title: 'Custom board task',
        category: 'bug',
        priority: 'medium',
        description: 'Direct submission into board-custom.',
        requesterName: 'Partner User',
        requesterEmail: 'user@partner.org',
        targetBoardId: 'board-custom-sprint-9',
      });

      expect(res.ticket.board_id).toBe('board-custom-sprint-9');
    });
  });
});
