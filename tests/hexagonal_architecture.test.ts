import { describe, it, expect } from 'vitest';
import { InMemoryTicketRepository } from '../src/core/adapters/InMemoryTicketRepository';
import { TicketEntity } from '../src/core/domain/Ticket';
import { BoardEntity } from '../src/core/domain/Board';
import { 
  CreateTicketSchema, 
  UpdateTicketSchema, 
  AddCommentSchema,
  ClaimTicketSchema 
} from '../src/core/validation/ticketSchemas';
import { CreateBoardSchema, CreateWorkspaceSchema } from '../src/core/validation/boardSchemas';

describe('Phase 2: Hexagonal Architecture & Ports/Adapters', () => {
  it('InMemoryTicketRepository creates tickets with monotonic version v1', async () => {
    const repo = new InMemoryTicketRepository();
    const ticket = await repo.create({
      board_id: 'board-sprint-1',
      title: 'Implement CapStoneFlow automation hooks',
      priority: 'urgent',
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.title).toBe('Implement CapStoneFlow automation hooks');
    expect(ticket.version).toBe(1);
    expect(ticket.status).toBe('Pending');
  });

  it('InMemoryTicketRepository enforces OCC v2 with collision detection', async () => {
    const repo = new InMemoryTicketRepository();
    const ticket = await repo.create({
      board_id: 'board-sprint-1',
      title: 'Fix Redis rate limit memory leak',
    });

    // Successful update with matching version
    const update1 = await repo.updateWithOcc(ticket.id, { status: 'Working on it' }, 1);
    expect(update1.success).toBe(true);
    expect(update1.serverVersion).toBe(2);
    expect(update1.ticket?.status).toBe('Working on it');

    // Concurrent stale update with obsolete version 1 should fail with OCC collision
    const staleUpdate = await repo.updateWithOcc(ticket.id, { status: 'Done' }, 1);
    expect(staleUpdate.success).toBe(false);
    expect(staleUpdate.conflict).toBe(true);
    expect(staleUpdate.serverVersion).toBe(2);
    expect(staleUpdate.error).toContain('OCC Conflict');

    // Up-to-date update with version 2 succeeds and bumps to version 3
    const update2 = await repo.updateWithOcc(ticket.id, { status: 'Done' }, 2);
    expect(update2.success).toBe(true);
    expect(update2.serverVersion).toBe(3);
    expect(update2.ticket?.status).toBe('Done');
  });

  it('TicketEntity domain model transitions status and logs activity', () => {
    const entity = new TicketEntity({
      id: 'tk-100',
      board_id: 'b-1',
      group_id: 'g-1',
      title: 'Domain logic test',
      status: 'Pending',
      status_color: '#ccc',
      priority: 'high',
      due_date: '2026-10-15',
      tags: ['backend'],
      activities: [],
      comments: [],
      version: 1,
      updated_at: '2026-10-01T00:00:00Z',
    });

    expect(entity.version).toBe(1);
    expect(entity.status).toBe('Pending');

    entity.transitionStatus('Working on it', '#0073ea', 'Taylor Chen');

    expect(entity.version).toBe(2);
    expect(entity.status).toBe('Working on it');
    expect(entity.toDto.activities.length).toBe(1);
    expect(entity.toDto.activities[0].action).toContain('transitioned from "Pending" to "Working on it"');
  });

  it('BoardEntity domain model allows adding and renaming groups', () => {
    const board = new BoardEntity(
      'b-10',
      'ws-1',
      'Architecture Board',
      '📐',
      '#0073ea',
      'Core architecture boards',
      [],
      []
    );

    const group = board.addGroup('Sprint Backlog', '#3ecf8e');
    expect(board.groups.length).toBe(1);
    expect(group.name).toBe('Sprint Backlog');

    const renamed = board.renameGroup(group.id, 'Active Sprint');
    expect(renamed).toBe(true);
    expect(board.groups[0].name).toBe('Active Sprint');
  });
});

describe('Phase 2: Zod v2 Validation Gate', () => {
  it('CreateTicketSchema validates valid inputs and trims whitespace', () => {
    const valid = CreateTicketSchema.parse({
      board_id: 'board-main',
      title: '   Refactor repository adapters   ',
      priority: 'high',
      tags: ['refactor', 'ports'],
    });

    expect(valid.title).toBe('Refactor repository adapters');
    expect(valid.priority).toBe('high');
    expect(valid.status).toBe('Pending');
  });

  it('CreateTicketSchema rejects empty titles', () => {
    expect(() => {
      CreateTicketSchema.parse({
        board_id: 'board-main',
        title: '',
      });
    }).toThrow();
  });

  it('UpdateTicketSchema validates expectedVersion integers', () => {
    const parsed = UpdateTicketSchema.parse({
      id: 'tk-42',
      expectedVersion: 4,
      status: 'In Review',
    });

    expect(parsed.id).toBe('tk-42');
    expect(parsed.expectedVersion).toBe(4);
    expect(parsed.status).toBe('In Review');
  });

  it('AddCommentSchema rejects empty comments and trims text', () => {
    expect(() => {
      AddCommentSchema.parse({
        ticketId: 'tk-1',
        author_name: 'Alex',
        content: '   ',
      });
    }).toThrow();

    const valid = AddCommentSchema.parse({
      ticketId: 'tk-1',
      author_name: 'Alex Rivera',
      content: '  Code review looks clean!  ',
    });
    expect(valid.content).toBe('Code review looks clean!');
  });
});
