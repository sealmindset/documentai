import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { orchestrator } from '@/lib/agents'
import prisma from '@/lib/db'
import { z } from 'zod'

const onboardRequestSchema = z.object({
  clientId: z.string().max(100),
  dataTypesAccessed: z.array(z.string().max(255)).default([]),
  systemIntegrations: z.array(z.string().max(255)).default([]),
  hasPiiAccess: z.boolean().default(false),
  hasPhiAccess: z.boolean().default(false),
  hasPciAccess: z.boolean().default(false),
  businessCriticality: z.enum([
    'MISSION_CRITICAL',
    'BUSINESS_CRITICAL',
    'IMPORTANT',
    'STANDARD',
  ]),
})

const documentProcessSchema = z.object({
  clientId: z.string().max(100),
  documentId: z.string().max(100),
  documentContent: z.string().max(500000).optional(),
})

// Full client onboarding workflow
export const POST = withRequestLog(async function POST(request: NextRequest) {
  const denied = await requirePermission('agents', 'create')
  if (denied) return denied

  // Rate limit check
  const user = await getCurrentUser()
  if (user) {
    const limited = aiRateLimit(user.id)
    if (limited) return limited
  }

  try {
    const body = await request.json()
    const validated = onboardRequestSchema.parse(body)

    // Get client info
    const client = await prisma.client.findUnique({
      where: { id: validated.clientId },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Execute full onboarding workflow
    const result = await orchestrator.onboardClient({
      clientId: validated.clientId,
      clientName: client.name,
      industry: client.industry || undefined,
      dataTypesAccessed: validated.dataTypesAccessed,
      systemIntegrations: validated.systemIntegrations,
      hasPiiAccess: validated.hasPiiAccess,
      hasPhiAccess: validated.hasPhiAccess,
      hasPciAccess: validated.hasPciAccess,
      businessCriticality: validated.businessCriticality,
      annualSpend: client.annualSpend ? Number(client.annualSpend) : undefined,
    })

    return NextResponse.json({
      success: result.overallSuccess,
      workflow: result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e: { path: (string | number)[]; message: string }) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    const safe = sanitizeAIError(error)
    return NextResponse.json(
      { error: safe.message },
      { status: safe.status }
    )
  }
})

// Document processing workflow
export const PUT = withRequestLog(async function PUT(request: NextRequest) {
  const denied = await requirePermission('agents', 'create')
  if (denied) return denied

  // Rate limit check
  const putUser = await getCurrentUser()
  if (putUser) {
    const limited = aiRateLimit(putUser.id)
    if (limited) return limited
  }

  try {
    const body = await request.json()
    const validated = documentProcessSchema.parse(body)

    const document = await prisma.document.findUnique({
      where: { id: validated.documentId },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Use provided content or placeholder
    const content = validated.documentContent ||
      `Document: ${document.documentName}\nType: ${document.documentType}`

    const result = await orchestrator.processDocument(
      validated.clientId,
      validated.documentId,
      document.documentType,
      content
    )

    return NextResponse.json({
      success: result.overallSuccess,
      workflow: result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e: { path: (string | number)[]; message: string }) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    const safe = sanitizeAIError(error)
    return NextResponse.json(
      { error: safe.message },
      { status: safe.status }
    )
  }
})

// Maintenance cycle
export const PATCH = withRequestLog(async function PATCH() {
  const denied2 = await requirePermission('agents', 'create')
  if (denied2) return denied2

  try {
    const result = await orchestrator.runMaintenanceCycle()

    return NextResponse.json({
      success: true,
      maintenance: result,
    })
  } catch (error) {
    const safe = sanitizeAIError(error)
    return NextResponse.json(
      { error: safe.message },
      { status: safe.status }
    )
  }
})
