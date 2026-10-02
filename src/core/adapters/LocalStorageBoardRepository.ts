/**
 * Adapter: LocalStorageBoardRepository
 * Implements IBoardRepository with browser storage & in-memory hydration.
 */

import { IBoardRepository } from '../ports/IBoardRepository';
import { BoardSummary, BoardGroup, BoardColumn } from '@/types';
import { INITIAL_BOARDS, INITIAL_BOARD_GROUPS, DEFAULT_BOARD_COLUMNS } from '@/lib/mock-data';

export class LocalStorageBoardRepository implements IBoardRepository {
  private memoryBoards: Map<string, BoardSummary> = new Map();
  private memoryGroups: Map<string, BoardGroup[]> = new Map();
  private memoryColumns: Map<string, BoardColumn[]> = new Map();

  constructor() {
    Object.values(INITIAL_BOARDS).flat().forEach((b) => this.memoryBoards.set(b.id, { ...b }));
    Object.entries(INITIAL_BOARD_GROUPS).forEach(([bId, grps]) => {
      this.memoryGroups.set(bId, [...grps]);
    });
    this.memoryColumns.set('board-tickets', [...DEFAULT_BOARD_COLUMNS]);
  }

  private isClient(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  async getById(boardId: string): Promise<BoardSummary | null> {
    if (this.isClient()) {
      try {
        const stored = localStorage.getItem(`happytf_board_${boardId}`);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        // Fallback to memory
      }
    }
    const b = this.memoryBoards.get(boardId);
    return b ? { ...b } : null;
  }

  async listByWorkspace(workspaceId: string): Promise<BoardSummary[]> {
    const list = Array.from(this.memoryBoards.values()).filter(b => b.workspace_id === workspaceId);
    return list.map(b => ({ ...b }));
  }

  async save(board: BoardSummary): Promise<BoardSummary> {
    this.memoryBoards.set(board.id, { ...board });
    if (this.isClient()) {
      try {
        localStorage.setItem(`happytf_board_${board.id}`, JSON.stringify(board));
      } catch (e) {
        // ignore
      }
    }
    return { ...board };
  }

  async getGroups(boardId: string): Promise<BoardGroup[]> {
    if (this.isClient()) {
      try {
        const stored = localStorage.getItem(`happytf_groups_${boardId}`);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        // fallback
      }
    }
    return this.memoryGroups.get(boardId) || [];
  }

  async saveGroups(boardId: string, groups: BoardGroup[]): Promise<BoardGroup[]> {
    this.memoryGroups.set(boardId, [...groups]);
    if (this.isClient()) {
      try {
        localStorage.setItem(`happytf_groups_${boardId}`, JSON.stringify(groups));
      } catch (e) {
        // ignore
      }
    }
    return [...groups];
  }

  async getColumns(boardId: string): Promise<BoardColumn[]> {
    return this.memoryColumns.get(boardId) || [...DEFAULT_BOARD_COLUMNS];
  }

  async saveColumns(boardId: string, columns: BoardColumn[]): Promise<BoardColumn[]> {
    this.memoryColumns.set(boardId, [...columns]);
    return [...columns];
  }
}
