import { z } from 'zod';
import { BoardItem } from '../../types';

export const IntakeSubmissionSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters'),
  category: z.enum(['bug', 'feature', 'support', 'operations']),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters with enough context'),
  requesterName: z.string().min(2, 'Please provide your full name'),
  requesterEmail: z.string().email('Please enter a valid email address'),
  workspaceId: z.string().optional().default('ws-acme-core'),
  targetBoardId: z.string().optional(),
});

export type IntakeSubmission = z.infer<typeof IntakeSubmissionSchema>;

export interface SanitizedClientTicket {
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  milestone: string;
  progressPercentage: number;
  isResolved: boolean;
  slaDueAt?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  tags: string[];
  publicUpdates: Array<{
    id: string;
    author: string;
    message: string;
    timestamp: string;
  }>;
}

export function mapStatusToCustomerMilestone(status: BoardItem['status']): string {
  switch (status) {
    case 'Pending':
      return 'Triage & In Review';
    case 'Working on it':
      return 'Active Development';
    case 'In Review':
      return 'QA & Verification';
    case 'Done':
      return 'Resolved & Shipped';
    case 'Stuck':
      return 'Under Investigation';
    default:
      return 'Triage & In Review';
  }
}

export function getProgressPercentage(status: BoardItem['status']): number {
  switch (status) {
    case 'Pending':
      return 20;
    case 'Working on it':
      return 50;
    case 'In Review':
      return 75;
    case 'Done':
      return 100;
    case 'Stuck':
      return 35;
    default:
      return 20;
  }
}

/**
 * Processes an intake form submission into an OCC v2 BoardItem.
 * Routes automatically to the target board and group.
 */
export function processIntakeSubmission(data: IntakeSubmission): {
  ticket: BoardItem;
  trackingToken: string;
  trackingUrl: string;
} {
  const numId = Math.floor(1000 + Math.random() * 9000);
  const ticketNumber = `TK-IN-${numId}`;
  const itemId = `item-in-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Triage destination routing
  let boardId = data.targetBoardId;
  let groupId = 'grp-tk-triage';

  if (!boardId) {
    if (data.category === 'feature' || data.category === 'operations') {
      boardId = 'board-01';
      groupId = 'grp-01-todo';
    } else {
      boardId = 'board-tickets';
      groupId = 'grp-tk-triage';
    }
  }

  // SLA calculation
  const slaHours =
    data.priority === 'urgent'
      ? 2
      : data.priority === 'high'
      ? 24
      : data.priority === 'medium'
      ? 48
      : 168;
  const slaDueAt = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

  const categoryLabel =
    data.category === 'bug'
      ? 'Bug'
      : data.category === 'feature'
      ? 'Feature'
      : data.category === 'support'
      ? 'Support'
      : 'Operations';

  const ticket: BoardItem = {
    id: itemId,
    ticket_number: ticketNumber,
    board_id: boardId,
    group_id: groupId,
    workspace_id: data.workspaceId,
    title: data.title,
    status: 'Working on it',
    status_color: '#f59e0b',
    priority: data.priority,
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    sla_due_at: slaDueAt,
    description: `### External Request Description\n${data.description}\n\n**Requester:** ${data.requesterName} (${data.requesterEmail})\n**Channel:** Public Work Intake Portal`,
    tags: [
      `Intake: ${categoryLabel}`,
      `Requested by: ${data.requesterEmail}`,
      'Public Portal',
    ],
    external_source: 'web',
    activities: [
      {
        id: `act-${Date.now()}`,
        author_name: data.requesterName,
        action: `Submitted request via Public Work Intake Portal`,
        timestamp: 'Just now',
      },
    ],
    comments: [],
    version: 1,
  };

  const trackingToken = `trk_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 6)}`;
  const trackingUrl = `/track/${ticketNumber}`;

  return {
    ticket,
    trackingToken,
    trackingUrl,
  };
}

/**
 * Sanitizes an internal BoardItem to create a public, customer-safe view.
 * Excludes internal secret tags, database IDs, and sensitive employee data.
 */
export function getSanitizedTrackingTicket(ticket: BoardItem): SanitizedClientTicket {
  // Strip tags containing 'secret' or 'internal'
  const publicTags = (ticket.tags || []).filter(
    (t) => !t.toLowerCase().includes('secret') && !t.toLowerCase().includes('internal')
  );

  const milestone = mapStatusToCustomerMilestone(ticket.status);
  const progressPercentage = getProgressPercentage(ticket.status);

  // Extract public comments/activities
  const publicUpdates = (ticket.activities || []).map((act) => ({
    id: act.id,
    author: act.author_name,
    message: act.action,
    timestamp: act.timestamp,
  }));

  return {
    ticketNumber: ticket.ticket_number || ticket.id,
    title: ticket.title,
    description: ticket.description || 'No description provided.',
    category: ticket.tags?.find((t) => t.startsWith('Intake:'))?.replace('Intake: ', '') || 'General',
    priority: ticket.priority,
    status: ticket.status,
    milestone,
    progressPercentage,
    isResolved: ticket.status === 'Done',
    slaDueAt: ticket.sla_due_at,
    assigneeName: ticket.assignee?.name,
    assigneeAvatar: ticket.assignee?.avatar,
    tags: publicTags,
    publicUpdates,
  };
}
