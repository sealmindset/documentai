import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/db'

export const PUT = withRequestLog(async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('emails', 'edit')
  if (denied) return denied

  const { id } = await params
  const user = await getCurrentUser()

  try {
    const email = await prisma.outboundEmail.findUnique({ where: { id } })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    if (email.status !== 'DRAFT' && email.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: `Cannot approve email in ${email.status} status` },
        { status: 400 }
      )
    }

    const updated = await prisma.outboundEmail.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: user?.name || user?.id || 'Unknown',
        approvedAt: new Date(),
      },
    })

    await prisma.auditTrail.create({
      data: {
        userId: user?.id,
        action: 'APPROVE',
        entityType: 'OutboundEmail',
        entityId: id,
        newValues: JSON.stringify({ status: 'APPROVED' }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error approving email:', error)
    return NextResponse.json({ error: 'Failed to approve email' }, { status: 500 })
  }
})
