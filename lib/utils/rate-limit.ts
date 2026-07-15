
// NOTE: In-memory rate limiter. Resets on cold start.
// For multi-instance production, replace with Redis (Upstash) or
// Supabase row-based rate limiting.
// At current scale (<200 users), this is sufficient.
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
};

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  // Clean up expired entries periodically
  if (store.size > 10000) {
    for (const [key, val] of store.entries()) {
      if (val.resetAt < now) store.delete(key);
    }
  }

  // No existing entry or expired
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    store.set(identifier, { count: 1, resetAt });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }

  // Existing entry, check limit
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment
  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function rateLimitByIp(
  ip: string,
  config?: RateLimitConfig
): { success: boolean; remaining: number; resetAt: number } {
  return rateLimit(`ip:${ip}`, config);
}

export function rateLimitByUser(
  userId: string,
  config?: RateLimitConfig
): { success: boolean; remaining: number; resetAt: number } {
  return rateLimit(`user:${userId}`, config);
}