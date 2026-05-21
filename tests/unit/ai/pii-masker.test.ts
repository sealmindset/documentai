import { describe, it, expect, vi, beforeEach } from 'vitest'
import { maskPII, unmaskPII } from '@/lib/ai/pii-masker'

describe('maskPII', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('masks email addresses', () => {
    const result = maskPII('Contact john@example.com for details')
    expect(result.maskedText).not.toContain('john@example.com')
    expect(result.maskedText).toContain('[EMAIL-')
    expect(result.mappings).toHaveLength(1)
    expect(result.mappings[0].original).toBe('john@example.com')
  })

  it('masks phone numbers', () => {
    const result = maskPII('Call (555) 123-4567 for info')
    expect(result.maskedText).not.toContain('(555) 123-4567')
    expect(result.maskedText).toContain('[PHONE-')
  })

  it('masks SSNs', () => {
    const result = maskPII('SSN: 123-45-6789')
    expect(result.maskedText).not.toContain('123-45-6789')
    expect(result.maskedText).toContain('[SSN-')
  })

  it('masks multiple PII types in one text', () => {
    const text = 'User john@acme.com, SSN 123-45-6789, phone 555-867-5309'
    const result = maskPII(text)
    expect(result.mappings.length).toBeGreaterThanOrEqual(3)
    expect(result.maskedText).not.toContain('john@acme.com')
    expect(result.maskedText).not.toContain('123-45-6789')
    expect(result.maskedText).not.toContain('555-867-5309')
  })

  it('preserves non-PII text', () => {
    const result = maskPII('The contract value is $50,000 with a HIGH risk rating.')
    expect(result.maskedText).toContain('$50,000')
    expect(result.maskedText).toContain('HIGH risk rating')
    expect(result.mappings).toHaveLength(0)
  })

  it('skips masking when disabled via env var', () => {
    vi.stubEnv('AI_PII_MASKING_ENABLED', 'false')
    const text = 'Email: test@test.com'
    const result = maskPII(text)
    expect(result.maskedText).toBe(text)
    expect(result.mappings).toHaveLength(0)
  })

  it('does not mask short numbers that look like IDs', () => {
    const result = maskPII('Risk score: 85, Case ID: 12345')
    expect(result.maskedText).toContain('85')
    expect(result.maskedText).toContain('12345')
  })
})

describe('unmaskPII', () => {
  it('restores masked values', () => {
    const original = 'Contact john@example.com for details'
    const { maskedText, mappings } = maskPII(original)
    const restored = unmaskPII(maskedText, mappings)
    expect(restored).toBe(original)
  })

  it('restores multiple masked values', () => {
    const original = 'User john@acme.com, SSN 123-45-6789'
    const { maskedText, mappings } = maskPII(original)
    const restored = unmaskPII(maskedText, mappings)
    expect(restored).toBe(original)
  })

  it('handles empty mappings', () => {
    const text = 'No PII here'
    expect(unmaskPII(text, [])).toBe(text)
  })

  it('roundtrips correctly', () => {
    const original = 'From: alice@corp.com (555) 234-5678, SSN: 111-22-3333'
    const masked = maskPII(original)
    const restored = unmaskPII(masked.maskedText, masked.mappings)
    expect(restored).toBe(original)
  })
})
