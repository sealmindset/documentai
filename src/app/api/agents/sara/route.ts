import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { aria } from '@/lib/agents'
import prisma from '@/lib/db'
import { z } from 'zod'

const analysisRequestSchema = z.object({
  clientId: z.string(),
  documentId: z.string(),
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
    const validated = analysisRequestSchema.parse(body)

    // Get document and client info
    const document = await prisma.document.findUnique({
      where: { id: validated.documentId },
      include: {
        client: {
          include: {
            clientProfiles: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.clientId !== validated.clientId) {
      return NextResponse.json(
        { error: 'Document does not belong to this party' },
        { status: 400 }
      )
    }

    // Update document status to analyzing
    await prisma.document.update({
      where: { id: validated.documentId },
      data: { status: 'ANALYZING' },
    })

    // For now, use placeholder content - in production, read from file
    const documentContent = document.analysisResult ||
      `Document Type: ${document.documentType}\n` +
      `Document Name: ${document.documentName}\n` +
      `This is a placeholder for the actual document content.\n` +
      `In production, this would be extracted from the uploaded file.`

    // Execute ARIA agent
    const result = await aria.execute({
      clientId: validated.clientId,
      documentId: validated.documentId,
      documentType: document.documentType,
      documentContent,
      clientContext: {
        name: document.client.name,
        priorityTier: document.client.clientProfiles[0]?.priorityTier || 'MEDIUM',
        dataAccess: JSON.parse(document.client.clientProfiles[0]?.dataTypesAccessed || '[]') as string[],
      },
    })

    if (!result.success) {
      // Revert document status on failure
      await prisma.document.update({
        where: { id: validated.documentId },
        data: { status: 'RECEIVED' },
      })

      return NextResponse.json(
        { error: result.error || 'Agent execution failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis: result.data,
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
