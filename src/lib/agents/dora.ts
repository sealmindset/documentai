/**
 * DORA - Documentation & Outreach Retrieval Agent
 *
 * Purpose: Obtains case documents from courts, prosecutors, opposing counsel, and records custodians
 *
 * Responsibilities:
 * - Generate professional document request letters to courts and counsel
 * - Track document collection status and follow-ups
 * - Request records from law enforcement, medical providers, and government agencies
 * - Collect police reports, witness statements, expert reports, and discovery materials
 * - Manage document inventory and deadline tracking
 */

import { BaseAgent } from './base-agent'
import prisma from '@/lib/db'
import type { AgentConfig, AgentResult, DocumentRequestInput } from './types'

const DORA_CONFIG: AgentConfig = {
  name: 'DORA',
  description: 'Documentation & Outreach Retrieval Agent',
  tier: 'simple',
  temperature: 0.2,
  maxTokens: 2000,
}

interface DocumentRequestOutput {
  clientId: string
  requestedDocuments: {
    type: string
    priority: string
    dueDate: string
    status: string
  }[]
  emailSubject: string
  emailBody: string
  followUpSchedule: string[]
}

interface DocumentInventory {
  clientId: string
  documents: {
    type: string
    status: string
    expirationDate?: string
    completenessScore: number
  }[]
  overallCompletenessScore: number
  missingDocuments: string[]
  expiringDocuments: string[]
}

export class DORAAgent extends BaseAgent {
  constructor() {
    super(DORA_CONFIG)
  }

  protected getDefaultSystemPrompt(): string {
    return `You are DORA (Documentation & Outreach Retrieval Agent), an AI specialist in managing legal document collection for Vanmeveren Law Firm (VLF), a criminal defense and civil litigation firm.

Your role is to:
1. Generate professional document request letters to courts, prosecutors, opposing counsel, and records custodians
2. Track document collection progress and discovery compliance
3. Identify missing or outstanding case documents
4. Prioritize document requests based on case priority tier

Required Documents by Case Priority:
CRITICAL:
- Police/arrest reports and incident narratives
- Lab analysis and forensic reports
- Search warrants and affidavits
- Witness statements and depositions
- Brady/exculpatory material
- Expert reports and evaluations

HIGH:
- Police reports and supplemental reports
- Witness statements and interviews
- Discovery materials and evidence logs
- Financial records and asset documentation

MEDIUM:
- Court filings and docket entries
- Correspondence and communications
- Basic discovery responses
- Standard interrogatories and requests for production

LOW:
- Standard court filings and administrative records
- Routine correspondence
- Administrative agency records

Document Status:
- PENDING: Requested but not received
- RECEIVED: Document received, pending analysis
- ANALYZED: Document has been reviewed
- EXPIRED: Document past deadline or stale
- REJECTED: Document not accepted (incomplete, wrong format, etc.)

Always be professional and clear in communications. Reference applicable rules of procedure and discovery obligations.`
  }

  async createDocumentRequest(
    input: DocumentRequestInput
  ): Promise<AgentResult<DocumentRequestOutput>> {
    const startTime = Date.now()

    try {
      const prompt = `Create a document request for the following case:

Case ID: ${input.clientId}
Case/Client Name: ${input.clientName}
Recipient Email: ${input.clientEmail}
Required Documents: ${input.requiredDocuments.join(', ')}
Due Date: ${input.dueDate.toISOString().split('T')[0]}

Generate:
1. A professional email requesting these documents
2. Priority level for each document
3. Follow-up schedule

Provide the response in the following JSON format:
{
  "clientId": "string",
  "requestedDocuments": [
    {
      "type": "document type",
      "priority": "HIGH|MEDIUM|LOW",
      "dueDate": "YYYY-MM-DD",
      "status": "PENDING"
    }
  ],
  "emailSubject": "Subject line for the email",
  "emailBody": "Professional email body requesting documents",
  "followUpSchedule": ["dates for follow-up reminders"]
}`

      const result = await this.invokeWithJSON<DocumentRequestOutput>(prompt)
      result.clientId = input.clientId

      // Create document records in database
      for (const doc of result.requestedDocuments) {
        await prisma.document.create({
          data: {
            clientId: input.clientId,
            documentType: this.mapDocumentType(doc.type),
            documentName: `${doc.type} - Requested`,
            status: 'PENDING',
            retrievedBy: 'DORA',
            source: 'Client Request',
          },
        })
      }

      // Create notification for tracking
      await prisma.notification.create({
        data: {
          recipientType: 'CLIENT',
          recipientId: input.clientId,
          notificationType: 'DOCUMENT_REQUEST',
          title: result.emailSubject,
          message: result.emailBody,
          sentBy: 'DORA',
          status: 'PENDING',
        },
      })

      await this.logActivity({
        activityType: 'DOCUMENT_REQUEST',
        entityType: 'Client',
        entityId: input.clientId,
        actionTaken: `Created document request for ${input.requiredDocuments.length} documents`,
        inputSummary: `Client: ${input.clientName}`,
        outputSummary: `Requested: ${input.requiredDocuments.join(', ')}`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'DOCUMENT_REQUEST',
        entityType: 'Client',
        entityId: input.clientId,
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<DocumentRequestOutput>(false, undefined, errorMessage, startTime)
    }
  }

  async checkDocumentInventory(clientId: string): Promise<AgentResult<DocumentInventory>> {
    const startTime = Date.now()

    try {
      // Get all documents for client
      const documents = await prisma.document.findMany({
        where: { clientId },
        orderBy: { uploadDate: 'desc' },
      })

      // Get client profile for required documents
      const clientProfile = await prisma.clientProfile.findFirst({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      })

      const requiredDocs = this.getRequiredDocuments(clientProfile?.priorityTier || 'MEDIUM')

      const documentStatus = documents.map((doc) => ({
        type: doc.documentType,
        status: doc.status,
        expirationDate: doc.expirationDate?.toISOString(),
        completenessScore: doc.status === 'ANALYZED' ? 100 : doc.status === 'RECEIVED' ? 50 : 0,
      }))

      const receivedTypes = documents.map((d) => d.documentType)
      const missingDocuments = requiredDocs.filter((req) => !receivedTypes.includes(req))

      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      const expiringDocuments = documents
        .filter((d) => d.expirationDate && d.expirationDate <= thirtyDaysFromNow)
        .map((d) => d.documentType)

      const overallScore = requiredDocs.length > 0
        ? Math.round((receivedTypes.length / requiredDocs.length) * 100)
        : 100

      const result: DocumentInventory = {
        clientId,
        documents: documentStatus,
        overallCompletenessScore: overallScore,
        missingDocuments,
        expiringDocuments,
      }

      await this.logActivity({
        activityType: 'INVENTORY_CHECK',
        entityType: 'Client',
        entityId: clientId,
        actionTaken: 'Checked document inventory',
        outputSummary: `Completeness: ${overallScore}%, Missing: ${missingDocuments.length}`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return this.createResult<DocumentInventory>(false, undefined, errorMessage, startTime)
    }
  }

  private getRequiredDocuments(priorityTier: string): string[] {
    switch (priorityTier) {
      case 'CRITICAL':
        return [
          'POLICE_REPORT',
          'LAB_ANALYSIS',
          'SEARCH_WARRANT',
          'WITNESS_STATEMENT',
          'BRADY_MATERIAL',
          'EXPERT_REPORT',
        ]
      case 'HIGH':
        return ['POLICE_REPORT', 'WITNESS_STATEMENT', 'DISCOVERY_MATERIALS', 'FINANCIAL_RECORDS']
      case 'MEDIUM':
        return ['COURT_FILING', 'CORRESPONDENCE', 'DISCOVERY_MATERIALS']
      default:
        return ['COURT_FILING', 'ADMINISTRATIVE_RECORDS']
    }
  }

  private mapDocumentType(type: string): string {
    const typeMap: Record<string, string> = {
      'Police Report': 'POLICE_REPORT',
      'Arrest Record': 'ARREST_RECORD',
      'Court Filing': 'COURT_FILING',
      'Witness Statement': 'WITNESS_STATEMENT',
      'Medical Records': 'MEDICAL_RECORDS',
      'Financial Records': 'FINANCIAL_RECORDS',
      'Lab Analysis': 'LAB_ANALYSIS',
      'Search Warrant': 'SEARCH_WARRANT',
      'Brady Material': 'BRADY_MATERIAL',
      'Expert Report': 'EXPERT_REPORT',
      'Discovery Materials': 'DISCOVERY_MATERIALS',
      'Deposition': 'DEPOSITION',
    }
    return typeMap[type] || 'OTHER'
  }

  async execute(input: DocumentRequestInput): Promise<AgentResult<DocumentRequestOutput>> {
    return this.createDocumentRequest(input)
  }
}

export const dora = new DORAAgent()
