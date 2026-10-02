/**
 * HappyTF Local-First Offline Storage Engine
 * Browser IndexedDB persistence for offline task manipulation and sync queues.
 */

import { BoardItem, BoardSummary } from '@/types';

const DB_NAME = 'HappyTF_LocalDB';
const DB_VERSION = 1;

export interface OfflineMutation {
  id?: number;
  type: 'create_ticket' | 'update_ticket' | 'delete_ticket' | 'status_change';
  entityId: string;
  expectedVersion?: number;
  payload: any;
  timestamp: string;
}

let dbInstance: IDBDatabase | null = null;

export async function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  if (dbInstance) return dbInstance;

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('boards')) {
          db.createObjectStore('boards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tickets')) {
          const ticketStore = db.createObjectStore('tickets', { keyPath: 'id' });
          ticketStore.createIndex('board_id', 'board_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('offline_mutations')) {
          db.createObjectStore('offline_mutations', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn('[IndexedDB] Failed to open local database');
        resolve(null);
      };
    } catch (e) {
      console.warn('[IndexedDB] Initialization exception:', e);
      resolve(null);
    }
  });
}

/**
 * Persist active board & ticket records locally
 */
export async function cacheBoardStateOffline(board: BoardSummary, items: BoardItem[]): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const tx = db.transaction(['boards', 'tickets'], 'readwrite');
    const boardStore = tx.objectStore('boards');
    const ticketStore = tx.objectStore('tickets');

    boardStore.put(board);
    for (const item of items) {
      ticketStore.put(item);
    }
  } catch (e) {
    console.warn('[IndexedDB] cacheBoardStateOffline failed:', e);
  }
}

/**
 * Retrieve cached board and tickets when offline
 */
export async function getOfflineBoardState(boardId: string): Promise<{ board: BoardSummary | null; items: BoardItem[] }> {
  const db = await getDb();
  if (!db) return { board: null, items: [] };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(['boards', 'tickets'], 'readonly');
      const boardStore = tx.objectStore('boards');
      const ticketStore = tx.objectStore('tickets');

      const boardReq = boardStore.get(boardId);
      boardReq.onsuccess = () => {
        const board = boardReq.result || null;
        const index = ticketStore.index('board_id');
        const itemsReq = index.getAll(boardId);

        itemsReq.onsuccess = () => {
          resolve({
            board,
            items: itemsReq.result || [],
          });
        };
        itemsReq.onerror = () => resolve({ board, items: [] });
      };

      boardReq.onerror = () => resolve({ board: null, items: [] });
    } catch {
      resolve({ board: null, items: [] });
    }
  });
}

/**
 * Queue a mutation generated while offline
 */
export async function queueOfflineMutation(mutation: Omit<OfflineMutation, 'id'>): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('offline_mutations', 'readwrite');
      const store = tx.objectStore('offline_mutations');
      const req = store.add(mutation);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Get all pending offline mutations
 */
export async function getPendingOfflineMutations(): Promise<OfflineMutation[]> {
  const db = await getDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('offline_mutations', 'readonly');
      const store = tx.objectStore('offline_mutations');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Remove a successfully synced mutation
 */
export async function removeOfflineMutation(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('offline_mutations', 'readwrite');
      const store = tx.objectStore('offline_mutations');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
