import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { atlas } from '@/lib/agents'
import prisma from '@/lib/db'
import { z } from 'zod'

const remediationRequestSchema = z.object({
  findingId: z.string(),
})

const acceptanceRequestSchema = z.object({
  findingId: z.string(),
  justification: z.string().min(50),
  approver: z.string(),
})

export async function POST(request: NextRequest) {
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
    const validated = remediationRequestSchema.parse(body)

    // Get finding and vendor info
    const finding = await prisma.riskFinding.findUnique({
      where: { id: validated.findingId },
      include: {
        vendor: true,
      },
    })

    if (!finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 })
    }

    // Execute ATLAS agent
    const result = await atlas.execute({
      findingId: validated.findingId,
      vendorId: finding.vendorId,
      finding: {
        title: finding.title,
        severity: finding.severity,
        description: finding.description || '',
      },
      vendorContact: {
        name: finding.vendor.primaryContactName || 'Vendor Contact',
        email: finding.vendor.primaryContactEmail || '',
      },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Agent execution failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      remediationPlan: result.data,
      processingTimeMs: result.processingTimeMs,
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
}

// Handle risk acceptance
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = acceptanceRequestSchema.parse(body)

    const result = await atlas.processRiskAcceptance(
      validated.findingId,
      validated.justification,
      validated.approver
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to process risk acceptance' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      acceptance: result.data,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e: { path: (string | number)[]; message: string }) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Risk acceptance error:', error)
    return NextResponse.json(
      { error: 'Failed to process risk acceptance' },
      { status: 500 }
    )
  }
}

// Check overdue actions
export async function GET() {
  try {
    const result = await atlas.checkOverdueActions()

    return NextResponse.json({
      success: result.success,
      escalations: result.data || [],
      error: result.error,
    })
  } catch (error) {
    console.error('Overdue check error:', error)
    return NextResponse.json(
      { error: 'Failed to check overdue actions' },
      { status: 500 }
    )
  }
}
