import { complete, completeJSON } from '@/lib/ai/provider'
import { getPrompt } from '@/lib/prompts'
import { sanitizePromptInput, wrapUserInput, validatePromptSize } from '@/lib/ai/sanitize'
import { safeParseJSON, validateAgentOutput, type ValidationRule } from '@/lib/ai/validate'
import { maskPII, unmaskPII, type PiiMapping } from '@/lib/ai/pii-masker'
import { sanitizeAIError } from '@/lib/ai/errors'
import prisma from '@/lib/db'
import type { AgentConfig, AgentResult, AgentLogEntry } from './types'

// Re-export PiiMapping for agents that need it
export type { PiiMapping }

export abstract class BaseAgent {
  protected config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
  }

  /** Default system prompt (used as fallback if DB prompt not found). */
  protected abstract getDefaultSystemPrompt(): string

  /** Optional validation rules for structured AI output. Override in subclasses. */
  protected getOutputValidationRules(): ValidationRule[] | null {
    return null
  }

  /** DB slug for this agent's system prompt, e.g. "vera-system". */
  protected get systemPromptSlug(): string {
    return `${this.config.name.toLowerCase()}-system`
  }

  /** Load system prompt from DB (with safety preamble), falling back to the hardcoded default. */
  protected async getSystemPrompt(): Promise<string> {
    return getPrompt(this.systemPromptSlug, this.getDefaultSystemPrompt())
  }

  protected async invoke(userPrompt: string): Promise<string> {
    console.log(`[${this.config.name}] Sending request (tier: ${this.config.tier})`)

    // Sanitize and wrap user input
    const sanitizedPrompt = wrapUserInput(userPrompt)

    // Validate prompt size
    const sizeError = validatePromptSize(sanitizedPrompt)
    if (sizeError) {
      throw new Error(sizeError)
    }

    // Mask PII before sending to AI provider
    const { maskedText, mappings } = maskPII(sanitizedPrompt)

    const systemPrompt = await this.getSystemPrompt()

    try {
      const result = await complete(systemPrompt, maskedText, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        tier: this.config.tier,
      })

      // Restore PII in the response
      return unmaskPII(result, mappings)
    } catch (error) {
      const safe = sanitizeAIError(error)
      throw new Error(safe.message)
    }
  }

  protected async invokeWithJSON<T>(userPrompt: string): Promise<T> {
    console.log(`[${this.config.name}] Sending JSON request (tier: ${this.config.tier})`)

    // Sanitize and wrap user input
    const sanitizedPrompt = wrapUserInput(userPrompt)

    // Validate prompt size
    const sizeError = validatePromptSize(sanitizedPrompt)
    if (sizeError) {
      throw new Error(sizeError)
    }

    // Mask PII before sending to AI provider
    const { maskedText, mappings } = maskPII(sanitizedPrompt)

    const systemPrompt = await this.getSystemPrompt()

    try {
      const prompt = `${maskedText}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after the JSON object.`
      const text = await complete(systemPrompt, prompt, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        tier: this.config.tier,
      })

      // Restore PII in the response before parsing
      const unmasked = unmaskPII(text, mappings)

      // Safe JSON parse instead of raw JSON.parse
      const parsed = safeParseJSON<T>(unmasked)
      if (!parsed.success) {
        throw new Error(parsed.error)
      }

      // Validate AI output against rules if defined
      const rules = this.getOutputValidationRules()
      if (rules && typeof parsed.data === 'object' && parsed.data !== null) {
        const validation = validateAgentOutput(parsed.data as Record<string, unknown>, rules)
        if (!validation.valid) {
          console.warn(`[${this.config.name}] AI output validation warnings:`, validation.errors)
        }
        if (validation.sanitizedData) {
          return validation.sanitizedData as T
        }
      }

      return parsed.data
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Failed to parse')) {
        throw error
      }
      const safe = sanitizeAIError(error)
      throw new Error(safe.message)
    }
  }

  protected async logActivity(entry: Omit<AgentLogEntry, 'agentName'>): Promise<void> {
    try {
      await prisma.agentActivityLog.create({
        data: {
          agentName: this.config.name,
          activityType: entry.activityType,
          entityType: entry.entityType,
          entityId: entry.entityId,
          actionTaken: entry.actionTaken,
          inputSummary: entry.inputSummary,
          outputSummary: entry.outputSummary,
          status: entry.status,
          errorMessage: entry.errorMessage,
          processingTimeMs: entry.processingTimeMs,
        },
      })
    } catch (error) {
      console.error(`Failed to log agent activity for ${this.config.name}:`, error)
    }
  }

  protected createResult<T>(
    success: boolean,
    data: T | undefined,
    error: string | undefined,
    startTime: number
  ): AgentResult<T> {
    return {
      success,
      data,
      error,
      agentName: this.config.name,
      processingTimeMs: Date.now() - startTime,
      timestamp: new Date(),
    }
  }

  abstract execute(input: unknown): Promise<AgentResult>
}
