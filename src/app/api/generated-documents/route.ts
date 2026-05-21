import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  const denied = await requirePermission('generated-documents', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (clientId) where.clientId = clientId
    if (status) where.status = status

    const documents = await prisma.generatedDocument.findMany({
      where,
      include: {
        template: {
          select: { name: true, category: true },
        },
        client: {
          select: { id: true, name: true, caseNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching generated documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}
