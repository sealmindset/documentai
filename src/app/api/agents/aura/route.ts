import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { aura } from '@/lib/agents'
import { z } from 'zod'

const extractionSchema = z.object({
  text: z.string().min(1),
  isImage: z.boolean().default(false),
  imageBase64: z.string().optional(),
  imageMime: z.string().optional(),
  fileName: z.string().min(1),
})

const comparisonSchema = z.object({
  existingDoc: z.object({
    name: z.string(),
    date: z.string().nullable(),
    snippet: z.string(),
  }),
  newDoc: z.object({
    name: z.string(),
    date: z.string().nullable(),
    snippet: z.string(),
  }),
})

const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('extract'), ...extractionSchema.shape }),
  z.object({ action: z.literal('compare'), ...comparisonSchema.shape }),
])

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const denied = await requirePermission('agents', 'create')
  if (denied) return denied

  const user = await getCurrentUser()
  if (user) {
    const limited = aiRateLimit(user.id)
    if (limited) return limited
  }

  try {
    const body = await request.json()
    const validated = requestSchema.parse(body)

    if (validated.action === 'extract') {
      const result = await aura.execute({
        text: validated.text,
        isImage: validated.isImage,
        imageBase64: validated.imageBase64,
        imageMime: validated.imageMime,
        fileName: validated.fileName,
      })

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Document extraction failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        extraction: result.data,
        processingTimeMs: result.processingTimeMs,
      })
    } else {
      const result = await aura.compareDocuments({
        existingDoc: validated.existingDoc,
        newDoc: validated.newDoc,
      })

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Document comparison failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        comparison: result.data,
        processingTimeMs: result.processingTimeMs,
      })
    }
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
