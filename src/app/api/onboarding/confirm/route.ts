import { NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { AgentOrchestrator } from '@/lib/agents/orchestrator'
import type { VendorProfileInput } from '@/lib/agents/types'

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
  existingVendorId?: string
  vendorData?: {
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
  // Require both vendor creation and agent execution permissions
  const denied = await requirePermission('vendors', 'create')
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
    const { action, existingVendorId, vendorData, documents } = body

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: 'At least one document is required' }, { status: 400 })
    }

    let vendorId: string

    if (action === 'create_new') {
      if (!vendorData?.name) {
        return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 })
      }

      const vendor = await prisma.vendor.create({
        data: {
          name: vendorData.name,
          legalName: vendorData.legalName || null,
          dunsNumber: vendorData.dunsNumber || null,
          website: vendorData.website || null,
          industry: vendorData.industry || null,
          country: vendorData.country || null,
          stateProvince: vendorData.stateProvince || null,
          primaryContactName: vendorData.primaryContactName || null,
          primaryContactEmail: vendorData.primaryContactEmail || null,
          primaryContactPhone: vendorData.primaryContactPhone || null,
          businessOwner: vendorData.businessOwner || null,
          itOwner: vendorData.itOwner || null,
          annualSpend: vendorData.annualSpend || null,
          status: 'PENDING',
        },
      })
      vendorId = vendor.id

      // Audit trail
      await prisma.auditTrail.create({
        data: {
          userId: user?.id || 'system',
          action: 'CREATE',
          entityType: 'Vendor',
          entityId: vendor.id,
          newValues: JSON.stringify(vendorData),
        },
      })
    } else if ((action === 'use_existing' || action === 'reassess') && existingVendorId) {
      const existing = await prisma.vendor.findUnique({ where: { id: existingVendorId } })
      if (!existing) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
      }
      vendorId = existingVendorId
    } else {
      return NextResponse.json(
        { error: 'Invalid action or missing vendorId' },
        { status: 400 }
      )
    }

    // Store documents
    const createdDocs = []
    for (const doc of documents) {
      // Mark previous versions as not current
      await prisma.document.updateMany({
        where: { vendorId, documentType: doc.documentType, isCurrent: true },
        data: { isCurrent: false },
      })

      const dbDoc = await prisma.document.create({
        data: {
          vendorId,
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

      // Create risk findings from analysis
      const analysis = doc.analysisResult
      const riskFactors = (analysis?.riskFactors as string[]) || []
      for (const risk of riskFactors) {
        await prisma.riskFinding.create({
          data: {
            vendorId,
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
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
      const orchestratorInput: VendorProfileInput = {
        vendorId,
        vendorName: vendor?.name || vendorData?.name || '',
        industry: vendorData?.industry,
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
        workflowResult = await orchestrator.onboardVendor(orchestratorInput)
      } catch (err) {
        console.error('Orchestrator onboarding error:', err)
        workflowResult = { vendorId, stages: [], overallSuccess: false, nextActions: ['Retry assessment manually'] }
      }
    } else if (action === 'reassess') {
      // Process each document through ARIA → ATLAS → RITA
      for (const dbDoc of createdDocs) {
        const matchingUpload = documents.find(d => d.fileName === dbDoc.documentName)
        try {
          const result = await orchestrator.processDocument(
            vendorId,
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

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        riskProfiles: { orderBy: { createdAt: 'desc' }, take: 1 },
        documents: { where: { isCurrent: true } },
      },
    })

    return NextResponse.json({
      vendor,
      documents: createdDocs,
      workflow: workflowResult,
    })
  } catch (error) {
    const safe = sanitizeAIError(error)
    return NextResponse.json({ error: safe.message }, { status: safe.status })
  }
}
