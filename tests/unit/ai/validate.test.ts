import { describe, it, expect } from 'vitest'
import {
  validateAgentOutput,
  safeParseJSON,
  REVIEW_SCORE_RULES,
  ISSUE_RULES,
} from '@/lib/ai/validate'

describe('validateAgentOutput', () => {
  it('passes valid data against rules', () => {
    const data = { overallReviewScore: 75, priorityTier: 'HIGH' }
    const result = validateAgentOutput(data, REVIEW_SCORE_RULES)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects out-of-range numeric values', () => {
    const data = { overallReviewScore: 150, priorityTier: 'HIGH' }
    const result = validateAgentOutput(data, REVIEW_SCORE_RULES)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('must be <= 100')
    expect(result.sanitizedData?.overallReviewScore).toBe(100)
  })

  it('rejects below-minimum numeric values', () => {
    const data = { overallReviewScore: 0, priorityTier: 'LOW' }
    const result = validateAgentOutput(data, REVIEW_SCORE_RULES)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('must be >= 1')
    expect(result.sanitizedData?.overallReviewScore).toBe(1)
  })

  it('rejects invalid enum values', () => {
    const data = { overallReviewScore: 50, priorityTier: 'EXTREME' }
    const result = validateAgentOutput(data, REVIEW_SCORE_RULES)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('must be one of')
  })

  it('reports missing required fields', () => {
    const data = { description: 'something' }
    const result = validateAgentOutput(data, ISSUE_RULES)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('severity'),
        expect.stringContaining('title'),
      ])
    )
  })

  it('truncates strings exceeding maxLength', () => {
    const data = {
      severity: 'HIGH',
      title: 'A'.repeat(600),
      description: 'test',
    }
    const result = validateAgentOutput(data, ISSUE_RULES)
    expect((result.sanitizedData?.title as string).length).toBe(500)
  })

  it('skips optional fields when absent', () => {
    const data = { overallReviewScore: 50 }
    const result = validateAgentOutput(data, REVIEW_SCORE_RULES)
    expect(result.errors.filter(e => e.includes('priorityTier'))).toHaveLength(0)
  })

  it('rejects non-numeric values for number fields', () => {
    const data = { overallReviewScore: 'not-a-number', priorityTier: 'HIGH' }
    const result = validateAgentOutput(data, REVIEW_SCORE_RULES)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('must be a number')
  })

  it('validates array fields', () => {
    const rules = [{ field: 'items', type: 'array' as const, required: true }]
    expect(validateAgentOutput({ items: [1, 2] }, rules).valid).toBe(true)
    expect(validateAgentOutput({ items: 'not-array' }, rules).valid).toBe(false)
  })
})

describe('safeParseJSON', () => {
  it('parses clean JSON', () => {
    const result = safeParseJSON<{ name: string }>('{"name":"test"}')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('test')
  })

  it('extracts JSON from markdown code blocks', () => {
    const text = 'Here is the result:\n```json\n{"score": 42}\n```'
    const result = safeParseJSON<{ score: number }>(text)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.score).toBe(42)
  })

  it('extracts JSON from generic code blocks', () => {
    const text = '```\n{"value": true}\n```'
    const result = safeParseJSON<{ value: boolean }>(text)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.value).toBe(true)
  })

  it('handles JSON surrounded by prose', () => {
    const text = 'Based on my analysis, {"priorityTier": "HIGH", "score": 85} is the result.'
    const result = safeParseJSON<{ priorityTier: string; score: number }>(text)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priorityTier).toBe('HIGH')
      expect(result.data.score).toBe(85)
    }
  })

  it('returns error for completely unparseable text', () => {
    const result = safeParseJSON('This is just plain text with no JSON at all.')
    expect(result.success).toBe(false)
  })

  it('parses JSON arrays', () => {
    const result = safeParseJSON<string[]>('["a","b","c"]')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual(['a', 'b', 'c'])
  })

  it('attempts recovery on truncated JSON', () => {
    const text = '{"name": "test", "items": ["a", "b'
    const result = safeParseJSON<{ name: string }>(text)
    if (result.success) {
      expect(result.data.name).toBe('test')
    }
  })
})
