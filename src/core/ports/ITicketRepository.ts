/**
 * Port: ITicketRepository
 * Defines abstract ticket storage and optimistic concurrency operations.
 */

import { BoardItem, ItemComment } from '@/types';

export interface TicketUpdateResult {
  success: boolean;
  ticket?: BoardItem;
  conflict?: boolean;
  serverVersion?: number;
  error?: string;
}

export interface ITicketRepository {
  getById(id: string): Promise<BoardItem | null>;
  listByBoard(boardId: string): Promise<BoardItem[]>;
  create(ticket: Partial<BoardItem> & { board_id: string; title: string }): Promise<BoardItem>;
  updateWithOcc(id: string, updates: Partial<BoardItem>, expectedVersion?: number): Promise<TicketUpdateResult>;
  delete(id: string): Promise<boolean>;
  addComment(ticketId: string, comment: ItemComment): Promise<ItemComment>;
}
