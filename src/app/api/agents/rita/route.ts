import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { rita } from '@/lib/agents'
import { z } from 'zod'

const reportRequestSchema = z.object({
  vendorId: z.string().optional(),
  assessmentId: z.string().optional(),
  reportType: z.enum([
    'EXECUTIVE_SUMMARY',
    'DETAILED_ASSESSMENT',
    'COMPLIANCE_STATUS',
    'TREND_ANALYSIS',
    'PORTFOLIO_OVERVIEW',
  ]),
  includeFindings: z.boolean().default(true),
  includeTrends: z.boolean().default(false),
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
    const validated = reportRequestSchema.parse(body)

    // Execute RITA agent
    const result = await rita.execute({
      vendorId: validated.vendorId,
      assessmentId: validated.assessmentId,
      reportType: validated.reportType,
      includeFindings: validated.includeFindings,
      includeTrends: validated.includeTrends,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Agent execution failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: result.data,
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

export async function GET() {
  try {
    // Get executive dashboard data
    const result = await rita.generateExecutiveDashboard()

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate dashboard' },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
