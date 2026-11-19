/**
 * Bellek içi Sliding-Window Rate Limiter
 * IP veya doğrulanmış Firebase UID bazlı istek sınırlaması sağlar.
 * Giriş yapmış kullanıcılara daha yüksek kota tanır.
 */

interface RateLimitEntry {
  timestamps: number[];
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();
let lastCleanup = Date.now();

function cleanupOldEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;

  for (const [, bucket] of stores) {
    for (const [key, entry] of bucket) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) {
        bucket.delete(key);
      }
    }
  }
}

export function checkRateLimit(params: {
  namespace: string;
  identifier: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const { namespace, identifier, limit, windowMs } = params;
  const now = Date.now();

  cleanupOldEntries(windowMs);

  let bucket = stores.get(namespace);
  if (!bucket) {
    bucket = new Map();
    stores.set(namespace, bucket);
  }

  const entry = bucket.get(identifier) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const resetAt = oldest + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
    bucket.set(identifier, entry);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    };
  }

  entry.timestamps.push(now);
  bucket.set(identifier, entry);

  const oldest = entry.timestamps[0];
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - entry.timestamps.length),
    resetAt: oldest + windowMs,
    retryAfterSeconds: 0,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown-ip';
}

export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfterSeconds);
  }
  return headers;
}

/** Testlerde bellek durumunu sıfırlamak için kullanılır. */
export function resetRateLimits() {
  stores.clear();
}
