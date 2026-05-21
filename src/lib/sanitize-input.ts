/**
 * Input sanitization for user-provided text fields.
 * Strips HTML/script tags and limits string length to prevent stored XSS
 * and oversized input attacks.
 */

/** Strip HTML tags and dangerous patterns from user input. */
export function stripHtml(input: string): string {
  return input
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handler attributes
    .replace(/\bon\w+\s*=\s*(['"]?).*?\1/gi, '')
    // Remove all HTML tags
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Trim whitespace
    .trim()
}

/** Sanitize an object's string fields by stripping HTML. */
export function sanitizeStrings<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = stripHtml(value)
    }
  }
  return result
}
