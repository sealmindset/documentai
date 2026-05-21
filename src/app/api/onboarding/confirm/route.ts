import { NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { AgentOrchestrator } from '@/lib/agents/orchestrator'
import type { ClientProfileInput } from '@/lib/agents/types'

export const dynamic = 'force-dynamic'

interface ConfirmDocument {
  fileName: string
  fileSize: number
  mimeType: string
  documentType: string
  extractedText: string
  analysisResult: Record<string, unknown>
}

interface ConfirmBody {
  action: 'create_new' | 'use_existing' | 'reassess'
  existingClientId?: string
  clientData?: {
    name: string
    legalName?: string
    dunsNumber?: string
    website?: string
    industry?: string
    country?: string
    stateProvince?: string
    primaryContactName?: string
    primaryContactEmail?: string
    primaryContactPhone?: string
    businessOwner?: string
    itOwner?: string
    annualSpend?: number
  }
  documents: ConfirmDocument[]
  // Orchestrator fields
  dataTypesAccessed?: string[]
  systemIntegrations?: string[]
  hasPiiAccess?: boolean
  hasPhiAccess?: boolean
  hasPciAccess?: boolean
  businessCriticality?: string
}

export async function POST(request: Request) {
  // Require both client creation and agent execution permissions
  const denied = await requirePermission('clients', 'create')
  if (denied) return denied
  const agentDenied = await requirePermission('agents', 'create')
  if (agentDenied) return agentDenied

  const user = await getCurrentUser()
  if (user) {
    const limited = aiRateLimit(user.id)
    if (limited) return limited
  }

  try {
    const body: ConfirmBody = await request.json()
    const { action, existingClientId, clientData, documents } = body

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: 'At least one document is required' }, { status: 400 })
    }

    let clientId: string

    if (action === 'create_new') {
      if (!clientData?.name) {
        return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
      }

      const client = await prisma.client.create({
        data: {
          name: clientData.name,
          legalName: clientData.legalName || null,
          dunsNumber: clientData.dunsNumber || null,
          website: clientData.website || null,
          industry: clientData.industry || null,
          country: clientData.country || null,
          stateProvince: clientData.stateProvince || null,
          primaryContactName: clientData.primaryContactName || null,
          primaryContactEmail: clientData.primaryContactEmail || null,
          primaryContactPhone: clientData.primaryContactPhone || null,
          businessOwner: clientData.businessOwner || null,
          itOwner: clientData.itOwner || null,
          annualSpend: clientData.annualSpend || null,
          status: 'PENDING',
        },
      })
      clientId = client.id

      // Audit trail
      await prisma.auditTrail.create({
        data: {
          userId: user?.id || 'system',
          action: 'CREATE',
          entityType: 'Client',
          entityId: client.id,
          newValues: JSON.stringify(clientData),
        },
      })
    } else if ((action === 'use_existing' || action === 'reassess') && existingClientId) {
      const existing = await prisma.client.findUnique({ where: { id: existingClientId } })
      if (!existing) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      clientId = existingClientId
    } else {
      return NextResponse.json(
        { error: 'Invalid action or missing clientId' },
        { status: 400 }
      )
    }

    // Store documents
    const createdDocs = []
    for (const doc of documents) {
      // Mark previous versions as not current
      await prisma.document.updateMany({
        where: { clientId, documentType: doc.documentType, isCurrent: true },
        data: { isCurrent: false },
      })

      const dbDoc = await prisma.document.create({
        data: {
          clientId,
          documentName: doc.fileName,
          documentType: doc.documentType || 'OTHER',
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          status: 'ANALYZED',
          analysisResult: JSON.stringify(doc.analysisResult),
          source: 'Document Onboarding',
          retrievedBy: 'AURA',
          isCurrent: true,
        },
      })
      createdDocs.push(dbDoc)

      // Create issues from analysis
      const analysis = doc.analysisResult
      const riskFactors = (analysis?.riskFactors as string[]) || []
      for (const risk of riskFactors) {
        await prisma.issue.create({
          data: {
            clientId,
            documentId: dbDoc.id,
            title: risk,
            severity: analysis?.recommendedRating === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
            identifiedBy: 'ARIA',
            status: 'OPEN',
          },
        })
      }
    }

    // Trigger orchestrator pipeline
    const orchestrator = new AgentOrchestrator()
    let workflowResult = null

    if (action === 'create_new') {
      // Full onboarding: LEXA → CLARA → DORA → RITA
      const client = await prisma.client.findUnique({ where: { id: clientId } })
      const orchestratorInput: ClientProfileInput = {
        clientId: clientId,
        clientName: client?.name || clientData?.name || '',
        industry: clientData?.industry,
        dataTypesAccessed: body.dataTypesAccessed || [],
        systemIntegrations: body.systemIntegrations || [],
        hasPiiAccess: body.hasPiiAccess || false,
        hasPhiAccess: body.hasPhiAccess || false,
        hasPciAccess: body.hasPciAccess || false,
        businessCriticality: body.businessCriticality || 'STANDARD',
        additionalContext: documents.map(d =>
          `Document: ${d.fileName} (${d.documentType})\nSummary: ${(d.analysisResult?.summary as string) || 'N/A'}`
        ).join('\n\n'),
      }

      try {
        workflowResult = await orchestrator.onboardClient(orchestratorInput)
      } catch (err) {
        console.error('Orchestrator onboarding error:', err)
        workflowResult = { clientId, stages: [], overallSuccess: false, nextActions: ['Retry assessment manually'] }
      }
    } else if (action === 'reassess') {
      // Process each document through ARIA → ATLAS → RITA
      for (const dbDoc of createdDocs) {
        const matchingUpload = documents.find(d => d.fileName === dbDoc.documentName)
        try {
          const result = await orchestrator.processDocument(
            clientId,
            dbDoc.id,
            dbDoc.documentType,
            matchingUpload?.extractedText?.slice(0, 100000) || ''
          )
          workflowResult = result // Use last result
        } catch (err) {
          console.error('Orchestrator reassessment error:', err)
        }
      }
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        clientProfiles: { orderBy: { createdAt: 'desc' }, take: 1 },
        documents: { where: { isCurrent: true } },
      },
    })

    return NextResponse.json({
      client,
      documents: createdDocs,
      workflow: workflowResult,
    })
  } catch (error) {
    const safe = sanitizeAIError(error)
    return NextResponse.json({ error: safe.message }, { status: safe.status })
  }
}
