/**
 * Port: IBoardRepository
 * Defines abstract board and workspace container access operations.
 */

import { BoardSummary, BoardGroup, BoardColumn } from '@/types';

export interface IBoardRepository {
  getById(boardId: string): Promise<BoardSummary | null>;
  listByWorkspace(workspaceId: string): Promise<BoardSummary[]>;
  save(board: BoardSummary): Promise<BoardSummary>;
  getGroups(boardId: string): Promise<BoardGroup[]>;
  saveGroups(boardId: string, groups: BoardGroup[]): Promise<BoardGroup[]>;
  getColumns(boardId: string): Promise<BoardColumn[]>;
  saveColumns(boardId: string, columns: BoardColumn[]): Promise<BoardColumn[]>;
}
