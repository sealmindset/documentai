import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/db'

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('generated-documents', 'edit')
  if (denied) return denied

  const { id } = await params
  const user = await getCurrentUser()

  try {
    const doc = await prisma.generatedDocument.findUnique({ where: { id } })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (doc.status !== 'DRAFT' && doc.status !== 'PENDING_REVIEW') {
      return NextResponse.json(
        { error: `Cannot approve document in ${doc.status} status` },
        { status: 400 }
      )
    }

    const updated = await prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: user?.name || user?.id || 'Unknown',
        reviewedAt: new Date(),
      },
    })

    await prisma.auditTrail.create({
      data: {
        userId: user?.id,
        action: 'APPROVE',
        entityType: 'GeneratedDocument',
        entityId: id,
        newValues: JSON.stringify({ status: 'APPROVED' }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error approving document:', error)
    return NextResponse.json({ error: 'Failed to approve document' }, { status: 500 })
  }
}
