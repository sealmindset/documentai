import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export const GET = withRequestLog(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('documents', 'view')
  if (denied) return denied

  try {
    const { id } = await params
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true } },
        issues: {
          select: {
            id: true,
            title: true,
            severity: true,
            status: true,
            findingCategory: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
})
