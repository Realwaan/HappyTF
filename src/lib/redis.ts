/**
 * Redis Caching, Webhook Idempotency & Rate-Limiting Engine
 * Supports Upstash Redis REST API with graceful in-memory fallback for local development.
 */

// In-memory fallback store with TTL tracking
interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

const memoryStore = new Map<string, CacheEntry>();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const isUpstashConfigured = Boolean(UPSTASH_URL && UPSTASH_TOKEN && !UPSTASH_URL.includes('your-upstash'));

/**
 * Execute command against Upstash REST API
 */
async function upstashCommand<T = unknown>(command: (string | number)[]): Promise<T | null> {
  if (!isUpstashConfigured) return null;

  try {
    const res = await fetch(`${UPSTASH_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`[Redis] Upstash command failed: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return data.result as T;
  } catch (error) {
    console.error('[Redis] Upstash connection error:', error);
    return null;
  }
}

/**
 * Retrieve cached JSON object
 */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  if (isUpstashConfigured) {
    const raw = await upstashCommand<string>(['GET', key]);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return (raw as unknown) as T;
    }
  }

  // Memory fallback
  const entry = memoryStore.get(key);
  if (!entry) return null;

  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }

  try {
    return JSON.parse(entry.value) as T;
  } catch {
    return (entry.value as unknown) as T;
  }
}

/**
 * Store JSON value in cache with optional TTL in seconds
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  if (isUpstashConfigured) {
    if (ttlSeconds) {
      await upstashCommand(['SET', key, serialized, 'EX', ttlSeconds]);
    } else {
      await upstashCommand(['SET', key, serialized]);
    }
    return;
  }

  // Memory fallback
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  memoryStore.set(key, { value: serialized, expiresAt });
}

/**
 * Remove key from cache
 */
export async function cacheDelete(key: string): Promise<void> {
  if (isUpstashConfigured) {
    await upstashCommand(['DEL', key]);
    return;
  }

  memoryStore.delete(key);
}

/**
 * Check and register an idempotency key to prevent duplicate webhook processing.
 * Returns true if this event is NEW (safe to process), false if DUPLICATE.
 */
export async function checkAndSetIdempotencyKey(eventId: string, ttlSeconds = 300): Promise<boolean> {
  const key = `idempotency:${eventId}`;

  if (isUpstashConfigured) {
    // Redis SET key value NX EX ttl: returns 'OK' if set, null if key already existed
    const result = await upstashCommand<string>(['SET', key, '1', 'NX', 'EX', ttlSeconds]);
    return result === 'OK';
  }

  // Memory fallback
  const existing = memoryStore.get(key);
  if (existing && (!existing.expiresAt || Date.now() <= existing.expiresAt)) {
    return false; // Already processed
  }

  memoryStore.set(key, {
    value: '1',
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return true;
}

/**
 * Sliding window rate-limiter for ticketing endpoints
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests = 30,
  windowSeconds = 60
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  if (isUpstashConfigured) {
    // Upstash pipeline or simple counter
    const current = await upstashCommand<number>(['INCR', key]);
    if (current === 1) {
      await upstashCommand(['EXPIRE', key, windowSeconds]);
    }
    const count = current || 0;
    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetInSeconds: windowSeconds,
    };
  }

  // Memory fallback
  const entry = memoryStore.get(key);
  let count = 0;
  if (entry && (!entry.expiresAt || Date.now() <= entry.expiresAt)) {
    count = parseInt(entry.value, 10) + 1;
  } else {
    count = 1;
  }

  memoryStore.set(key, {
    value: count.toString(),
    expiresAt: Date.now() + windowSeconds * 1000,
  });

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetInSeconds: windowSeconds,
  };
}
