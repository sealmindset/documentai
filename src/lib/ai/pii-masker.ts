/**
 * PII Masker
 *
 * Pseudonymizes personal identifiers before AI submission,
 * restores them in the response. Vendor business data (risk scores,
 * contract dates, spend) is NOT masked -- it's needed for accurate analysis.
 */

export interface PiiMapping {
  original: string
  placeholder: string
}

export interface MaskResult {
  maskedText: string
  mappings: PiiMapping[]
}

// Request-scoped counter for unique placeholders (avoids module-level state issues)
function makeIdGenerator(): () => string {
  let counter = 0
  return () => String(++counter).padStart(3, '0')
}

// Patterns for personal identifiers
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const PHONE_REGEX = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g

/**
 * Mask PII in text, replacing personal identifiers with placeholders.
 * Returns the masked text and a mapping for restoration.
 */
export function maskPII(text: string): MaskResult {
  if (process.env.AI_PII_MASKING_ENABLED === 'false') {
    return { maskedText: text, mappings: [] }
  }

  const mappings: PiiMapping[] = []
  const nextId = makeIdGenerator()
  let masked = text

  // SSNs first (most specific)
  masked = masked.replace(SSN_REGEX, (match) => {
    const placeholder = `[SSN-${nextId()}]`
    mappings.push({ original: match, placeholder })
    return placeholder
  })

  // Emails
  masked = masked.replace(EMAIL_REGEX, (match) => {
    const placeholder = `[EMAIL-${nextId()}]`
    mappings.push({ original: match, placeholder })
    return placeholder
  })

  // Phone numbers
  masked = masked.replace(PHONE_REGEX, (match) => {
    // Avoid masking short numbers that might be scores or IDs
    if (match.replace(/\D/g, '').length < 7) return match
    const placeholder = `[PHONE-${nextId()}]`
    mappings.push({ original: match, placeholder })
    return placeholder
  })

  return { maskedText: masked, mappings }
}

/**
 * Restore original PII values in AI response text.
 */
export function unmaskPII(text: string, mappings: PiiMapping[]): string {
  let restored = text
  for (const { original, placeholder } of mappings) {
    restored = restored.replaceAll(placeholder, original)
  }
  return restored
}

/**
 * @deprecated No longer needed -- counters are now request-scoped.
 */
export function resetMaskerCounter(): void {
  // No-op: counters are now created per-call via makeIdGenerator()
}
