import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
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

export const GET = withRequestLog(async function GET(request: NextRequest) {
  const denied = await requirePermission('issues', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeAll = searchParams.get('includeAll') === 'true'

    const where: any = {}

    // Client filter
    if (clientId) {
      where.clientId = clientId
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

    // Full-text search on title, description, recommendation, issueCode
    if (search && search.trim()) {
      const searchTerm = search.trim()
      where.OR = [
        { title: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { recommendation: { contains: searchTerm } },
        { issueCode: { contains: searchTerm } },
        { findingCategory: { contains: searchTerm } },
        { client: { name: { contains: searchTerm } } },
      ]
    }

    const [findings, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true },
          },
          document: {
            select: { id: true, documentType: true, documentName: true },
          },
          caseReview: {
            select: { id: true, assessmentType: true, assessmentDate: true },
          },
          actionItems: {
            where: { status: { not: 'CLOSED' } },
          },
        },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.issue.count({ where }),
    ])

    // Get severity counts for summary
    const severityCounts = await prisma.issue.groupBy({
      by: ['severity'],
      _count: true,
      where: includeAll ? {} : { status: { not: 'CLOSED' } },
    })

    // Get status counts
    const statusCounts = await prisma.issue.groupBy({
      by: ['status'],
      _count: true,
    })

    // Get categories for filter dropdown
    const categories = await prisma.issue.findMany({
      select: { findingCategory: true },
      distinct: ['findingCategory'],
      where: { findingCategory: { not: null } },
    })

    // Get clients for filter dropdown
    const clients = await prisma.client.findMany({
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
        clients,
      },
    })
  } catch (error) {
    console.error('Error fetching findings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch findings' },
      { status: 500 }
    )
  }
})

// Get findings summary/stats
export const HEAD = withRequestLog(async function HEAD(request: NextRequest) {
  try {
    const stats = await prisma.issue.groupBy({
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
})
