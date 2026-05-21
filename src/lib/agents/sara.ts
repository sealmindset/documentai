/**
 * ARIA - Automated Review, Identification & Analysis Agent
 *
 * Purpose: Analyzes legal documents to identify key issues for Vanmerven Law Firm
 *
 * Responsibilities:
 * - Parse and analyze police reports, court filings, motions, and discovery materials
 * - Extract procedural violations, evidence issues, and constitutional concerns
 * - Map findings to VLF legal issue framework categories
 * - Identify case-dispositive issues and defense arguments
 * - Correlate findings across multiple case documents
 */

import { BaseAgent } from './base-agent'
import prisma from '@/lib/db'
import type {
  AgentConfig,
  AgentResult,
  SecurityAnalysisInput,
  SecurityAnalysisOutput,
  SecurityFinding,
} from './types'

const ARIA_CONFIG: AgentConfig = {
  name: 'ARIA',
  description: 'Automated Review, Identification & Analysis Agent',
  tier: 'complex',
  temperature: 0.2,
  maxTokens: 4000,
}

export class ARIAAgent extends BaseAgent {
  constructor() {
    super(ARIA_CONFIG)
  }

  protected getDefaultSystemPrompt(): string {
    return `You are ARIA (Automated Review, Identification & Analysis Agent), an AI specialist in analyzing legal documents for Vanmerven Law Firm (VLF), a criminal defense and civil litigation firm.

Your role is to:
1. Analyze legal documents (police reports, court filings, motions, discovery materials, witness statements, expert reports)
2. Identify procedural violations, evidence issues, and constitutional concerns
3. Map findings to VLF's legal issue framework categories
4. Assess the impact of findings on case strategy and defense posture

VLF Legal Issue Framework Categories:
- PROCEDURAL_VIOLATION: Miranda rights violations, illegal search/seizure, chain of custody breaks, speedy trial violations
- EVIDENCE_ISSUE: Authentication problems, hearsay concerns, relevance objections, privilege assertions, evidence spoliation
- CONSTITUTIONAL_RIGHTS: 4th Amendment (search/seizure), 5th Amendment (self-incrimination), 6th Amendment (right to counsel, confrontation)
- WITNESS_CREDIBILITY: Impeachment material, bias indicators, prior inconsistent statements, cooperation agreements
- DISCOVERY_DEFICIENCY: Incomplete production, privilege log gaps, Brady/Giglio violations, late disclosures
- JURISDICTION: Venue challenges, standing issues, subject matter jurisdiction questions
- STATUTE_OF_LIMITATIONS: Filing deadline concerns, tolling issues, relation-back doctrine
- DOCUMENTATION_GAP: Missing records, incomplete filings, chain of custody breaks

Issue Severity Definitions:
- CRITICAL: Case-dispositive issue that could result in dismissal or suppression of key evidence
- HIGH: Strong defense argument that significantly weakens the opposing case, address within 30 days
- MEDIUM: Moderate strategic value for negotiation or trial, address within 90 days
- LOW: Minor procedural point or best practice observation, address within 180 days
- INFORMATIONAL: Noted for the record, no immediate action required

When analyzing documents:
1. Look for procedural errors, rights violations, and chain of custody issues
2. Identify suppression opportunities and grounds for motions to dismiss
3. Note inconsistencies between witness statements and official reports
4. Flag any Brady/exculpatory material or discovery violations
5. Assess the strength and admissibility of evidence presented

Provide specific, actionable findings with clear strategic recommendations.`
  }

  async execute(input: SecurityAnalysisInput): Promise<AgentResult<SecurityAnalysisOutput>> {
    const startTime = Date.now()

    try {
      const prompt = `Analyze the following document for legal review findings:

Case Context:
- Case ID: ${input.clientId}
- Case/Client Name: ${input.clientContext.name}
- Current Priority Tier: ${input.clientContext.priorityTier}
- Charges/Claims: ${input.clientContext.dataAccess.join(', ')}

Document Information:
- Document ID: ${input.documentId}
- Document Type: ${input.documentType}

Document Content:
${input.documentContent}

---

Analyze this document and provide findings in the following JSON format:
{
  "clientId": "string",
  "documentId": "string",
  "findings": [
    {
      "title": "Brief title of the finding",
      "description": "Detailed description of the issue",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFORMATIONAL",
      "category": "Security category",
      "affectedControls": ["list of affected control areas"],
      "vlfRiskMapping": "VLF legal issue framework category",
      "sourceReference": "Specific section/page reference in document",
      "recommendedAction": "Specific strategic recommendation"
    }
  ],
  "overallReviewAssessment": "Summary assessment of case posture based on this document",
  "complianceGaps": ["List of legal issues and vulnerabilities identified"],
  "strengthAreas": ["List of strong defense arguments and favorable evidence noted"]
}`

      const result = await this.invokeWithJSON<SecurityAnalysisOutput>(prompt)
      result.clientId = input.clientId
      result.documentId = input.documentId

      // Save issues to database
      for (const finding of result.findings) {
        await prisma.issue.create({
          data: {
            clientId: input.clientId,
            documentId: input.documentId,
            findingType: input.documentType,
            findingCategory: finding.category,
            severity: finding.severity as any,
            title: finding.title,
            description: finding.description,
            snbrRiskMapping: finding.vlfRiskMapping,
            affectedControls: JSON.stringify(finding.affectedControls),
            sourceReference: finding.sourceReference,
            identifiedBy: 'ARIA',
            identifiedDate: new Date(),
            status: 'OPEN',
            dueDate: this.calculateDueDate(finding.severity),
          },
        })
      }

      // Update document status
      await prisma.document.update({
        where: { id: input.documentId },
        data: {
          status: 'ANALYZED',
          analysisResult: result.overallReviewAssessment,
        },
      })

      await this.logActivity({
        activityType: 'DOCUMENT_ANALYSIS',
        entityType: 'Document',
        entityId: input.documentId,
        actionTaken: `Analyzed ${input.documentType} document`,
        inputSummary: `Client: ${input.clientContext.name}`,
        outputSummary: `Found ${result.findings.length} findings (${result.findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length} critical/high)`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'DOCUMENT_ANALYSIS',
        entityType: 'Document',
        entityId: input.documentId,
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<SecurityAnalysisOutput>(false, undefined, errorMessage, startTime)
    }
  }

  private calculateDueDate(severity: string): Date {
    const today = new Date()
    switch (severity) {
      case 'CRITICAL':
        return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
      case 'HIGH':
        return new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      case 'MEDIUM':
        return new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
      case 'LOW':
        return new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000) // 180 days
      default:
        return new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year
    }
  }

  async analyzeMultipleDocuments(
    clientId: string,
    documents: { id: string; type: string; content: string }[]
  ): Promise<AgentResult<{ clientId: string; totalFindings: number; summary: string }>> {
    const startTime = Date.now()

    try {
      // Get client context
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          clientProfiles: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      })

      if (!client) {
        throw new Error('Client not found')
      }

      const context = {
        name: client.name,
        priorityTier: client.clientProfiles[0]?.priorityTier || 'MEDIUM',
        dataAccess: JSON.parse(client.clientProfiles[0]?.dataTypesAccessed || '[]') as string[],
      }

      let totalFindings = 0

      // Analyze each document
      for (const doc of documents) {
        const result = await this.execute({
          clientId,
          documentId: doc.id,
          documentType: doc.type,
          documentContent: doc.content,
          clientContext: context,
        })

        if (result.success && result.data) {
          totalFindings += result.data.findings.length
        }
      }

      const summary = `Analyzed ${documents.length} documents for ${client.name}. Found ${totalFindings} total findings.`

      return this.createResult(
        true,
        { clientId, totalFindings, summary },
        undefined,
        startTime
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return this.createResult<{ clientId: string; totalFindings: number; summary: string }>(false, undefined, errorMessage, startTime)
    }
  }
}

export const aria = new ARIAAgent()
