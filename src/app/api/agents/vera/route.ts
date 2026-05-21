import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { lexa } from '@/lib/agents'

import prisma from '@/lib/db'
import { z } from 'zod'

const profileRequestSchema = z.object({
  vendorId: z.string(),
  dataTypesAccessed: z.array(z.string()).default([]),
  systemIntegrations: z.array(z.string()).default([]),
  hasPiiAccess: z.boolean().default(false),
  hasPhiAccess: z.boolean().default(false),
  hasPciAccess: z.boolean().default(false),
  businessCriticality: z.enum([
    'MISSION_CRITICAL',
    'BUSINESS_CRITICAL',
    'IMPORTANT',
    'STANDARD',
  ]),
  additionalContext: z.string().optional(),
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
    const validated = profileRequestSchema.parse(body)

    // Get vendor info
    const vendor = await prisma.vendor.findUnique({
      where: { id: validated.vendorId },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Execute LEXA agent
    const result = await lexa.execute({
      vendorId: validated.vendorId,
      vendorName: vendor.name,
      industry: vendor.industry || undefined,
      dataTypesAccessed: validated.dataTypesAccessed,
      systemIntegrations: validated.systemIntegrations,
      hasPiiAccess: validated.hasPiiAccess,
      hasPhiAccess: validated.hasPhiAccess,
      hasPciAccess: validated.hasPciAccess,
      businessCriticality: validated.businessCriticality,
      annualSpend: vendor.annualSpend ? Number(vendor.annualSpend) : undefined,
      additionalContext: validated.additionalContext,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Agent execution failed' },
        { status: 500 }
      )
    }

    // Update vendor status to ACTIVE if profiling successful
    await prisma.vendor.update({
      where: { id: validated.vendorId },
      data: { status: 'ACTIVE' },
    })

    return NextResponse.json({
      success: true,
      profile: result.data,
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
