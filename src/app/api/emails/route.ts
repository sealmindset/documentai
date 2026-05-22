import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { echo } from '@/lib/agents'
import prisma from '@/lib/db'
import { z } from 'zod'

const composeSchema = z.object({
  clientId: z.string(),
  emailTemplateId: z.string().optional(),
  recipientContactId: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  attachmentIds: z.array(z.string()).optional(),
  overrides: z.record(z.string()).optional(),
  triggeredBy: z.enum(['MANUAL', 'SAGE_PIPELINE', 'SCHEDULED']).optional(),
})

export const POST = withRequestLog(async function POST(request: NextRequest) {
  const denied = await requirePermission('emails', 'create')
  if (denied) return denied

  const user = await getCurrentUser()
  if (user) {
    const limited = aiRateLimit(user.id)
    if (limited) return limited
  }

  try {
    const body = await request.json()
    const validated = composeSchema.parse(body)

    const result = await echo.compose(validated)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Email composition failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      email: result.data,
      processingTimeMs: result.processingTimeMs,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    const safe = sanitizeAIError(error)
    return NextResponse.json({ error: safe.message }, { status: safe.status })
  }
})

export const GET = withRequestLog(async function GET(request: NextRequest) {
  const denied = await requirePermission('emails', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (clientId) where.clientId = clientId
    if (status) where.status = status

    const emails = await prisma.outboundEmail.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, caseNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(emails)
  } catch (error) {
    console.error('Error fetching emails:', error)
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
  }
})
