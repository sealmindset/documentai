import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { aiRateLimit } from '@/lib/ai/rate-limit'
import { sanitizeAIError } from '@/lib/ai/errors'
import { sage, echo } from '@/lib/agents'
import prisma from '@/lib/db'

export const POST = withRequestLog(async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('generated-documents', 'create')
  if (denied) return denied

  const user = await getCurrentUser()
  if (user) {
    const limited = aiRateLimit(user.id)
    if (limited) return limited
  }

  const { id: clientId } = await params

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        caseContacts: {
          include: {
            contact: {
              include: { phones: true, emails: true },
            },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const entryTemplate = await prisma.documentTemplate.findFirst({
      where: { name: 'Entry of Appearance', isActive: true },
    })

    if (!entryTemplate) {
      return NextResponse.json(
        { error: 'Entry of Appearance template not found' },
        { status: 404 }
      )
    }

    const genResult = await sage.execute({
      clientId,
      templateId: entryTemplate.id,
    })

    if (!genResult.success) {
      return NextResponse.json(
        { error: genResult.error || 'Document generation failed' },
        { status: 500 }
      )
    }

    let emailResult = null

    const prosecutorLink = client.caseContacts.find(
      (cc) => cc.role === 'PROSECUTOR'
    )
    const courtesyTemplate = await prisma.emailTemplate.findFirst({
      where: { name: 'Prosecutor Courtesy Notice', isActive: true },
    })

    if (prosecutorLink && courtesyTemplate && genResult.data?.id) {
      const composeResult = await echo.compose({
        clientId,
        emailTemplateId: courtesyTemplate.id,
        recipientContactId: prosecutorLink.contact.id,
        attachmentIds: [genResult.data.id],
        triggeredBy: 'SAGE_PIPELINE',
      })

      if (composeResult.success) {
        emailResult = composeResult.data
      }
    }

    return NextResponse.json({
      success: true,
      document: genResult.data,
      email: emailResult,
      processingTimeMs: genResult.processingTimeMs,
    })
  } catch (error) {
    const safe = sanitizeAIError(error)
    return NextResponse.json({ error: safe.message }, { status: safe.status })
  }
})
