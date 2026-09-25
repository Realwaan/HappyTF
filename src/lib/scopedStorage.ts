/**
 * Scoped Key-Value Storage API for HappyTF Work OS
 * Inspired by the persistent storage pattern for artifacts & mini-apps.
 *
 * Provides:
 * - get(key, shared?)
 * - set(key, value, shared?)
 * - delete(key, shared?)
 * - list(prefix?, shared?)
 *
 * Data Scope:
 * - Personal (shared: false, default): stored in localStorage under 'happytf:local:'
 * - Shared (shared: true): stored in localStorage under 'happytf:shared:' (simulating workspace sync)
 */

export interface StorageResult<T = unknown> {
  key: string;
  value: T;
  shared: boolean;
}

export interface StorageDeleteResult {
  key: string;
  deleted: boolean;
  shared: boolean;
}

export interface StorageListResult {
  keys: string[];
  prefix?: string;
  shared: boolean;
}

const LOCAL_PREFIX = 'happytf:local:';
const SHARED_PREFIX = 'happytf:shared:';

function getStoragePrefix(shared = false): string {
  return shared ? SHARED_PREFIX : LOCAL_PREFIX;
}

export const scopedStorage = {
  /**
   * Retrieve a value by key
   */
  async get<T = unknown>(key: string, shared = false): Promise<StorageResult<T> | null> {
    try {
      if (typeof window === 'undefined') return null;
      const fullKey = getStoragePrefix(shared) + key;
      const raw = window.localStorage.getItem(fullKey);
      if (raw === null) return null;
      return {
        key,
        value: JSON.parse(raw) as T,
        shared,
      };
    } catch (err) {
      console.error(`[scopedStorage] Failed to get key "${key}":`, err);
      return null;
    }
  },

  /**
   * Store a value under a key (batched objects supported)
   */
  async set<T = unknown>(key: string, value: T, shared = false): Promise<StorageResult<T> | null> {
    try {
      if (typeof window === 'undefined') return null;
      if (!key || key.includes(' ') || key.length > 200) {
        throw new Error('Invalid key: must be under 200 chars and cannot contain whitespace.');
      }
      const fullKey = getStoragePrefix(shared) + key;
      window.localStorage.setItem(fullKey, JSON.stringify(value));
      return {
        key,
        value,
        shared,
      };
    } catch (err) {
      console.error(`[scopedStorage] Failed to set key "${key}":`, err);
      return null;
    }
  },

  /**
   * Delete a key
   */
  async delete(key: string, shared = false): Promise<StorageDeleteResult | null> {
    try {
      if (typeof window === 'undefined') return null;
      const fullKey = getStoragePrefix(shared) + key;
      const exists = window.localStorage.getItem(fullKey) !== null;
      window.localStorage.removeItem(fullKey);
      return {
        key,
        deleted: exists,
        shared,
      };
    } catch (err) {
      console.error(`[scopedStorage] Failed to delete key "${key}":`, err);
      return null;
    }
  },

  /**
   * List keys matching an optional prefix
   */
  async list(prefix = '', shared = false): Promise<StorageListResult | null> {
    try {
      if (typeof window === 'undefined') return { keys: [], prefix, shared };
      const storagePrefix = getStoragePrefix(shared);
      const targetPrefix = storagePrefix + prefix;
      const matchingKeys: string[] = [];

      for (let i = 0; i < window.localStorage.length; i++) {
        const fullKey = window.localStorage.key(i);
        if (fullKey && fullKey.startsWith(targetPrefix)) {
          matchingKeys.push(fullKey.slice(storagePrefix.length));
        }
      }

      return {
        keys: matchingKeys.sort(),
        prefix,
        shared,
      };
    } catch (err) {
      console.error(`[scopedStorage] Failed to list keys:`, err);
      return null;
    }
  },
};

// Expose globally on client for embedded mini-apps and console debugging
if (typeof window !== 'undefined') {
  (window as unknown as { happytfStorage: typeof scopedStorage }).happytfStorage = scopedStorage;
}
