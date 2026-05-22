import { NextResponse, NextRequest } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { extractContent } from '@/lib/documents/extract-text'
import { aura } from '@/lib/agents/aura'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('documents', 'create')
  if (denied) return denied

  const { id: clientId } = await params

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10)
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Maximum ${Math.round(maxSize / 1024 / 1024)}MB.` },
      { status: 400 }
    )
  }

  const document = await prisma.document.create({
    data: {
      clientId,
      documentName: file.name,
      documentType: 'OTHER',
      mimeType: file.type,
      fileSize: file.size,
      status: 'ANALYZING',
      source: 'Attorney Upload',
      isCurrent: true,
    },
  })

  processDocument(document.id, clientId, file).catch((err) => {
    console.error('Background document processing failed:', err)
  })

  return NextResponse.json({
    document: { ...document, status: 'ANALYZING' },
    message: 'Document uploaded. AI agents are analyzing it now.',
    agents: ['AURA', 'DORA', 'ARIA'],
  }, { status: 201 })
}

async function processDocument(documentId: string, clientId: string, file: File) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const extracted = await extractContent(buffer, file.name, file.type)

    const result = await aura.execute({
      text: extracted.text,
      fileName: file.name,
      isImage: extracted.isImage,
      imageBase64: extracted.imageBase64,
      imageMime: extracted.imageMime,
    })

    if (result.success && result.data) {
      const analysis = result.data

      const docType = analysis.documentAnalysis?.documentType || analysis.clientInfo?.documentType || 'OTHER'
      const docTypeMap: Record<string, string> = {
        POLICE_REPORT: 'POLICE_REPORT',
        ARREST_RECORD: 'ARREST_RECORD',
        COURT_FILING: 'COURT_FILING',
        WITNESS_STATEMENT: 'WITNESS_STATEMENT',
        MEDICAL_RECORDS: 'MEDICAL_RECORDS',
        FINANCIAL_DISCLOSURE: 'FINANCIAL_DISCLOSURE',
        CUSTODY_EVALUATION: 'CUSTODY_EVALUATION',
        DEPOSITION: 'DEPOSITION',
        MOTION: 'MOTION',
        DISCOVERY_MATERIALS: 'DISCOVERY_MATERIALS',
        EXPERT_REPORT: 'EXPERT_REPORT',
        CONTRACT: 'CONTRACT',
      }

      await prisma.document.update({
        where: { id: documentId },
        data: {
          documentType: docTypeMap[docType] || 'OTHER',
          status: 'ANALYZED',
          analysisResult: JSON.stringify(analysis),
          retrievedBy: 'AURA',
        },
      })

      if (analysis.documentAnalysis?.riskFactors?.length) {
        for (const risk of analysis.documentAnalysis.riskFactors) {
          await prisma.issue.create({
            data: {
              clientId,
              documentId,
              title: risk,
              severity: analysis.documentAnalysis.recommendedRating === 'CRITICAL' ? 'CRITICAL' :
                       analysis.documentAnalysis.recommendedRating === 'HIGH' ? 'HIGH' : 'MEDIUM',
              findingCategory: analysis.documentAnalysis.documentType || null,
              identifiedBy: 'ARIA',
              status: 'OPEN',
            },
          })
        }
      }

      await prisma.notification.create({
        data: {
          notificationType: 'DOCUMENT_ANALYZED',
          title: `Document analyzed: ${file.name}`,
          message: analysis.documentAnalysis?.summary ||
            `${file.name} has been analyzed by AURA. ${analysis.documentAnalysis?.riskFactors?.length || 0} issues identified by ARIA.`,
          relatedEntityType: 'Document',
          relatedEntityId: documentId,
          sentBy: 'AURA',
          sentAt: new Date(),
          status: 'SENT',
        },
      })
    } else {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'RECEIVED',
          analysisResult: JSON.stringify({ error: result.error || 'Analysis unavailable' }),
        },
      })
    }
  } catch (error) {
    console.error('Document processing error:', error)
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'RECEIVED' },
    })
  }
}
