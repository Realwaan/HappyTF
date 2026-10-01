import fs from 'fs';
import path from 'path';
import { BoardSummary } from '@/types';
import { INITIAL_BOARDS } from '@/lib/mock-data';
import { isDeployed } from '@/lib/environment';

const DATA_DIR = path.join(process.cwd(), '.data');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');

let inMemoryBoards: Record<string, BoardSummary[]> | null = null;
let lastMtimeMs = 0;

function getInitialBoards(): Record<string, BoardSummary[]> {
  return isDeployed() ? {} : INITIAL_BOARDS;
}

function loadStore(): Record<string, BoardSummary[]> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(BOARDS_FILE)) {
      const stat = fs.statSync(BOARDS_FILE);
      if (inMemoryBoards && stat.mtimeMs <= lastMtimeMs) {
        return inMemoryBoards;
      }
      const content = fs.readFileSync(BOARDS_FILE, 'utf-8');
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          const store: Record<string, BoardSummary[]> = { ...getInitialBoards(), ...parsed };
          inMemoryBoards = store;
          lastMtimeMs = stat.mtimeMs;
          return store;
        }
      }
    }
  } catch (err) {
    console.warn('[serverBoardsStore] Failed to read boards file', err);
  }
  const store: Record<string, BoardSummary[]> = inMemoryBoards || { ...getInitialBoards() };
  inMemoryBoards = store;
  saveStore(store);
  return store;
}

function saveStore(data: Record<string, BoardSummary[]>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(BOARDS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[serverBoardsStore] Failed to save boards file', err);
  }
}

export function getServerBoard(boardId: string): BoardSummary | null {
  const store = loadStore();
  for (const bList of Object.values(store)) {
    const found = bList.find((b) => b.id === boardId);
    if (found) return found;
  }
  return null;
}

export function getServerBoards(workspaceId?: string): BoardSummary[] | Record<string, BoardSummary[]> {
  const store = loadStore();
  if (workspaceId) {
    return store[workspaceId] || [];
  }
  return store;
}

export function registerServerBoard(board: BoardSummary): BoardSummary {
  const store = loadStore();
  const wsId = board.workspace_id || 'default';
  const list = store[wsId] || [];
  const existingIdx = list.findIndex((b) => b.id === board.id);
  if (existingIdx >= 0) {
    list[existingIdx] = board;
  } else {
    list.unshift(board);
  }
  store[wsId] = list;
  inMemoryBoards = store;
  saveStore(store);
  return board;
}
