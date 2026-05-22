import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { sanitizeStrings } from '@/lib/sanitize-input'
import { z } from 'zod'

const documentSchema = z.object({
  clientId: z.string().max(100),
  documentType: z.enum([
    'SOC2_TYPE1',
    'SOC2_TYPE2',
    'ISO27001',
    'PENTEST',
    'VULNERABILITY_SCAN',
    'SIG_QUESTIONNAIRE',
    'CAIQ',
    'CUSTOM_QUESTIONNAIRE',
    'INSURANCE_CERTIFICATE',
    'BUSINESS_CONTINUITY',
    'PRIVACY_POLICY',
    'OTHER',
  ]),
  documentName: z.string().max(500),
  documentDate: z.string().max(30).optional(),
  expirationDate: z.string().max(30).optional(),
})

export const GET = withRequestLog(async function GET(request: NextRequest) {
  const denied = await requirePermission('documents', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const where: any = {}

    if (clientId) {
      where.clientId = clientId
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.documentType = type
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true },
        },
        _count: {
          select: { issues: true },
        },
      },
      orderBy: { uploadDate: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
})

export const POST = withRequestLog(async function POST(request: NextRequest) {
  const denied = await requirePermission('documents', 'create')
  if (denied) return denied

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const validated = sanitizeStrings(documentSchema.parse(body))

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: validated.clientId },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Mark previous versions as not current
    if (validated.documentType) {
      await prisma.document.updateMany({
        where: {
          clientId: validated.clientId,
          documentType: validated.documentType,
          isCurrent: true,
        },
        data: { isCurrent: false },
      })
    }

    const document = await prisma.document.create({
      data: {
        clientId: validated.clientId,
        documentType: validated.documentType,
        documentName: validated.documentName,
        documentDate: validated.documentDate
          ? new Date(validated.documentDate)
          : null,
        expirationDate: validated.expirationDate
          ? new Date(validated.expirationDate)
          : null,
        status: 'RECEIVED',
        source: 'Manual Upload',
        isCurrent: true,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Error creating document:', error)
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    )
  }
})
