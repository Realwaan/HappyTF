import { describe, it, expect } from 'vitest';
import { 
  exportBoardToCsv, 
  exportBoardToMarkdown, 
  exportBoardToJson, 
  importTicketsFromCsv 
} from '../src/lib/export/exportEngine';
import { 
  recordAuditEntry, 
  getTicketVersionHistory, 
  rollbackTicketToVersion,
  AuditEvent 
} from '../src/lib/audit/auditEngine';
import { Board, BoardItem } from '../src/types';

describe('Phase 9: Enterprise Data Portability, Audit Trail & Rollback Vault', () => {
  const mockBoard: Board = {
    id: 'board-export-test',
    name: 'Core Platform Sprint 42',
    description: 'Sprint planning and release tracking',
    workspace_id: 'ws-acme-core',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-10T00:00:00Z',
  };

  const mockItems: BoardItem[] = [
    {
      id: 'item-exp-1',
      ticket_number: 'TK-101',
      board_id: 'board-export-test',
      group_id: 'grp-1',
      title: 'Fix OAuth redirect loop on Safari',
      status: 'Working on it',
      status_color: '#f59e0b',
      priority: 'urgent',
      start_date: '2026-10-01',
      due_date: '2026-10-05',
      sla_due_at: '2026-10-02T12:00:00Z',
      assignee: { id: 'usr-1', name: 'Elena Rostova', avatar: '' },
      tags: ['auth', 'safari'],
      description: 'Redirect loop occurs when cookies are blocked.\nIncludes "quoted" text and commas, here.',
      version: 2,
    },
    {
      id: 'item-exp-2',
      ticket_number: 'TK-102',
      board_id: 'board-export-test',
      group_id: 'grp-1',
      title: 'Implement Dark Mode design tokens',
      status: 'Done',
      status_color: '#10b981',
      priority: 'medium',
      start_date: '2026-10-03',
      due_date: '2026-10-08',
      assignee: { id: 'usr-2', name: 'Marc Andrei', avatar: '' },
      tags: ['ui', 'theme'],
      description: 'Replace hex colors with CSS variables.',
      version: 1,
    },
  ];

  describe('CSV Data Exporter & Importer (RFC 4180)', () => {
    it('generates standard RFC 4180 CSV with escaped quotes and commas', () => {
      const csv = exportBoardToCsv(mockBoard, mockItems);

      expect(csv).toContain('Ticket Number,Title,Status,Priority,Assignee,Start Date,Due Date,SLA Deadline,Tags,Version,Description');
      expect(csv).toContain('TK-101');
      expect(csv).toContain('Fix OAuth redirect loop on Safari');
      // Verify quotes inside description are properly doubled: ""quoted""
      expect(csv).toContain('""quoted""');
      // Verify tags are joined
      expect(csv).toContain('auth; safari');
    });

    it('exports full board JSON payload with metadata', () => {
      const json = exportBoardToJson(mockBoard, [], mockItems);
      const parsed = JSON.parse(json);

      expect(parsed.schemaVersion).toBe('1.0');
      expect(parsed.board.id).toBe('board-export-test');
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].ticket_number).toBe('TK-101');
    });

    it('generates rich GitHub-flavored Markdown board report', () => {
      const md = exportBoardToMarkdown(mockBoard, mockItems);

      expect(md).toContain('# Core Platform Sprint 42');
      expect(md).toContain('Sprint planning and release tracking');
      expect(md).toContain('| Ticket | Title | Status | Priority | Assignee | Due Date |');
      expect(md).toContain('| `TK-101` | Fix OAuth redirect loop on Safari | Working on it | urgent | Elena Rostova | 2026-10-05 |');
      expect(md).toContain('**Total Tickets:** 2');
      expect(md).toContain('**Done:** 1');
    });

    it('imports tickets from raw CSV text with schema validation and default OCC tokens', () => {
      const sampleCsv = `Ticket Number,Title,Status,Priority,Assignee,Start Date,Due Date,Tags,Description
TK-201,Implement Redis caching,Working on it,high,Alex Rivera,2026-10-10,2026-10-15,backend; cache,Use Upstash Redis for caching
TK-202,Add Vitest regression tests,Done,medium,Elena Rostova,2026-10-11,2026-10-12,test; qa,Achieve 85% coverage`;

      const result = importTicketsFromCsv(sampleCsv, 'board-import-target', 'grp-import-target');

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].ticket_number).toBe('TK-201');
      expect(result.items[0].board_id).toBe('board-import-target');
      expect(result.items[0].group_id).toBe('grp-import-target');
      expect(result.items[0].version).toBe(1);
      expect(result.items[0].tags).toEqual(['backend', 'cache']);
      expect(result.items[1].status).toBe('Done');
    });

    it('rejects CSV with missing required columns and reports line errors', () => {
      const invalidCsv = `InvalidColA,InvalidColB
val1,val2`;

      const result = importTicketsFromCsv(invalidCsv, 'board-target', 'grp-target');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Enterprise Audit Log & Time-Travel Version Rollback', () => {
    it('records immutable audit events with actor attribution and snapshot', () => {
      const event: AuditEvent = {
        id: 'aud-001',
        timestamp: new Date().toISOString(),
        actorId: 'usr-1',
        actorName: 'Elena Rostova',
        actionType: 'STATUS_CHANGE',
        boardId: 'board-export-test',
        ticketId: 'item-exp-1',
        ticketNumber: 'TK-101',
        summary: 'Changed status from "Working on it" to "In Review"',
        beforeSnapshot: { status: 'Working on it', version: 1 },
        afterSnapshot: { status: 'In Review', version: 2 },
      };

      const log = recordAuditEntry([], event);
      expect(log).toHaveLength(1);
      expect(log[0].actionType).toBe('STATUS_CHANGE');
      expect(log[0].ticketNumber).toBe('TK-101');
    });

    it('extracts chronological version history for a specific ticket', () => {
      const history: AuditEvent[] = [
        {
          id: 'aud-1',
          timestamp: '2026-10-01T10:00:00Z',
          actorId: 'usr-1',
          actorName: 'Elena Rostova',
          actionType: 'TICKET_CREATE',
          boardId: 'board-export-test',
          ticketId: 'item-exp-1',
          ticketNumber: 'TK-101',
          summary: 'Created ticket TK-101',
          beforeSnapshot: null,
          afterSnapshot: { title: 'Initial title', status: 'Pending', version: 1 },
        },
        {
          id: 'aud-2',
          timestamp: '2026-10-02T14:00:00Z',
          actorId: 'usr-2',
          actorName: 'Marc Andrei',
          actionType: 'STATUS_CHANGE',
          boardId: 'board-export-test',
          ticketId: 'item-exp-1',
          ticketNumber: 'TK-101',
          summary: 'Moved to Working on it',
          beforeSnapshot: { title: 'Initial title', status: 'Pending', version: 1 },
          afterSnapshot: { title: 'Updated title', status: 'Working on it', version: 2 },
        },
      ];

      const ticketHistory = getTicketVersionHistory('item-exp-1', history);
      expect(ticketHistory).toHaveLength(2);
      expect(ticketHistory[0].actionType).toBe('TICKET_CREATE');
      expect(ticketHistory[1].actionType).toBe('STATUS_CHANGE');
    });

    it('rolls back ticket state to an earlier version while strictly incrementing the monotonic OCC token', () => {
      const currentTicket: BoardItem = {
        id: 'item-exp-1',
        ticket_number: 'TK-101',
        board_id: 'board-export-test',
        group_id: 'grp-1',
        title: 'Broken experimental refactor title',
        status: 'Stuck',
        priority: 'urgent',
        version: 4, // Current version is 4
      };

      const auditTrail: AuditEvent[] = [
        {
          id: 'aud-1',
          timestamp: '2026-10-01T10:00:00Z',
          actorId: 'usr-1',
          actorName: 'Elena Rostova',
          actionType: 'TICKET_CREATE',
          boardId: 'board-export-test',
          ticketId: 'item-exp-1',
          ticketNumber: 'TK-101',
          summary: 'Created ticket',
          beforeSnapshot: null,
          afterSnapshot: { title: 'Stable pristine title', status: 'Working on it', priority: 'high', version: 1 },
        },
      ];

      const rolledBack = rollbackTicketToVersion(currentTicket, 1, auditTrail);

      // Properties from version 1 must be restored
      expect(rolledBack.title).toBe('Stable pristine title');
      expect(rolledBack.status).toBe('Working on it');
      expect(rolledBack.priority).toBe('high');
      // OCC Invariant: monotonic version MUST increment beyond current (4 -> 5)
      expect(rolledBack.version).toBe(5);
    });
  });
});
