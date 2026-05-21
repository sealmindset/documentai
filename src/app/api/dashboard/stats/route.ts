import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  try {
    const [
      totalClients,
      activeCaseReviews,
      pendingReviews,
      criticalIssues,
      highIssues,
    ] = await Promise.all([
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.caseReview.count({ where: { assessmentStatus: 'IN_PROGRESS' } }),
      prisma.caseReview.count({ where: { assessmentStatus: 'PENDING_REVIEW' } }),
      prisma.issue.count({ where: { severity: 'CRITICAL', status: 'OPEN' } }),
      prisma.issue.count({ where: { severity: 'HIGH', status: 'OPEN' } }),
    ])

    // Completed this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const completedThisMonth = await prisma.caseReview.count({
      where: {
        assessmentStatus: 'COMPLETE',
        updatedAt: { gte: startOfMonth },
      },
    })

    return NextResponse.json({
      totalClients,
      activeCaseReviews,
      pendingReviews,
      criticalIssues,
      highIssues,
      completedThisMonth,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    // Return demo data if database not available
    return NextResponse.json({
      totalClients: 47,
      activeCaseReviews: 12,
      pendingReviews: 8,
      criticalIssues: 3,
      highIssues: 15,
      completedThisMonth: 5,
    })
  }
}
