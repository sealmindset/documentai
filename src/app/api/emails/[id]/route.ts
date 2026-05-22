import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export const GET = withRequestLog(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('emails', 'view')
  if (denied) return denied

  const { id } = await params

  try {
    const email = await prisma.outboundEmail.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, caseNumber: true, courtName: true },
        },
      },
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    return NextResponse.json(email)
  } catch (error) {
    console.error('Error fetching email:', error)
    return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 })
  }
})

export const PUT = withRequestLog(async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('emails', 'edit')
  if (denied) return denied

  const { id } = await params

  try {
    const email = await prisma.outboundEmail.findUnique({ where: { id } })
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    if (email.status !== 'DRAFT' && email.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: `Cannot edit email in ${email.status} status` }, { status: 400 })
    }

    const body = await request.json()
    const updated = await prisma.outboundEmail.update({
      where: { id },
      data: {
        subject: body.subject ?? email.subject,
        body: body.body ?? email.body,
        recipientEmail: body.recipientEmail ?? email.recipientEmail,
        recipientName: body.recipientName ?? email.recipientName,
        ccEmails: body.ccEmails ? JSON.stringify(body.ccEmails) : email.ccEmails,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating email:', error)
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 })
  }
})

export const DELETE = withRequestLog(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('emails', 'delete')
  if (denied) return denied

  const { id } = await params

  try {
    const email = await prisma.outboundEmail.findUnique({ where: { id } })
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    if (email.status === 'SENT') {
      return NextResponse.json({ error: 'Sent emails cannot be deleted' }, { status: 400 })
    }

    await prisma.outboundEmail.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting email:', error)
    return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 })
  }
})
