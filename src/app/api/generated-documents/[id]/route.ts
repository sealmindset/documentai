import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('generated-documents', 'view')
  if (denied) return denied

  const { id } = await params

  try {
    const doc = await prisma.generatedDocument.findUnique({
      where: { id },
      include: {
        template: true,
        client: {
          select: { id: true, name: true, caseNumber: true, courtName: true },
        },
      },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Error fetching generated document:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('generated-documents', 'delete')
  if (denied) return denied

  const { id } = await params

  try {
    const doc = await prisma.generatedDocument.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (doc.status === 'FILED') {
      return NextResponse.json({ error: 'Filed documents cannot be deleted' }, { status: 400 })
    }

    await prisma.generatedDocument.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting generated document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
