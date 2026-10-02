/**
 * Adapter: InMemoryTicketRepository
 * In-memory adapter implementing ITicketRepository with full OCC v2 semantics.
 * Ideal for unit testing, offline mocking, and isolated domain tests.
 */

import { ITicketRepository, TicketUpdateResult } from '../ports/ITicketRepository';
import { BoardItem, ItemComment } from '@/types';

export class InMemoryTicketRepository implements ITicketRepository {
  private items: Map<string, BoardItem> = new Map();

  constructor(initialItems: BoardItem[] = []) {
    initialItems.forEach(item => {
      this.items.set(item.id, {
        ...item,
        version: item.version ?? 1,
        comments: item.comments || [],
        activities: item.activities || [],
      });
    });
  }

  async getById(id: string): Promise<BoardItem | null> {
    const item = this.items.get(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async listByBoard(boardId: string): Promise<BoardItem[]> {
    return Array.from(this.items.values())
      .filter(item => item.board_id === boardId)
      .map(item => JSON.parse(JSON.stringify(item)));
  }

  async create(ticket: Partial<BoardItem> & { board_id: string; title: string }): Promise<BoardItem> {
    const id = ticket.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullItem: BoardItem = {
      ...ticket,
      id,
      board_id: ticket.board_id,
      group_id: ticket.group_id || 'group-1',
      ticket_number: ticket.ticket_number || `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: ticket.title,
      status: ticket.status || 'Pending',
      status_color: ticket.status_color || '#c4c4c4',
      priority: ticket.priority || 'medium',
      severity: ticket.severity || 'minor',
      due_date: ticket.due_date || new Date().toISOString().split('T')[0],
      tags: ticket.tags || [],
      subtasks: ticket.subtasks || [],
      activities: ticket.activities || [
        {
          id: `act-${Date.now()}`,
          author_name: 'System',
          action: 'Created ticket via Hexagonal Repository',
          timestamp: 'just now',
          created_at: new Date().toISOString(),
        }
      ],
      comments: ticket.comments || [],
      version: 1,
      updated_at: new Date().toISOString(),
    };

    this.items.set(id, fullItem);
    return JSON.parse(JSON.stringify(fullItem));
  }

  async updateWithOcc(
    id: string,
    updates: Partial<BoardItem>,
    expectedVersion?: number
  ): Promise<TicketUpdateResult> {
    const current = this.items.get(id);
    if (!current) {
      return { success: false, error: 'Ticket not found' };
    }

    const currentVersion = current.version ?? 1;

    // Concurrency collision check
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      return {
        success: false,
        conflict: true,
        serverVersion: currentVersion,
        error: `OCC Conflict: Expected version ${expectedVersion}, but server has version ${currentVersion}`,
      };
    }

    const nextVersion = currentVersion + 1;
    const updated: BoardItem = {
      ...current,
      ...updates,
      id,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    };

    this.items.set(id, updated);
    return {
      success: true,
      ticket: JSON.parse(JSON.stringify(updated)),
      serverVersion: nextVersion,
    };
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  async addComment(ticketId: string, comment: ItemComment): Promise<ItemComment> {
    const item = this.items.get(ticketId);
    if (!item) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const fullComment: ItemComment = {
      ...comment,
      id: comment.id || `comment-${Date.now()}`,
      created_at: comment.created_at || new Date().toISOString(),
      timestamp: 'just now',
    };

    item.comments = [fullComment, ...(item.comments || [])];
    item.version = (item.version ?? 1) + 1;
    item.updated_at = new Date().toISOString();

    return JSON.parse(JSON.stringify(fullComment));
  }
}
