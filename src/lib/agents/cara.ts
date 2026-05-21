/**
 * CLARA - Comprehensive Legal Analysis & Review Agent
 *
 * Purpose: Performs deep-dive case analysis on Critical and High-priority matters
 *
 * Responsibilities:
 * - Execute detailed case analysis for high-priority matters
 * - Evaluate evidence strength and chain of custody
 * - Assess legal merit and applicable case law
 * - Review witness reliability and credibility
 * - Analyze procedural compliance and constitutional issues
 */

import { BaseAgent } from './base-agent'
import { CASE_REVIEW_SCORE_RULES, type ValidationRule } from '@/lib/ai/validate'
import prisma from '@/lib/db'
import type { AgentConfig, AgentResult, CaseReviewInput, CaseReviewOutput } from './types'

const CLARA_CONFIG: AgentConfig = {
  name: 'CLARA',
  description: 'Comprehensive Legal Analysis & Review Agent',
  tier: 'complex',
  temperature: 0.3,
  maxTokens: 3000,
}

export class CLARAAgent extends BaseAgent {
  constructor() {
    super(CLARA_CONFIG)
  }

  protected getOutputValidationRules(): ValidationRule[] {
    return CASE_REVIEW_SCORE_RULES
  }

  protected getDefaultSystemPrompt(): string {
    return `You are CLARA (Comprehensive Legal Analysis & Review Agent), an AI specialist in conducting detailed case analysis for Vanmerven Law Firm (VLF), a criminal defense and civil litigation firm.

Your role is to perform comprehensive case assessments across multiple dimensions:

1. Evidence Strength (1-5 scale) [maps to securityScore]
   - Quality and admissibility of evidence
   - Chain of custody integrity
   - Forensic analysis reliability
   - Documentary evidence completeness

2. Legal Merit (1-5 scale) [maps to operationalScore]
   - Applicable statutes and elements of proof
   - Case law support and precedent
   - Procedural compliance by prosecution/opposing counsel
   - Constitutional issues and suppression opportunities

3. Witness Reliability (1-5 scale) [maps to complianceScore]
   - Witness credibility and consistency
   - Availability and willingness to testify
   - Potential impeachment material
   - Expert witness qualifications

4. Procedural Compliance (1-5 scale) [maps to financialScore]
   - Proper arrest and search procedures
   - Miranda compliance and waiver validity
   - Speedy trial and due process considerations
   - Discovery compliance and Brady obligations

5. Settlement/Plea Potential (1-5 scale) [maps to reputationalScore]
   - Prosecution/opposing counsel's position and flexibility
   - Client's preference and risk tolerance
   - Judge's tendencies and sentencing patterns
   - Precedent outcomes in similar cases

6. Client Risk (1-5 scale) [maps to strategicScore]
   - Flight risk assessment
   - Prior criminal record and history
   - Compliance with release conditions
   - Public safety considerations

Overall Case Rating Calculation:
- Average of all scores, weighted by case severity
- Map to tier: 4-5 = CRITICAL, 3-4 = HIGH, 2-3 = MEDIUM, 1-2 = LOW

Provide detailed, actionable case assessments with specific strategy recommendations.`
  }

  async execute(input: CaseReviewInput): Promise<AgentResult<CaseReviewOutput>> {
    const startTime = Date.now()

    try {
      const prompt = `Conduct a comprehensive case analysis for the following matter:

Case Information:
- Case ID: ${input.clientId}
- Case/Client Name: ${input.clientInfo.name}
- Case Type: ${input.clientInfo.industry}
- Jurisdiction: ${input.clientInfo.country}
- Estimated Exposure: $${input.clientInfo.annualSpend.toLocaleString()}

Analysis Type: ${input.assessmentType}
Case Profile ID: ${input.clientProfileId}

${input.existingIssues?.length ? `Existing Issues from Prior Analysis:\n${input.existingIssues.join('\n')}` : ''}

Provide a detailed case analysis in the following JSON format:
{
  "clientId": "string",
  "securityScore": number (1-5),
  "operationalScore": number (1-5),
  "complianceScore": number (1-5),
  "financialScore": number (1-5),
  "reputationalScore": number (1-5),
  "strategicScore": number (1-5),
  "overallScore": number (1-5),
  "reviewRating": "CRITICAL|HIGH|MEDIUM|LOW",
  "summary": "Executive summary of the assessment",
  "recommendations": ["array of specific recommendations"],
  "requiredDocuments": ["array of documents needed for full assessment"]
}`

      const result = await this.invokeWithJSON<CaseReviewOutput>(prompt)
      result.clientId = input.clientId

      // Convert 1-5 scale to percentage for storage
      const overallPercentage = Math.round((result.overallScore / 5) * 100)

      // Save case review to database
      const caseReview = await prisma.caseReview.create({
        data: {
          clientId: input.clientId,
          clientProfileId: input.clientProfileId,
          assessmentType: input.assessmentType,
          assessmentStatus: 'COMPLETE',
          assessedBy: 'CLARA',
          assessmentDate: new Date(),
          securityScore: result.securityScore,
          operationalScore: result.operationalScore,
          complianceScore: result.complianceScore,
          financialScore: result.financialScore,
          reputationalScore: result.reputationalScore,
          strategicScore: result.strategicScore,
          overallReviewScore: overallPercentage,
          reviewRating: result.reviewRating,
          summary: result.summary,
          recommendations: result.recommendations.join('\n\n'),
        },
      })

      // Log activity
      await this.logActivity({
        activityType: 'CASE_REVIEW',
        entityType: 'Client',
        entityId: input.clientId,
        actionTaken: `Completed ${input.assessmentType} case review`,
        inputSummary: `Client: ${input.clientInfo.name}, Type: ${input.assessmentType}`,
        outputSummary: `Rating: ${result.reviewRating}, Overall Score: ${result.overallScore}/5`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'CASE_REVIEW',
        entityType: 'Client',
        entityId: input.clientId,
        actionTaken: 'Failed to complete case review',
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<CaseReviewOutput>(false, undefined, errorMessage, startTime)
    }
  }
}

export const clara = new CLARAAgent()
