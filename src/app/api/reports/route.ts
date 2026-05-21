import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  const denied = await requirePermission('reports', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const vendorId = searchParams.get('vendorId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const where: any = {}
    if (vendorId) where.vendorId = vendorId
    if (status) where.status = status
    if (type) where.reportType = type

    const reports = await prisma.report.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
