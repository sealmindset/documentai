/**
 * AI Input Sanitization
 *
 * Strips injection patterns from user input before it reaches AI providers.
 * Wraps user content in delimiter tags so the AI distinguishes instructions from data.
 */

// Patterns that attempt to override system instructions
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /ignore\s+(all\s+)?above\s+instructions/gi,
  /disregard\s+(all\s+)?previous/gi,
  /you\s+are\s+now\s+(in\s+)?developer\s+mode/gi,
  /you\s+are\s+now\s+DAN/gi,
  /pretend\s+you\s+are\s+(an?\s+)?unrestricted/gi,
  /act\s+as\s+if\s+you\s+have\s+no\s+(restrictions|limitations|rules)/gi,
  /override\s+(your\s+)?(system\s+)?instructions/gi,
  /repeat\s+(your\s+)?system\s+prompt/gi,
  /show\s+me\s+(your\s+)?system\s+(prompt|message|instructions)/gi,
  /what\s+(are|is)\s+(your\s+)?(system\s+)?(prompt|instructions|rules)/gi,
  /\bsystem\s*:\s*/gi,
  /\bassistant\s*:\s*/gi,
  /```\s*system/gi,
  /<\/?system>/gi,
  /<\/?instructions>/gi,
]

/**
 * Remove injection patterns from user input.
 * Does NOT reject the input -- strips the dangerous parts and lets the rest through.
 */
export function sanitizePromptInput(input: string): string {
  let sanitized = input

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[removed]')
  }

  // Strip null bytes and other control characters (except newline, tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  return sanitized
}

/**
 * Wrap user-provided content in delimiter tags so the AI model
 * can distinguish system instructions from user data.
 */
export function wrapUserInput(input: string): string {
  const sanitized = sanitizePromptInput(input)
  return `<user_input>\n${sanitized}\n</user_input>`
}

/**
 * Validate prompt size against configurable maximum.
 * Returns null if valid, error message if too large.
 */
export function validatePromptSize(prompt: string): string | null {
  const maxChars = parseInt(process.env.AI_MAX_PROMPT_CHARS || '100000', 10)
  if (prompt.length > maxChars) {
    return `Prompt exceeds maximum length of ${maxChars} characters (got ${prompt.length})`
  }
  return null
}

/**
 * Validate document size for analysis features.
 */
export function validateDocumentSize(content: string): string | null {
  const maxChars = parseInt(process.env.AI_MAX_DOCUMENT_CHARS || '500000', 10)
  if (content.length > maxChars) {
    return `Document exceeds maximum length of ${maxChars} characters (got ${content.length})`
  }
  return null
}
