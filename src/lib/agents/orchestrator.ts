/**
 * Agent Orchestrator
 *
 * Coordinates the workflow between all Document AI agents:
 * LEXA -> CLARA -> DORA -> ARIA -> RITA -> ATLAS
 *
 * Handles the end-to-end legal document review lifecycle
 */

import { lexa, LEXAAgent } from './vera'
import { clara, CLARAAgent } from './cara'
import { dora, DORAAgent } from './dora'
import { aria, ARIAAgent } from './sara'
import { rita, RITAAgent } from './rita'
import { atlas, ATLASAgent } from './mars'
import prisma from '@/lib/db'
import type { AgentResult, ClientProfileInput, ClientProfileOutput } from './types'

export interface WorkflowResult {
  clientId: string
  stages: {
    stage: string
    agent: string
    success: boolean
    summary: string
    timestamp: Date
  }[]
  overallSuccess: boolean
  nextActions: string[]
}

export class AgentOrchestrator {
  private lexa: LEXAAgent
  private clara: CLARAAgent
  private dora: DORAAgent
  private aria: ARIAAgent
  private rita: RITAAgent
  private atlas: ATLASAgent

  constructor() {
    this.lexa = lexa
    this.clara = clara
    this.dora = dora
    this.aria = aria
    this.rita = rita
    this.atlas = atlas
  }

  /**
   * Execute full onboarding workflow for a new client
   */
  async onboardClient(input: ClientProfileInput): Promise<WorkflowResult> {
    const stages: WorkflowResult['stages'] = []
    const nextActions: string[] = []

    // Stage 1: LEXA - Profile Assessment
    const veraResult = await this.lexa.execute(input)
    stages.push({
      stage: 'Profile Assessment',
      agent: 'LEXA',
      success: veraResult.success,
      summary: veraResult.success
        ? `Priority Tier: ${veraResult.data?.priorityTier}, Score: ${veraResult.data?.overallReviewScore}`
        : veraResult.error || 'Failed',
      timestamp: new Date(),
    })

    if (!veraResult.success || !veraResult.data) {
      return {
        clientId: input.clientId,
        stages,
        overallSuccess: false,
        nextActions: ['Review and retry party profiling'],
      }
    }

    // Stage 2: CLARA - Detailed Review (for Critical/High priority)
    if (['CRITICAL', 'HIGH'].includes(veraResult.data.priorityTier)) {
      const client = await prisma.client.findUnique({
        where: { id: input.clientId },
      })

      if (client) {
        const clientProfile = await prisma.clientProfile.findFirst({
          where: { clientId: input.clientId },
          orderBy: { createdAt: 'desc' },
        })

        const caraResult = await this.clara.execute({
          clientId: input.clientId,
          clientProfileId: clientProfile?.id || '',
          assessmentType: 'INITIAL',
          clientInfo: {
            name: client.name,
            industry: client.industry || 'Unknown',
            country: client.country || 'Unknown',
            annualSpend: Number(client.annualSpend) || 0,
          },
        })

        stages.push({
          stage: 'Detailed Review',
          agent: 'CLARA',
          success: caraResult.success,
          summary: caraResult.success
            ? `Overall Score: ${caraResult.data?.overallScore}/5, Rating: ${caraResult.data?.reviewRating}`
            : caraResult.error || 'Failed',
          timestamp: new Date(),
        })

        if (caraResult.success && caraResult.data) {
          nextActions.push(...(caraResult.data.requiredDocuments.map(
            (doc) => `Collect document: ${doc}`
          )))
        }
      }
    }

    // Stage 3: DORA - Document Request
    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
    })

    if (client?.primaryContactEmail) {
      const requiredDocs = this.getRequiredDocuments(veraResult.data.priorityTier)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 14)

      const doraResult = await this.dora.createDocumentRequest({
        clientId: input.clientId,
        clientName: client.name,
        clientEmail: client.primaryContactEmail,
        requiredDocuments: requiredDocs,
        dueDate,
      })

      stages.push({
        stage: 'Document Request',
        agent: 'DORA',
        success: doraResult.success,
        summary: doraResult.success
          ? `Requested ${requiredDocs.length} documents`
          : doraResult.error || 'Failed',
        timestamp: new Date(),
      })

      if (doraResult.success) {
        nextActions.push('Monitor document collection status')
        nextActions.push('Follow up with party if documents not received')
      }
    }

    // Generate initial report
    const ritaResult = await this.rita.execute({
      clientId: input.clientId,
      reportType: 'DETAILED_ASSESSMENT',
      includeIssues: true,
      includeTrends: false,
    })

    stages.push({
      stage: 'Initial Report',
      agent: 'RITA',
      success: ritaResult.success,
      summary: ritaResult.success
        ? `Generated ${ritaResult.data?.reportType} report`
        : ritaResult.error || 'Failed',
      timestamp: new Date(),
    })

    // Determine overall success
    const overallSuccess = stages.filter((s) => s.success).length >= stages.length * 0.75

    if (overallSuccess) {
      nextActions.push(`Schedule ${veraResult.data.assessmentFrequency} review`)
    }

    return {
      clientId: input.clientId,
      stages,
      overallSuccess,
      nextActions,
    }
  }

  /**
   * Process uploaded document through analysis pipeline
   */
  async processDocument(
    clientId: string,
    documentId: string,
    documentType: string,
    documentContent: string
  ): Promise<WorkflowResult> {
    const stages: WorkflowResult['stages'] = []
    const nextActions: string[] = []

    // Get client context
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        clientProfiles: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (!client) {
      return {
        clientId,
        stages: [{
          stage: 'Initialization',
          agent: 'SYSTEM',
          success: false,
          summary: 'Client not found',
          timestamp: new Date(),
        }],
        overallSuccess: false,
        nextActions: ['Verify client ID and retry'],
      }
    }

    // Stage 1: ARIA - Document Analysis
    const saraResult = await this.aria.execute({
      clientId,
      documentId,
      documentType,
      documentContent,
      clientContext: {
        name: client.name,
        priorityTier: client.clientProfiles[0]?.priorityTier || 'MEDIUM',
        dataAccess: JSON.parse(client.clientProfiles[0]?.dataTypesAccessed || '[]') as string[],
      },
    })

    stages.push({
      stage: 'Document Analysis',
      agent: 'ARIA',
      success: saraResult.success,
      summary: saraResult.success
        ? `Found ${saraResult.data?.findings.length} findings`
        : saraResult.error || 'Failed',
      timestamp: new Date(),
    })

    if (!saraResult.success || !saraResult.data) {
      return {
        clientId,
        stages,
        overallSuccess: false,
        nextActions: ['Review document format and retry analysis'],
      }
    }

    // Stage 2: ATLAS - Create action items for critical/high issues
    const criticalHighFindings = saraResult.data.findings.filter(
      (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
    )

    if (criticalHighFindings.length > 0) {
      // Get the created issues from database
      const dbIssues = await prisma.issue.findMany({
        where: {
          clientId,
          documentId,
          severity: { in: ['CRITICAL', 'HIGH'] },
        },
      })

      for (const issue of dbIssues) {
        const marsResult = await this.atlas.execute({
          issueId: issue.id,
          clientId,
          issue: {
            title: issue.title,
            severity: issue.severity,
            description: issue.description || '',
          },
          clientContact: {
            name: client.primaryContactName || 'Client Contact',
            email: client.primaryContactEmail || '',
          },
        })

        stages.push({
          stage: `Action Plan: ${issue.title.substring(0, 30)}...`,
          agent: 'ATLAS',
          success: marsResult.success,
          summary: marsResult.success
            ? `Created ${marsResult.data?.actions.length} actions`
            : marsResult.error || 'Failed',
          timestamp: new Date(),
        })
      }

      nextActions.push(`Follow up on ${criticalHighFindings.length} critical/high issues`)
    }

    // Stage 3: RITA - Generate updated report
    const ritaResult = await this.rita.execute({
      clientId,
      reportType: 'DETAILED_ASSESSMENT',
      includeIssues: true,
      includeTrends: false,
    })

    stages.push({
      stage: 'Report Update',
      agent: 'RITA',
      success: ritaResult.success,
      summary: ritaResult.success
        ? 'Assessment report updated'
        : ritaResult.error || 'Failed',
      timestamp: new Date(),
    })

    const overallSuccess = stages.filter((s) => s.success).length >= stages.length * 0.8

    if (saraResult.data.complianceGaps.length > 0) {
      nextActions.push(`Address ${saraResult.data.complianceGaps.length} compliance gaps`)
    }

    return {
      clientId,
      stages,
      overallSuccess,
      nextActions,
    }
  }

  /**
   * Run periodic maintenance tasks
   */
  async runMaintenanceCycle(): Promise<{
    overdueEscalations: number
    expiringDocuments: number
    upcomingAssessments: number
  }> {
    // Check overdue action items
    const overdueResult = await this.atlas.checkOverdueActions()
    const overdueEscalations = overdueResult.data?.length || 0

    // Check document inventory across all active clients
    const clients = await prisma.client.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    })

    let expiringDocuments = 0
    for (const client of clients) {
      const inventoryResult = await this.dora.checkDocumentInventory(client.id)
      if (inventoryResult.success && inventoryResult.data) {
        expiringDocuments += inventoryResult.data.expiringDocuments.length
      }
    }

    // Check upcoming assessments
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const upcomingAssessments = await prisma.clientProfile.count({
      where: {
        nextAssessmentDate: { lte: nextMonth },
      },
    })

    return {
      overdueEscalations,
      expiringDocuments,
      upcomingAssessments,
    }
  }

  private getRequiredDocuments(priorityTier: string): string[] {
    switch (priorityTier) {
      case 'CRITICAL':
        return [
          'SOC 2 Type II',
          'Penetration Test',
          'ISO 27001',
          'Business Continuity Plan',
          'Cyber Insurance Certificate',
          'SIG Questionnaire',
        ]
      case 'HIGH':
        return ['SOC 2 Type II', 'Vulnerability Assessment', 'SIG Questionnaire', 'Insurance Certificate']
      case 'MEDIUM':
        return ['Security Questionnaire', 'Privacy Policy', 'Insurance Certificate']
      default:
        return ['Security Questionnaire', 'Privacy Policy']
    }
  }
}

// Export singleton instance
export const orchestrator = new AgentOrchestrator()
