/**
 * AI Output Validation
 *
 * Validates AI responses against expected schemas before they are stored in the database.
 * Prevents hallucinated values, malformed data, and XSS via AI-generated content.
 */

export interface ValidationRule {
  field: string
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array'
  required?: boolean
  min?: number
  max?: number
  enumValues?: string[]
  maxLength?: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  sanitizedData?: Record<string, unknown>
}

/**
 * Validate a parsed AI response against a set of rules.
 */
export function validateAgentOutput(
  data: Record<string, unknown>,
  rules: ValidationRule[]
): ValidationResult {
  const errors: string[] = []
  const sanitized: Record<string, unknown> = { ...data }

  for (const rule of rules) {
    const value = data[rule.field]

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`Missing required field: ${rule.field}`)
      continue
    }

    if (value === undefined || value === null) continue

    // Type checks
    switch (rule.type) {
      case 'number': {
        const num = typeof value === 'number' ? value : Number(value)
        if (isNaN(num)) {
          errors.push(`${rule.field} must be a number, got: ${typeof value}`)
        } else {
          if (rule.min !== undefined && num < rule.min) {
            errors.push(`${rule.field} must be >= ${rule.min}, got: ${num}`)
            sanitized[rule.field] = rule.min
          } else if (rule.max !== undefined && num > rule.max) {
            errors.push(`${rule.field} must be <= ${rule.max}, got: ${num}`)
            sanitized[rule.field] = rule.max
          } else {
            sanitized[rule.field] = num
          }
        }
        break
      }
      case 'enum': {
        if (rule.enumValues && !rule.enumValues.includes(String(value))) {
          errors.push(`${rule.field} must be one of [${rule.enumValues.join(', ')}], got: ${value}`)
        }
        break
      }
      case 'string': {
        if (typeof value !== 'string') {
          errors.push(`${rule.field} must be a string, got: ${typeof value}`)
        } else if (rule.maxLength && value.length > rule.maxLength) {
          sanitized[rule.field] = value.slice(0, rule.maxLength)
        }
        break
      }
      case 'array': {
        if (!Array.isArray(value)) {
          errors.push(`${rule.field} must be an array, got: ${typeof value}`)
        }
        break
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedData: sanitized,
  }
}

// Common validation rules for Document AI agent outputs

export const REVIEW_SCORE_RULES: ValidationRule[] = [
  { field: 'overallReviewScore', type: 'number', min: 1, max: 100 },
  { field: 'priorityTier', type: 'enum', enumValues: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
]

export const CASE_REVIEW_SCORE_RULES: ValidationRule[] = [
  { field: 'securityScore', type: 'number', min: 1, max: 5 },
  { field: 'operationalScore', type: 'number', min: 1, max: 5 },
  { field: 'complianceScore', type: 'number', min: 1, max: 5 },
  { field: 'financialScore', type: 'number', min: 1, max: 5 },
  { field: 'reputationalScore', type: 'number', min: 1, max: 5 },
  { field: 'strategicScore', type: 'number', min: 1, max: 5 },
  { field: 'overallReviewScore', type: 'number', min: 1, max: 5 },
  { field: 'reviewRating', type: 'enum', enumValues: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
  { field: 'summary', type: 'string', required: true, maxLength: 10000 },
  { field: 'recommendations', type: 'string', maxLength: 10000 },
]

export const ISSUE_RULES: ValidationRule[] = [
  { field: 'severity', type: 'enum', required: true, enumValues: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] },
  { field: 'title', type: 'string', required: true, maxLength: 500 },
  { field: 'description', type: 'string', maxLength: 10000 },
  { field: 'recommendation', type: 'string', maxLength: 10000 },
]

export const REPORT_RULES: ValidationRule[] = [
  { field: 'content', type: 'string', required: true, maxLength: 100000 },
  { field: 'reportType', type: 'enum', enumValues: ['EXECUTIVE_SUMMARY', 'DETAILED_ASSESSMENT', 'COMPLIANCE_STATUS', 'PORTFOLIO_OVERVIEW', 'TREND_ANALYSIS'] },
]

/**
 * Safely parse JSON from AI response, with fallback.
 * Prevents JSON.parse crashes from malformed AI output.
 */
export function safeParseJSON<T>(text: string): { success: true; data: T } | { success: false; error: string } {
  try {
    // 1. Try raw parse first (fastest path)
    const data = JSON.parse(text.trim()) as T
    return { success: true, data }
  } catch {
    // 2. Extract from markdown code blocks (```json ... ``` or ``` ... ```)
    try {
      let jsonStr = text
      const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      } else {
        // 3. Strip leading/trailing backticks and language tags aggressively
        jsonStr = text.replace(/^[`\s]*(?:json)?\s*/i, '').replace(/[`\s]*$/i, '')
      }
      // 4. Find the first { or [ and last } or ] to isolate JSON
      const start = jsonStr.search(/[{[]/)
      const end = Math.max(jsonStr.lastIndexOf('}'), jsonStr.lastIndexOf(']'))
      if (start !== -1 && end !== -1 && end >= start) {
        jsonStr = jsonStr.substring(start, end + 1)
      }
      const data = JSON.parse(jsonStr.trim()) as T
      return { success: true, data }
    } catch (error) {
      // 5. Attempt truncation recovery — if the JSON was cut off mid-string,
      //    try to close open strings, arrays, and objects to salvage partial data
      if (error instanceof Error && /unterminated string|unexpected end/i.test(error.message)) {
        try {
          let recovered = text
          const jsonMatch2 = text.match(/```(?:json)?\s*\n?([\s\S]*?)(?:```|$)/)
          if (jsonMatch2) recovered = jsonMatch2[1]
          const start2 = recovered.search(/[{[]/)
          if (start2 !== -1) recovered = recovered.substring(start2)

          // Close any unterminated string
          const quoteCount = (recovered.match(/(?<!\\)"/g) || []).length
          if (quoteCount % 2 !== 0) recovered += '"'

          // Close open arrays and objects in reverse order
          const openBraces = (recovered.match(/\{/g) || []).length - (recovered.match(/\}/g) || []).length
          const openBrackets = (recovered.match(/\[/g) || []).length - (recovered.match(/\]/g) || []).length
          for (let i = 0; i < openBrackets; i++) recovered += ']'
          for (let i = 0; i < openBraces; i++) recovered += '}'

          const data = JSON.parse(recovered) as T
          return { success: true, data }
        } catch {
          // Recovery failed — fall through to original error
        }
      }
      return { success: false, error: `Failed to parse AI response as JSON: ${error instanceof Error ? error.message : 'unknown error'}` }
    }
  }
}
