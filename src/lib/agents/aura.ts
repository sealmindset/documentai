/**
 * AURA - Automated Upload & Recognition Agent
 *
 * Purpose: Analyzes uploaded legal documents to extract case information,
 * classify document types, identify parties and charges, and compare document similarity.
 *
 * Capabilities:
 * 1. Document Extraction (standard tier) - extracts case/party info + confidence + analysis
 * 2. Document Similarity (simple tier) - classifies as identical/updated/different
 *
 * This is a utility agent called by onboarding routes, NOT part of the orchestrator pipelines.
 */

import { BaseAgent } from './base-agent'
import { getPrompt } from '@/lib/prompts'
import { chat } from '@/lib/ai/provider'
import type { ChatMessage } from '@/lib/ai/provider'
import { sanitizePromptInput, wrapUserInput, validatePromptSize } from '@/lib/ai/sanitize'
import { safeParseJSON } from '@/lib/ai/validate'
import { maskPII, unmaskPII } from '@/lib/ai/pii-masker'
import { sanitizeAIError } from '@/lib/ai/errors'
import { SAFETY_PREAMBLE } from '@/lib/ai/safety-preamble'
import type {
  AgentConfig,
  AgentResult,
  DocumentExtractionInput,
  DocumentExtractionOutput,
  DocumentComparisonInput,
  DocumentComparisonOutput,
} from './types'

const AURA_CONFIG: AgentConfig = {
  name: 'AURA',
  description: 'Automated Upload & Recognition Agent',
  tier: 'standard',
  temperature: 0.3,
  maxTokens: 4096,
}

const DEFAULT_EXTRACTION_PROMPT = `You are an expert at extracting case and party information from legal documents (police reports, court filings, arrest records, witness statements, medical records, motions, discovery materials, expert reports, etc.).

Extract the party/client being DESCRIBED or INVOLVED in this document — NOT the attorney, court clerk, or filing party (unless they are the subject).

For each field, provide a confidence score (0.0 to 1.0) indicating how certain you are.

Also analyze the document for case review purposes.

Return JSON with this exact structure:
{
  "vendorInfo": {
    "name": "string or null (party/client name)",
    "legalName": "string or null (full legal name)",
    "dunsNumber": "string or null (case/docket number)",
    "address": {
      "street": "string or null",
      "city": "string or null",
      "state": "string or null",
      "country": "string or null",
      "zip": "string or null"
    },
    "phone": "string or null",
    "primaryContactName": "string or null (attorney of record)",
    "primaryContactEmail": "string or null (attorney email)",
    "primaryContactPhone": "string or null (attorney phone)",
    "industry": "string or null (case type: criminal, civil, family, etc.)",
    "website": "string or null (court/jurisdiction)",
    "documentDate": "YYYY-MM-DD or null",
    "documentType": "POLICE_REPORT | ARREST_RECORD | COURT_FILING | WITNESS_STATEMENT | MEDICAL_RECORDS | FINANCIAL_DISCLOSURE | CUSTODY_EVALUATION | DEPOSITION | MOTION | DISCOVERY_MATERIALS | EXPERT_REPORT | CONTRACT | OTHER"
  },
  "confidence": {
    "name": 0.0,
    "legalName": 0.0,
    "dunsNumber": 0.0,
    "address": 0.0,
    "phone": 0.0,
    "primaryContactName": 0.0,
    "primaryContactEmail": 0.0,
    "primaryContactPhone": 0.0,
    "industry": 0.0,
    "website": 0.0,
    "documentDate": 0.0,
    "documentType": 0.0
  },
  "documentAnalysis": {
    "documentType": "POLICE_REPORT | ARREST_RECORD | COURT_FILING | WITNESS_STATEMENT | MEDICAL_RECORDS | DEPOSITION | MOTION | DISCOVERY_MATERIALS | EXPERT_REPORT | CONTRACT | OTHER",
    "summary": "Brief summary of the document",
    "keyFindings": ["finding1", "finding2"],
    "riskFactors": ["risk1", "risk2"],
    "strengths": ["strength1", "strength2"],
    "recommendedRating": "CRITICAL | HIGH | MEDIUM | LOW",
    "controlsCovered": ["legal issues covered: e.g., procedural compliance, evidence chain, constitutional rights"],
    "expirationDate": "YYYY-MM-DD or null (filing deadline or statute date)",
    "recommendations": ["recommendation1", "recommendation2"]
  }
}

If a field is not found in the document, set it to null with confidence 0.0.`

const DEFAULT_SIMILARITY_PROMPT = `Compare these two document excerpts from the same case/party and determine their relationship.

Document A (existing, dated {dateA}):
<doc_a>
{docA}
</doc_a>

Document B (new upload, dated {dateB}):
<doc_b>
{docB}
</doc_b>

Return JSON:
{
  "similarity": "identical | updated | different",
  "confidence": 0.95,
  "explanation": "Brief explanation of the relationship"
}

Definitions:
- "identical": Same document content, possibly different formatting. Same findings and conclusions.
- "updated": Newer version of the same document type covering the same case/party. Contains updated information.
- "different": Different documents entirely (different type, scope, or subject).`

export class AURAAgent extends BaseAgent {
  constructor() {
    super(AURA_CONFIG)
  }

  protected getDefaultSystemPrompt(): string {
    return DEFAULT_EXTRACTION_PROMPT
  }

  /**
   * Load the similarity comparison prompt from DB, falling back to default.
   */
  private async getSimilarityPrompt(): Promise<string> {
    return getPrompt('aura-similarity', DEFAULT_SIMILARITY_PROMPT)
  }

  /**
   * Extract vendor information and analyze a document.
   * Handles both text documents (via invokeWithJSON) and images (via chat with multimodal content).
   */
  async execute(input: DocumentExtractionInput): Promise<AgentResult<DocumentExtractionOutput>> {
    const startTime = Date.now()

    try {
      let result: DocumentExtractionOutput

      if (input.isImage && input.imageBase64 && input.imageMime) {
        // Image documents: use chat() directly with multimodal content
        result = await this.extractFromImage(input.imageBase64, input.imageMime)
      } else {
        // Text documents: use BaseAgent's invokeWithJSON pipeline
        const truncatedContent = input.text.slice(0, 100000)
        const userPrompt = `Extract case and party information and analyze this legal document:\n\n${truncatedContent}\n\nIMPORTANT: Respond ONLY with valid JSON matching the structure defined in the system prompt.`
        result = await this.invokeWithJSON<DocumentExtractionOutput>(userPrompt)
      }

      await this.logActivity({
        activityType: 'DOCUMENT_EXTRACTION',
        entityType: 'Document',
        entityId: input.fileName,
        actionTaken: `Extracted vendor info from ${input.fileName}`,
        inputSummary: `File: ${input.fileName}, Type: ${input.isImage ? 'image' : 'text'}, Size: ${input.text.length} chars`,
        outputSummary: `Vendor: ${result.vendorInfo?.name || 'unknown'}, DocType: ${result.documentAnalysis?.documentType || 'unknown'}`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'DOCUMENT_EXTRACTION',
        entityType: 'Document',
        entityId: input.fileName,
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<DocumentExtractionOutput>(false, undefined, errorMessage, startTime)
    }
  }

  /**
   * Compare two document excerpts to determine their relationship.
   * Uses the similarity prompt (simple tier, low temperature).
   */
  async compareDocuments(input: DocumentComparisonInput): Promise<AgentResult<DocumentComparisonOutput>> {
    const startTime = Date.now()

    try {
      const similarityPrompt = await this.getSimilarityPrompt()

      const prompt = similarityPrompt
        .replace('{dateA}', input.existingDoc.date || 'unknown')
        .replace('{dateB}', input.newDoc.date || 'unknown')
        .replace('{docA}', input.existingDoc.snippet.slice(0, 3000))
        .replace('{docB}', input.newDoc.snippet.slice(0, 3000))

      // Apply safety pipeline manually since we use a different prompt than the system prompt
      const sanitized = sanitizePromptInput(prompt)
      const wrapped = wrapUserInput(sanitized)

      const sizeError = validatePromptSize(wrapped)
      if (sizeError) throw new Error(sizeError)

      const { maskedText, mappings } = maskPII(wrapped)

      const response = await chat(
        [
          { role: 'system', content: SAFETY_PREAMBLE + 'You are a document comparison expert for Vanmerven Law Firm\'s criminal defense and civil litigation practice.' },
          { role: 'user', content: maskedText },
        ],
        { temperature: 0.2, maxTokens: 500, tier: 'simple' }
      )

      const unmasked = unmaskPII(response.content, mappings)
      const parsed = safeParseJSON<DocumentComparisonOutput>(unmasked)

      if (!parsed.success || !parsed.data) {
        throw new Error('Failed to parse similarity response')
      }

      const sim = parsed.data.similarity
      const result: DocumentComparisonOutput = {
        similarity: ['identical', 'updated', 'different'].includes(sim) ? sim : 'different',
        confidence: parsed.data.confidence || 0,
        explanation: parsed.data.explanation || '',
      }

      await this.logActivity({
        activityType: 'DOCUMENT_COMPARISON',
        entityType: 'Document',
        actionTaken: `Compared "${input.existingDoc.name}" with "${input.newDoc.name}"`,
        inputSummary: `Existing: ${input.existingDoc.name}, New: ${input.newDoc.name}`,
        outputSummary: `Similarity: ${result.similarity} (${result.confidence})`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'DOCUMENT_COMPARISON',
        entityType: 'Document',
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<DocumentComparisonOutput>(false, undefined, errorMessage, startTime)
    }
  }

  /**
   * Handle image extraction using multimodal chat (BaseAgent.invoke only supports text).
   */
  private async extractFromImage(imageBase64: string, imageMime: string): Promise<DocumentExtractionOutput> {
    const systemPrompt = await this.getSystemPrompt()

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${imageMime};base64,${imageBase64}` },
          },
          {
            type: 'text',
            text: 'Extract case and party information and analyze this legal document image. Respond ONLY with valid JSON.',
          },
        ],
      },
    ]

    try {
      const response = await chat(messages, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        tier: this.config.tier,
      })

      const parsed = safeParseJSON<DocumentExtractionOutput>(response.content)
      if (!parsed.success || !parsed.data) {
        throw new Error('Failed to parse AI extraction response from image')
      }

      return parsed.data
    } catch (error) {
      const safe = sanitizeAIError(error)
      throw new Error(safe.message)
    }
  }
}

export const aura = new AURAAgent()
