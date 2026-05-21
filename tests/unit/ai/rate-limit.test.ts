import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, recordTokenUsage, aiRateLimit } from '@/lib/ai/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('allows requests within the limit', () => {
    const userId = `test-user-${Date.now()}-allow`
    const result = checkRateLimit(userId)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(19)
  })

  it('blocks requests over the limit', () => {
    vi.stubEnv('AI_RATE_LIMIT_REQUESTS_PER_MINUTE', '5')
    const userId = `test-user-${Date.now()}-block`

    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit(userId)
      expect(r.allowed).toBe(true)
    }

    const blocked = checkRateLimit(userId)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })

  it('tracks separate limits per user', () => {
    const userA = `user-a-${Date.now()}`
    const userB = `user-b-${Date.now()}`

    checkRateLimit(userA)
    checkRateLimit(userA)
    checkRateLimit(userA)

    const resultB = checkRateLimit(userB)
    expect(resultB.remaining).toBe(19)
  })
})

describe('recordTokenUsage', () => {
  it('returns true when within budget', () => {
    const userId = `token-user-${Date.now()}`
    expect(recordTokenUsage(userId, 1000)).toBe(true)
  })

  it('returns false when budget exceeded', () => {
    vi.stubEnv('AI_RATE_LIMIT_TOKENS_PER_MINUTE', '100')
    const userId = `token-over-${Date.now()}`
    recordTokenUsage(userId, 50)
    expect(recordTokenUsage(userId, 60)).toBe(false)
  })
})

describe('aiRateLimit', () => {
  it('returns null when allowed', () => {
    const userId = `ai-ok-${Date.now()}`
    expect(aiRateLimit(userId)).toBeNull()
  })

  it('returns 429 Response when rate limited', () => {
    vi.stubEnv('AI_RATE_LIMIT_REQUESTS_PER_MINUTE', '2')
    const userId = `ai-limited-${Date.now()}`

    checkRateLimit(userId)
    checkRateLimit(userId)

    const response = aiRateLimit(userId)
    expect(response).not.toBeNull()
    expect(response!.status).toBe(429)
    expect(response!.headers.get('Retry-After')).toBeTruthy()
  })
})
