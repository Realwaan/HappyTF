import { BoardItem } from '../../types';

export type AuditActionType =
  | 'TICKET_CREATE'
  | 'STATUS_CHANGE'
  | 'PRIORITY_CHANGE'
  | 'ASSIGNEE_CHANGE'
  | 'CASCADE_SHIFT'
  | 'TICKET_DELETE'
  | 'TICKET_ROLLBACK'
  | 'COMMENT_POST';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actionType: AuditActionType;
  boardId: string;
  ticketId: string;
  ticketNumber?: string;
  summary: string;
  beforeSnapshot: Partial<BoardItem> | null;
  afterSnapshot: Partial<BoardItem>;
}

/**
 * Appends an audit event immutably to the audit log.
 */
export function recordAuditEntry(
  currentLog: AuditEvent[],
  event: AuditEvent
): AuditEvent[] {
  return [event, ...currentLog];
}

/**
 * Retrieves chronological audit history for a specific ticket.
 */
export function getTicketVersionHistory(
  ticketId: string,
  log: AuditEvent[]
): AuditEvent[] {
  return log
    .filter((event) => event.ticketId === ticketId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Reverts a ticket to a historical version state while monotonically incrementing the OCC token.
 * OCC Invariant: monotonic version must increase to prevent concurrent update overwrite collisions.
 */
export function rollbackTicketToVersion(
  currentTicket: BoardItem,
  targetVersion: number,
  log: AuditEvent[]
): BoardItem {
  const history = getTicketVersionHistory(currentTicket.id, log);

  // Look for the snapshot corresponding to the target version
  const matchingEvent = history.find(
    (event) => event.afterSnapshot && event.afterSnapshot.version === targetVersion
  );

  if (!matchingEvent || !matchingEvent.afterSnapshot) {
    // If not found directly, return current ticket
    return {
      ...currentTicket,
      version: (currentTicket.version || 1) + 1,
    };
  }

  const snapshot = matchingEvent.afterSnapshot;

  return {
    ...currentTicket,
    title: snapshot.title ?? currentTicket.title,
    status: snapshot.status ?? currentTicket.status,
    status_color: snapshot.status_color ?? currentTicket.status_color,
    priority: snapshot.priority ?? currentTicket.priority,
    assignee: snapshot.assignee !== undefined ? snapshot.assignee : currentTicket.assignee,
    description: snapshot.description ?? currentTicket.description,
    due_date: snapshot.due_date ?? currentTicket.due_date,
    start_date: snapshot.start_date ?? currentTicket.start_date,
    tags: snapshot.tags ? [...snapshot.tags] : currentTicket.tags,
    // OCC v2 Monotonic Rule: Always bump version higher than currentTicket.version
    version: (currentTicket.version || 1) + 1,
  };
}
