// file: lib/ratelimit.ts
// Simple in-memory rate limiter — works for single-instance deployments (Vercel serverless).
// For multi-region production, replace with @upstash/ratelimit + Redis.

interface RateLimitEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up stale entries every 10 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > 60 * 60 * 1000) store.delete(key)
  }
}, 10 * 60 * 1000)

export function rateLimit(
  key: string,
  options: { maxRequests: number; windowMs: number }
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart >= options.windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now })
    return { success: true, remaining: options.maxRequests - 1, resetAt: now + options.windowMs }
  }

  if (entry.count >= options.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.windowStart + options.windowMs,
    }
  }

  entry.count++
  return {
    success: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.windowStart + options.windowMs,
  }
}

/** Extracts a best-effort IP from Next.js request headers */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}
