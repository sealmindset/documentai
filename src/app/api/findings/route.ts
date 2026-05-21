import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'

const findingUpdateSchema = z.object({
  status: z
    .enum([
      'OPEN',
      'IN_REMEDIATION',
      'PENDING_VERIFICATION',
      'RESOLVED',
      'ACCEPTED',
      'CLOSED',
    ])
    .optional(),
  dueDate: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const denied = await requirePermission('findings', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const vendorId = searchParams.get('vendorId')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeAll = searchParams.get('includeAll') === 'true'

    const where: any = {}

    // Vendor filter
    if (vendorId) {
      where.vendorId = vendorId
    }

    // Severity filter
    if (severity && severity !== 'ALL') {
      where.severity = severity
    }

    // Status filter
    if (status && status !== 'ALL') {
      where.status = status
    } else if (!includeAll) {
      // By default, exclude closed findings unless includeAll is true
      where.status = { not: 'CLOSED' }
    }

    // Category filter
    if (category && category !== 'ALL') {
      where.findingCategory = category
    }

    // Full-text search on title, description, recommendation, findingId
    if (search && search.trim()) {
      const searchTerm = search.trim()
      where.OR = [
        { title: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { recommendation: { contains: searchTerm } },
        { findingId: { contains: searchTerm } },
        { findingCategory: { contains: searchTerm } },
        { vendor: { name: { contains: searchTerm } } },
      ]
    }

    const [findings, total] = await Promise.all([
      prisma.riskFinding.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, name: true },
          },
          document: {
            select: { id: true, documentType: true, documentName: true },
          },
          assessment: {
            select: { id: true, assessmentType: true, assessmentDate: true },
          },
          remediationActions: {
            where: { status: { not: 'CLOSED' } },
          },
        },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.riskFinding.count({ where }),
    ])

    // Get severity counts for summary
    const severityCounts = await prisma.riskFinding.groupBy({
      by: ['severity'],
      _count: true,
      where: includeAll ? {} : { status: { not: 'CLOSED' } },
    })

    // Get status counts
    const statusCounts = await prisma.riskFinding.groupBy({
      by: ['status'],
      _count: true,
    })

    // Get categories for filter dropdown
    const categories = await prisma.riskFinding.findMany({
      select: { findingCategory: true },
      distinct: ['findingCategory'],
      where: { findingCategory: { not: null } },
    })

    // Get vendors for filter dropdown
    const vendors = await prisma.vendor.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      findings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        severityCounts: severityCounts.reduce((acc, item) => {
          acc[item.severity] = item._count
          return acc
        }, {} as Record<string, number>),
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count
          return acc
        }, {} as Record<string, number>),
        categories: categories.map(c => c.findingCategory).filter(Boolean),
        vendors,
      },
    })
  } catch (error) {
    console.error('Error fetching findings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch findings' },
      { status: 500 }
    )
  }
}

// Get findings summary/stats
export async function HEAD(request: NextRequest) {
  try {
    const stats = await prisma.riskFinding.groupBy({
      by: ['severity'],
      _count: true,
      where: { status: { not: 'CLOSED' } },
    })

    const headers = new Headers()
    headers.set('X-Findings-Stats', JSON.stringify(stats))

    return new NextResponse(null, { status: 200, headers })
  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}
