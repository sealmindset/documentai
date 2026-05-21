import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  const denied = await requirePermission('case-reviews', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const where: any = {}
    if (clientId) where.clientId = clientId
    if (status) where.assessmentStatus = status
    if (type) where.assessmentType = type

    const assessments = await prisma.caseReview.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { issues: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(assessments)
  } catch (error) {
    console.error('Error fetching assessments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    )
  }
}
