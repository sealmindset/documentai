import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { clara } from '@/lib/agents'
import prisma from '@/lib/db'
import { z } from 'zod'

const assessmentRequestSchema = z.object({
  clientId: z.string(),
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

    // Get client and client profile
    const client = await prisma.client.findUnique({
      where: { id: validated.clientId },
      include: {
        clientProfiles: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        issues: {
          where: { status: { not: 'CLOSED' } },
          select: { title: true, severity: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const clientProfile = client.clientProfiles[0]
    if (!clientProfile) {
      return NextResponse.json(
        { error: 'Party must have a profile before document review' },
        { status: 400 }
      )
    }

    // Execute CLARA agent
    const result = await clara.execute({
      clientId: validated.clientId,
      clientProfileId: clientProfile.id,
      assessmentType: validated.assessmentType,
      clientInfo: {
        name: client.name,
        industry: client.industry || 'Unknown',
        country: client.country || 'Unknown',
        annualSpend: Number(client.annualSpend) || 0,
      },
      existingIssues: client.issues.map(
        (f: { severity: string; title: string }) => `[${f.severity}] ${f.title}`
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
