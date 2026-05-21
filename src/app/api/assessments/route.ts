import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  const denied = await requirePermission('assessments', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const vendorId = searchParams.get('vendorId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const where: any = {}
    if (vendorId) where.vendorId = vendorId
    if (status) where.assessmentStatus = status
    if (type) where.assessmentType = type

    const assessments = await prisma.riskAssessment.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        _count: { select: { riskFindings: true } },
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
