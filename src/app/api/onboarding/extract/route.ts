import { NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { validateDocumentSize } from '@/lib/ai/sanitize'
import { extractContent } from '@/lib/documents/extract-text'
import { aura } from '@/lib/agents'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const denied = await requirePermission('documents', 'edit')
  if (denied) return denied

  const user = await getCurrentUser()
  if (user) {
    const limited = aiRateLimit(user.id)
    if (limited) return limited
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10)
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB.` },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const extracted = await extractContent(buffer, file.name, file.type)

    if (!extracted.isImage) {
      const sizeError = validateDocumentSize(extracted.text)
      if (sizeError) {
        return NextResponse.json({ error: sizeError }, { status: 400 })
      }
    }

    // Delegate to AURA agent (handles PII masking, safety pipeline, prompt management)
    const result = await aura.execute({
      text: extracted.text,
      isImage: extracted.isImage,
      imageBase64: extracted.imageBase64,
      imageMime: extracted.imageMime,
      fileName: file.name,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to extract vendor information' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      extractedText: extracted.text.slice(0, 5000),
      vendorInfo: result.data.vendorInfo || {},
      confidence: result.data.confidence || {},
      documentAnalysis: result.data.documentAnalysis || {},
    })
  } catch (error) {
    const safe = sanitizeAIError(error)
    return NextResponse.json({ error: safe.message }, { status: safe.status })
  }
}
