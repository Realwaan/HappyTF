/**
 * mondayDB Architecture: Speed Layer (Redis In-Memory State Cache)
 * 
 * Provides sub-10ms read/write caching for hot board states, precomputed aggregations,
 * and formula compilation caches. Uses Upstash Redis with automatic in-memory fallback.
 */

import { cacheGet, cacheSet, cacheDelete } from '../redis';
import { BoardAggregation, GroupAggregation } from './types';
import { BoardItem } from '../../types';

const SPEED_LAYER_TTL_SECONDS = 300; // 5 minutes cache for hot queries

/**
 * Cache key generators
 */
export const speedLayerKeys = {
  boardItems: (boardId: string) => `mondaydb:board:${boardId}:items`,
  boardAgg: (boardId: string) => `mondaydb:board:${boardId}:agg`,
  groupAgg: (groupId: string) => `mondaydb:group:${groupId}:agg`,
  formulaCache: (hash: string) => `mondaydb:formula:${hash}`,
};

/**
 * Speed Layer: Save hot board items
 */
export async function speedLayerSetBoardItems(boardId: string, items: BoardItem[]): Promise<void> {
  const key = speedLayerKeys.boardItems(boardId);
  await cacheSet(key, items, SPEED_LAYER_TTL_SECONDS);
}

/**
 * Speed Layer: Get hot board items
 */
export async function speedLayerGetBoardItems(boardId: string): Promise<BoardItem[] | null> {
  const key = speedLayerKeys.boardItems(boardId);
  return await cacheGet<BoardItem[]>(key);
}

/**
 * Speed Layer: Save precomputed board aggregations
 */
export async function speedLayerSetBoardAgg(boardId: string, agg: BoardAggregation): Promise<void> {
  const key = speedLayerKeys.boardAgg(boardId);
  await cacheSet(key, agg, SPEED_LAYER_TTL_SECONDS);
}

/**
 * Speed Layer: Retrieve precomputed board aggregations
 */
export async function speedLayerGetBoardAgg(boardId: string): Promise<BoardAggregation | null> {
  const key = speedLayerKeys.boardAgg(boardId);
  return await cacheGet<BoardAggregation>(key);
}

/**
 * Speed Layer: Save precomputed group aggregation
 */
export async function speedLayerSetGroupAgg(groupId: string, agg: GroupAggregation): Promise<void> {
  const key = speedLayerKeys.groupAgg(groupId);
  await cacheSet(key, agg, SPEED_LAYER_TTL_SECONDS);
}

/**
 * Speed Layer: Invalidate hot cache when a board is modified
 */
export async function speedLayerInvalidateBoard(boardId: string, groupIds: string[] = []): Promise<void> {
  await cacheDelete(speedLayerKeys.boardItems(boardId));
  await cacheDelete(speedLayerKeys.boardAgg(boardId));
  for (const gid of groupIds) {
    await cacheDelete(speedLayerKeys.groupAgg(gid));
  }
}
