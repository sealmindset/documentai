/**
 * AI Rate Limiting
 *
 * Per-user request and token budget enforcement on AI endpoints.
 * Uses in-memory sliding window -- resets when server restarts.
 */

interface RateLimitEntry {
  requests: number[]     // timestamps of requests in current window
  tokens: number         // total tokens used in current window
  windowStart: number    // start of current window
}

const store = new Map<string, RateLimitEntry>()
const WINDOW_MS = 60_000 // 1-minute sliding window

function getConfig() {
  return {
    maxRequestsPerMinute: parseInt(process.env.AI_RATE_LIMIT_REQUESTS_PER_MINUTE || '20', 10),
    maxTokensPerMinute: parseInt(process.env.AI_RATE_LIMIT_TOKENS_PER_MINUTE || '50000', 10),
  }
}

function cleanWindow(entry: RateLimitEntry, now: number): void {
  const cutoff = now - WINDOW_MS
  entry.requests = entry.requests.filter((t) => t > cutoff)
  if (entry.windowStart < cutoff) {
    entry.tokens = 0
    entry.windowStart = now
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs?: number
}

/**
 * Check if a user is within their AI rate limit.
 * Call this BEFORE making the AI request.
 */
export function checkRateLimit(userId: string): RateLimitResult {
  const config = getConfig()
  const now = Date.now()

  let entry = store.get(userId)
  if (!entry) {
    entry = { requests: [], tokens: 0, windowStart: now }
    store.set(userId, entry)
  }

  cleanWindow(entry, now)

  if (entry.requests.length >= config.maxRequestsPerMinute) {
    const oldestInWindow = entry.requests[0]
    const retryAfterMs = oldestInWindow + WINDOW_MS - now
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 1000),
    }
  }

  entry.requests.push(now)
  return {
    allowed: true,
    remaining: config.maxRequestsPerMinute - entry.requests.length,
  }
}

/**
 * Record token usage after an AI response.
 * Returns true if within budget, false if budget exceeded (for logging).
 */
export function recordTokenUsage(userId: string, tokens: number): boolean {
  const config = getConfig()
  const now = Date.now()

  let entry = store.get(userId)
  if (!entry) {
    entry = { requests: [], tokens: 0, windowStart: now }
    store.set(userId, entry)
  }

  cleanWindow(entry, now)
  entry.tokens += tokens

  return entry.tokens <= config.maxTokensPerMinute
}

/**
 * Express/Next.js-compatible rate limit check.
 * Returns a Response if rate limited, null if allowed.
 */
export function aiRateLimit(userId: string): Response | null {
  const result = checkRateLimit(userId)
  if (!result.allowed) {
    return Response.json(
      { error: 'AI rate limit exceeded. Please wait before making another request.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.retryAfterMs || 60000) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }
  return null
}
