/**
 * AI Error Sanitization
 *
 * Maps provider-specific errors to generic safe messages.
 * Prevents leaking endpoints, model names, API keys, or internal details to clients.
 */

interface SanitizedError {
  message: string
  code: string
  status: number
}

/**
 * Map an AI provider error to a safe, generic error response.
 */
export function sanitizeAIError(error: unknown): SanitizedError {
  const errMsg = error instanceof Error ? error.message : String(error)
  const lower = errMsg.toLowerCase()

  // Rate limit / quota
  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('quota')) {
    console.warn('[AI] Rate limit hit:', errMsg)
    return {
      message: 'The AI service is temporarily busy. Please try again in a moment.',
      code: 'AI_RATE_LIMITED',
      status: 429,
    }
  }

  // Auth / credentials
  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('api key')) {
    console.error('[AI] Auth error:', errMsg)
    return {
      message: 'The AI service is not available. Please contact your administrator.',
      code: 'AI_AUTH_ERROR',
      status: 503,
    }
  }

  // Model not found / deployment not found
  if (lower.includes('404') || lower.includes('not found') || lower.includes('deployment')) {
    console.error('[AI] Model/deployment not found:', errMsg)
    return {
      message: 'The AI service is temporarily unavailable. Please try again later.',
      code: 'AI_UNAVAILABLE',
      status: 503,
    }
  }

  // Timeout
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('ETIMEDOUT')) {
    console.warn('[AI] Timeout:', errMsg)
    return {
      message: 'The AI request took too long. Please try again with a shorter input.',
      code: 'AI_TIMEOUT',
      status: 504,
    }
  }

  // Content filter / safety
  if (lower.includes('content filter') || lower.includes('content_filter') || lower.includes('safety')) {
    console.warn('[AI] Content filter triggered:', errMsg)
    return {
      message: 'The request was flagged by content safety filters. Please rephrase your input.',
      code: 'AI_CONTENT_FILTERED',
      status: 400,
    }
  }

  // Token limit
  if (lower.includes('token') && (lower.includes('limit') || lower.includes('exceed') || lower.includes('maximum'))) {
    console.warn('[AI] Token limit:', errMsg)
    return {
      message: 'The input is too long for the AI to process. Please reduce the amount of data.',
      code: 'AI_TOKEN_LIMIT',
      status: 400,
    }
  }

  // Generic fallback -- log the real error, return safe message
  console.error('[AI] Unhandled error:', errMsg)
  return {
    message: 'An error occurred while processing your request. Please try again.',
    code: 'AI_ERROR',
    status: 500,
  }
}
