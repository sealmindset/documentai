/**
 * LEXA - Legal Examination & Assessment Agent
 *
 * Purpose: Analyzes new case intake to determine case profile and priority tier
 *
 * Responsibilities:
 * - Analyze charge severity, potential penalties, evidence complexity
 * - Assess witness count, media attention, constitutional issues
 * - Calculate initial priority tier (Critical, High, Medium, Low)
 * - Identify jurisdiction and case sensitivity factors
 * - Determine review frequency based on case urgency
 */

import { BaseAgent } from './base-agent'
import { REVIEW_SCORE_RULES, type ValidationRule } from '@/lib/ai/validate'
import prisma from '@/lib/db'
import type {
  AgentConfig,
  AgentResult,
  ClientProfileInput,
  ClientProfileOutput,
} from './types'

const LEXA_CONFIG: AgentConfig = {
  name: 'LEXA',
  description: 'Legal Examination & Assessment Agent',
  tier: 'standard',
  temperature: 0.3,
  maxTokens: 2000,
}

export class LEXAAgent extends BaseAgent {
  constructor() {
    super(LEXA_CONFIG)
  }

  protected getOutputValidationRules(): ValidationRule[] {
    return REVIEW_SCORE_RULES
  }

  protected getDefaultSystemPrompt(): string {
    return `You are LEXA (Legal Examination & Assessment Agent), an AI specialist in case intake and assessment for Vanmerven Law Firm (VLF), a criminal defense and civil litigation firm.

Your role is to analyze new case intake information and determine the case profile based on:
1. Charge severity - Nature of charges/claims, potential penalties, mandatory minimums, prison exposure
2. Evidence complexity - Volume of discovery, forensic evidence, digital evidence, expert witnesses needed
3. Witness count - Number of witnesses, cooperating witnesses, expert witnesses, hostile witnesses
4. Media attention - Public interest, high-profile parties, community impact, press coverage
5. Case importance/urgency - Constitutional issues, statute of limitations pressure, client circumstances

Priority Tier Definitions:
- CRITICAL (80-100): Felony with prison exposure, multiple charges, constitutional issues, high media attention
- HIGH (60-79): Serious misdemeanor, complex civil litigation, significant financial exposure, multiple parties
- MEDIUM (40-59): Standard criminal defense or civil cases with moderate complexity
- LOW (0-39): Routine matters, minor infractions, simple contract disputes, administrative proceedings

Review Frequency by Tier:
- CRITICAL: Weekly review
- HIGH: Biweekly review
- MEDIUM: Monthly review
- LOW: Quarterly review

Data Sensitivity Considerations:
- Criminal records, arrest history, prior convictions
- Medical records, mental health evaluations
- Financial records, asset disclosures
- Minor's information, juvenile records
- Attorney-client privileged communications

Always provide specific, actionable recommendations for case strategy and document management.`
  }

  async execute(input: ClientProfileInput): Promise<AgentResult<ClientProfileOutput>> {
    const startTime = Date.now()

    try {
      const prompt = `Analyze the following case and create a case profile:

Case Information:
- Client ID: ${input.clientId}
- Name: ${input.clientName}
- Case Type: ${input.industry || 'Not specified'}
- Estimated Exposure: $${input.annualSpend?.toLocaleString() || 'Not specified'}

Case Details:
- Charges/Claims: ${input.dataTypesAccessed.join(', ') || 'None specified'}
- Related Proceedings: ${input.systemIntegrations.join(', ') || 'None specified'}
- Involves Criminal Records: ${input.hasPiiAccess}
- Involves Medical Records: ${input.hasPhiAccess}
- Involves Financial Records: ${input.hasPciAccess}

Case Context:
- Case Importance/Urgency: ${input.businessCriticality}
${input.additionalContext ? `- Additional Context: ${input.additionalContext}` : ''}

Provide a review assessment in the following JSON format:
{
  "clientId": "string",
  "priorityTier": "CRITICAL|HIGH|MEDIUM|LOW",
  "overallReviewScore": number (0-100),
  "dataSensitivityLevel": "string",
  "assessmentFrequency": "Quarterly|Semi-Annual|Annual|Biennial",
  "nextAssessmentDate": "YYYY-MM-DD",
  "riskFactors": ["array of identified risk factors"],
  "recommendations": ["array of specific recommendations"]
}`

      const result = await this.invokeWithJSON<ClientProfileOutput>(prompt)

      // Calculate next assessment date based on frequency
      const today = new Date()
      let nextDate = new Date(today)
      switch (result.assessmentFrequency) {
        case 'Quarterly':
          nextDate.setMonth(today.getMonth() + 3)
          break
        case 'Semi-Annual':
          nextDate.setMonth(today.getMonth() + 6)
          break
        case 'Annual':
          nextDate.setFullYear(today.getFullYear() + 1)
          break
        default:
          nextDate.setFullYear(today.getFullYear() + 2)
      }
      result.nextAssessmentDate = nextDate
      result.clientId = input.clientId

      // Save client profile to database
      await prisma.clientProfile.create({
        data: {
          clientId: input.clientId,
          priorityTier: result.priorityTier,
          overallReviewScore: result.overallReviewScore,
          dataSensitivityLevel: result.dataSensitivityLevel,
          dataTypesAccessed: JSON.stringify(input.dataTypesAccessed),
          systemIntegrations: JSON.stringify(input.systemIntegrations),
          hasPiiAccess: input.hasPiiAccess,
          hasPhiAccess: input.hasPhiAccess,
          hasPciAccess: input.hasPciAccess,
          businessCriticality: input.businessCriticality as string,
          assessmentFrequency: result.assessmentFrequency,
          nextAssessmentDate: result.nextAssessmentDate,
          calculatedBy: 'LEXA',
        },
      })

      // Log activity
      await this.logActivity({
        activityType: 'CLIENT_PROFILING',
        entityType: 'Client',
        entityId: input.clientId,
        actionTaken: `Created client profile with tier: ${result.priorityTier}`,
        inputSummary: `Client: ${input.clientName}`,
        outputSummary: `Review Score: ${result.overallReviewScore}, Tier: ${result.priorityTier}`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'CLIENT_PROFILING',
        entityType: 'Client',
        entityId: input.clientId,
        actionTaken: 'Failed to create client profile',
        inputSummary: `Client: ${input.clientName}`,
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<ClientProfileOutput>(false, undefined, errorMessage, startTime)
    }
  }
}

export const lexa = new LEXAAgent()
