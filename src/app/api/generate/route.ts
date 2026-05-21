import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { sage } from '@/lib/agents'
import { z } from 'zod'

const generateRequestSchema = z.object({
  clientId: z.string(),
  templateId: z.string(),
  overrides: z.record(z.string()).optional(),
  outputFormat: z.enum(['DOCX', 'PDF', 'TXT']).optional(),
})

export async function POST(request: NextRequest) {
  const denied = await requirePermission('generated-documents', 'create')
  if (denied) return denied

  const user = await getCurrentUser()
  if (user) {
    const limited = aiRateLimit(user.id)
    if (limited) return limited
  }

  try {
    const body = await request.json()
    const validated = generateRequestSchema.parse(body)

    const result = await sage.execute(validated)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Document generation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document: result.data,
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
}

export async function GET(request: NextRequest) {
  const denied = await requirePermission('generated-documents', 'view')
  if (denied) return denied

  const searchParams = request.nextUrl.searchParams
  const clientId = searchParams.get('clientId')

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
  }

  try {
    const context = await sage.previewMergeFields(clientId)
    return NextResponse.json(context)
  } catch (error) {
    console.error('Error previewing merge fields:', error)
    return NextResponse.json({ error: 'Failed to load merge fields' }, { status: 500 })
  }
}
