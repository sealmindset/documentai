import { NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { chat } from '@/lib/ai/provider'
import type { ChatMessage } from '@/lib/ai/provider'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { maskPII, unmaskPII } from '@/lib/ai/pii-masker'
import { validateDocumentSize } from '@/lib/ai/sanitize'
import { safeParseJSON } from '@/lib/ai/validate'
import { SAFETY_PREAMBLE } from '@/lib/ai/safety-preamble'
import { extractContent } from '@/lib/documents/extract-text'

// Force dynamic to prevent static generation issues with pdf-parse
export const dynamic = 'force-dynamic'

const ANALYSIS_PROMPT = `You are an expert legal document analyst for Vanmerven Law Firm.
Analyze the provided document and extract:
1. Key compliance controls and certifications
2. Issues and gaps identified
3. Regulatory compliance status
4. Data handling practices
5. Business continuity capabilities
6. Recommended priority rating (CRITICAL, HIGH, MEDIUM, LOW)

Format your response as JSON with the following structure:
{
  "documentType": "SOC2_TYPE2 | ISO27001 | PENTEST | CAIQ | BCP | ARCHITECTURE | BRIDGE_LETTER | SOA | EXECUTIVE_SUMMARY | OTHER",
  "summary": "Brief summary of the document",
  "keyFindings": ["finding1", "finding2"],
  "riskFactors": ["risk1", "risk2"],
  "strengths": ["strength1", "strength2"],
  "recommendedRating": "MEDIUM",
  "controlsCovered": ["control1", "control2"],
  "expirationDate": "2025-12-31 or null",
  "recommendations": ["recommendation1", "recommendation2"]
}`

export async function POST(request: Request) {
  const denied = await requirePermission('documents', 'edit')
  if (denied) return denied

  // Rate limit check
  const user = await getCurrentUser()
  if (user) {
    const limited = aiRateLimit(user.id)
    if (limited) return limited
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const vendorId = formData.get('vendorId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Enforce file size limit (default 50MB)
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
    const { text: content, isImage, imageBase64, imageMime } = extracted

    // Validate document size
    if (!isImage) {
      const sizeError = validateDocumentSize(content)
      if (sizeError) {
        return NextResponse.json({ error: sizeError }, { status: 400 })
      }
    }

    // Mask PII before sending to AI provider
    const { maskedText: maskedContent, mappings: piiMappings } = isImage
      ? { maskedText: content, mappings: [] }
      : maskPII(content)

    // Analyze with AI provider (prepend safety preamble)
    const systemPromptWithPreamble = SAFETY_PREAMBLE + ANALYSIS_PROMPT
    let messages: ChatMessage[]

    if (isImage && imageBase64 && imageMime) {
      messages = [
        { role: 'system', content: systemPromptWithPreamble },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${imageMime};base64,${imageBase64}` },
            },
            {
              type: 'text',
              text: 'Analyze this document image (likely a diagram, certificate, or similar):',
            },
          ],
        },
      ]
    } else {
      const truncatedContent = maskedContent.slice(0, 100000)
      messages = [
        { role: 'system', content: systemPromptWithPreamble },
        { role: 'user', content: `Analyze this document:\n\n<user_input>\n${truncatedContent}\n</user_input>` },
      ]
    }

    const response = await chat(messages, {
      temperature: 0.3,
      maxTokens: 4096,
      tier: 'complex',
    })

    // Restore PII in the response
    const unmaskedResponse = unmaskPII(response.content, piiMappings)

    // Safe JSON parse
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let analysis: any
    const parsed = safeParseJSON<Record<string, unknown>>(unmaskedResponse)
    if (parsed.success) {
      analysis = parsed.data
    } else {
      analysis = { summary: unmaskedResponse, error: 'JSON parse failed' }
    }

    // Store document in database
    if (vendorId) {
      const document = await prisma.document.create({
        data: {
          vendorId,
          documentName: file.name,
          documentType: analysis.documentType || 'OTHER',
          mimeType: file.type,
          fileSize: file.size,
          status: 'ANALYZED',
          analysisResult: JSON.stringify(analysis),
          retrievedBy: 'DORA',
        },
      })

      // Create findings
      if (analysis.riskFactors?.length > 0) {
        for (const risk of analysis.riskFactors) {
          await prisma.riskFinding.create({
            data: {
              vendorId,
              documentId: document.id,
              title: risk,
              severity: analysis.recommendedRating === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
              identifiedBy: 'ARIA',
              status: 'OPEN',
            },
          })
        }
      }

      return NextResponse.json({ document, analysis })
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    const safe = sanitizeAIError(error)
    return NextResponse.json(
      { error: safe.message },
      { status: safe.status }
    )
  }
}
