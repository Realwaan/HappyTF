import fs from 'fs';
import path from 'path';
import { BoardItem } from '@/types';
import { INITIAL_BOARD_ITEMS } from '@/lib/mock-data';

const DATA_DIR = path.join(process.cwd(), '.data');
const TICKETS_FILE = path.join(DATA_DIR, 'board_items.json');

let inMemoryStore: Record<string, BoardItem[]> | null = null;
let lastMtimeMs = 0;

function loadStore(): Record<string, BoardItem[]> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(TICKETS_FILE)) {
      const stat = fs.statSync(TICKETS_FILE);
      if (inMemoryStore && stat.mtimeMs <= lastMtimeMs) {
        return inMemoryStore;
      }
      const content = fs.readFileSync(TICKETS_FILE, 'utf-8');
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          const store: Record<string, BoardItem[]> = { ...INITIAL_BOARD_ITEMS, ...parsed };
          inMemoryStore = store;
          lastMtimeMs = stat.mtimeMs;
          return store;
        }
      }
    }
  } catch (err) {
    console.warn('[serverTicketsStore] Failed to read tickets file', err);
  }
  const store: Record<string, BoardItem[]> = inMemoryStore || { ...INITIAL_BOARD_ITEMS };
  inMemoryStore = store;
  saveStore(store);
  return store;
}

function saveStore(data: Record<string, BoardItem[]>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[serverTicketsStore] Failed to save tickets file', err);
  }
}

export function getServerBoardItems(boardId?: string): BoardItem[] | Record<string, BoardItem[]> {
  const store = loadStore();
  if (boardId) {
    return store[boardId] || [];
  }
  return store;
}

export function addServerBoardItem(item: BoardItem): BoardItem {
  const store = loadStore();
  const bId = item.board_id;
  const list = store[bId] || [];
  const existingIdx = list.findIndex((i) => i.id === item.id);
  if (existingIdx >= 0) {
    list[existingIdx] = item;
  } else {
    list.unshift(item);
  }
  store[bId] = list;
  inMemoryStore = store;
  saveStore(store);
  return item;
}

export function updateServerBoardItem(itemId: string, updates: Partial<BoardItem>): BoardItem | null {
  const store = loadStore();
  let updatedItem: BoardItem | null = null;
  for (const bId of Object.keys(store)) {
    const list = store[bId] || [];
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx >= 0) {
      const cur = list[idx];
      updatedItem = {
        ...cur,
        ...updates,
        version: (cur.version || 1) + 1,
        updated_at: new Date().toISOString(),
      };
      list[idx] = updatedItem;
      store[bId] = list;
      inMemoryStore = store;
      saveStore(store);
      break;
    }
  }
  return updatedItem;
}

export function deleteServerBoardItem(itemId: string): boolean {
  const store = loadStore();
  let deleted = false;
  for (const bId of Object.keys(store)) {
    const list = store[bId] || [];
    const filtered = list.filter((i) => i.id !== itemId);
    if (filtered.length !== list.length) {
      store[bId] = filtered;
      deleted = true;
    }
  }
  if (deleted) {
    inMemoryStore = store;
    saveStore(store);
  }
  return deleted;
}
