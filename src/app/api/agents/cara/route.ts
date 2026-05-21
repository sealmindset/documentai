import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { clara } from '@/lib/agents'
import prisma from '@/lib/db'
import { z } from 'zod'

const assessmentRequestSchema = z.object({
  vendorId: z.string(),
  assessmentType: z.enum(['INITIAL', 'ANNUAL', 'TRIGGERED', 'RENEWAL']),
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
    const validated = assessmentRequestSchema.parse(body)

    // Get vendor and risk profile
    const vendor = await prisma.vendor.findUnique({
      where: { id: validated.vendorId },
      include: {
        riskProfiles: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        riskFindings: {
          where: { status: { not: 'CLOSED' } },
          select: { title: true, severity: true },
        },
      },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const riskProfile = vendor.riskProfiles[0]
    if (!riskProfile) {
      return NextResponse.json(
        { error: 'Party must have a profile before document review' },
        { status: 400 }
      )
    }

    // Execute CLARA agent
    const result = await clara.execute({
      vendorId: validated.vendorId,
      riskProfileId: riskProfile.id,
      assessmentType: validated.assessmentType,
      vendorInfo: {
        name: vendor.name,
        industry: vendor.industry || 'Unknown',
        country: vendor.country || 'Unknown',
        annualSpend: Number(vendor.annualSpend) || 0,
      },
      existingFindings: vendor.riskFindings.map(
        (f) => `[${f.severity}] ${f.title}`
      ),
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Agent execution failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assessment: result.data,
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
