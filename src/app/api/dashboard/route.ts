import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  try {
    const now = new Date()
    const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const day31 = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)
    const day90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    const day91 = new Date(now.getTime() + 91 * 24 * 60 * 60 * 1000)
    const day180 = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const day7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      // 1. Pipeline
      clientsByStatus,
      // 2. Cases by type
      clientsWithIndustry,
      // 3. Deadline counts — documents (3 buckets)
      docDeadline30,
      docDeadline90,
      docDeadline180,
      // 3. Deadline counts — issues (3 buckets)
      issueDeadline30,
      issueDeadline90,
      issueDeadline180,
      // 3. Deadline counts — actions (3 buckets)
      actionDeadline30,
      actionDeadline90,
      actionDeadline180,
      // 4. Motions
      motions,
      // 5. Caseload by attorney
      caseloadByAttorney,
      // 6. Billing
      billingTotal,
      billingByStatus,
      // 7. Court calendar — documents, issues, actions in next 30 days
      calendarDocuments,
      calendarIssues,
      calendarActions,
      // 8. Alert inputs
      criticalClients,
      overdueActions,
      expiringDocuments,
      criticalIssues,
      newCasesPendingIntake,
      motionsDue7Days,
      // 9. Recent activity
      recentActivity,
    ] = await Promise.all([
      // 1. Pipeline: client counts grouped by status
      prisma.client.groupBy({ by: ['status'], _count: { _all: true } }),

      // 2. Cases by type: all clients with industry field
      prisma.client.findMany({ select: { industry: true } }),

      // 3. Deadline counts — documents per exclusive bucket
      prisma.document.count({
        where: { expirationDate: { gte: now, lte: day30 }, status: { not: 'EXPIRED' } },
      }),
      prisma.document.count({
        where: { expirationDate: { gte: day31, lte: day90 }, status: { not: 'EXPIRED' } },
      }),
      prisma.document.count({
        where: { expirationDate: { gte: day91, lte: day180 }, status: { not: 'EXPIRED' } },
      }),
      // 3. Deadline counts — issues per exclusive bucket
      prisma.issue.count({
        where: { dueDate: { gte: now, lte: day30 }, status: { notIn: ['CLOSED', 'RESOLVED'] } },
      }),
      prisma.issue.count({
        where: { dueDate: { gte: day31, lte: day90 }, status: { notIn: ['CLOSED', 'RESOLVED'] } },
      }),
      prisma.issue.count({
        where: { dueDate: { gte: day91, lte: day180 }, status: { notIn: ['CLOSED', 'RESOLVED'] } },
      }),
      // 3. Deadline counts — actions per exclusive bucket
      prisma.actionItem.count({
        where: { dueDate: { gte: now, lte: day30 }, status: { notIn: ['CLOSED', 'VERIFIED'] } },
      }),
      prisma.actionItem.count({
        where: { dueDate: { gte: day31, lte: day90 }, status: { notIn: ['CLOSED', 'VERIFIED'] } },
      }),
      prisma.actionItem.count({
        where: { dueDate: { gte: day91, lte: day180 }, status: { notIn: ['CLOSED', 'VERIFIED'] } },
      }),

      // 4. Motions
      prisma.document.findMany({
        where: { documentType: { startsWith: 'MOTION' } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { expirationDate: 'asc' },
      }),

      // 5. Caseload by attorney
      prisma.client.groupBy({
        by: ['businessOwner'],
        where: { status: { notIn: ['CLOSED'] }, businessOwner: { not: null } },
        _count: { _all: true },
      }),

      // 6. Billing — total
      prisma.client.aggregate({ _sum: { annualSpend: true } }),
      // 6. Billing — by status
      prisma.client.groupBy({ by: ['status'], _sum: { annualSpend: true } }),

      // 7. Court calendar — documents in next 30 days
      prisma.document.findMany({
        where: { expirationDate: { gte: now, lte: day30 }, status: { not: 'EXPIRED' } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { expirationDate: 'asc' },
      }),
      // 7. Court calendar — issues in next 30 days
      prisma.issue.findMany({
        where: { dueDate: { gte: now, lte: day30 }, status: { notIn: ['CLOSED', 'RESOLVED'] } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      // 7. Court calendar — actions in next 30 days
      prisma.actionItem.findMany({
        where: { dueDate: { gte: now, lte: day30 }, status: { notIn: ['CLOSED', 'VERIFIED'] } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
      }),

      // 8. Alert inputs
      prisma.clientProfile.count({ where: { priorityTier: 'CRITICAL', client: { status: 'ACTIVE' } } }),
      prisma.actionItem.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, dueDate: { lt: now } },
      }),
      prisma.document.count({
        where: { expirationDate: { lte: day30, gt: now }, status: { not: 'EXPIRED' } },
      }),
      prisma.issue.count({
        where: { severity: { in: ['CRITICAL', 'HIGH'] }, status: { not: 'CLOSED' } },
      }),
      prisma.client.count({
        where: { status: 'NEW', createdAt: { lt: day7ago } },
      }),
      prisma.document.count({
        where: {
          documentType: { startsWith: 'MOTION' },
          expirationDate: { gte: now, lte: day7 },
        },
      }),

      // 9. Recent activity
      prisma.agentActivityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          agentName: true,
          activityType: true,
          actionTaken: true,
          status: true,
          createdAt: true,
        },
      }),
    ])

    // 1. Pipeline — map to expected shape
    const pipelineStatuses = ['NEW', 'ACCEPTED', 'ASSIGNED', 'ACTIVE', 'CLOSED'] as const
    const pipeline: Record<string, number> = {}
    for (const s of pipelineStatuses) {
      pipeline[s] = 0
    }
    for (const item of clientsByStatus) {
      pipeline[item.status] = (pipeline[item.status] || 0) + item._count._all
    }

    // 2. Cases by type — parse industry field, split on ' — '
    const categoryMap: Record<string, number> = {}
    for (const v of clientsWithIndustry) {
      const category = v.industry?.split(' — ')[0]?.trim() || 'Unknown'
      categoryMap[category] = (categoryMap[category] || 0) + 1
    }
    const casesByType = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    // 3. Deadline counts — sum all three sources per bucket
    const deadlines = {
      next30: docDeadline30 + issueDeadline30 + actionDeadline30,
      next90: docDeadline90 + issueDeadline90 + actionDeadline90,
      next180: docDeadline180 + issueDeadline180 + actionDeadline180,
    }

    // 4. Motions — format response
    const motionsResponse = {
      count: motions.length,
      items: motions.map((m) => ({
        id: m.id,
        documentName: m.documentName,
        documentType: m.documentType,
        expirationDate: m.expirationDate?.toISOString() || null,
        status: m.status,
        client: { id: m.client.id, name: m.client.name },
      })),
    }

    // 5. Caseload by attorney — format response
    const caseloadResponse = caseloadByAttorney.map((item) => ({
      attorney: item.businessOwner!,
      count: item._count._all,
    })).sort((a, b) => b.count - a.count)

    // 6. Billing — compute active vs closed fees
    const totalFees = Number(billingTotal._sum.annualSpend || 0)
    const activeStatuses = ['NEW', 'ACCEPTED', 'ASSIGNED', 'ACTIVE']
    let activeFees = 0
    let closedFees = 0
    const byStatus = billingByStatus.map((item) => {
      const total = Number(item._sum.annualSpend || 0)
      if (item.status === 'CLOSED') {
        closedFees += total
      } else if (activeStatuses.includes(item.status)) {
        activeFees += total
      }
      return { status: item.status, total }
    })
    const billing = { totalFees, activeFees, closedFees, byStatus }

    // 7. Court calendar — combine into unified array sorted by date
    const courtCalendar = [
      ...calendarDocuments.map((d) => ({
        date: d.expirationDate!.toISOString(),
        type: d.documentType.startsWith('MOTION') ? 'motion_hearing' : 'document_deadline',
        title: d.documentName,
        clientName: d.client.name,
        clientId: d.client.id,
      })),
      ...calendarIssues.map((f) => ({
        date: f.dueDate!.toISOString(),
        type: 'issue_deadline',
        title: f.title,
        clientName: f.client.name,
        clientId: f.client.id,
      })),
      ...calendarActions.map((a) => ({
        date: a.dueDate!.toISOString(),
        type: 'action_deadline',
        title: a.title,
        clientName: a.client.name,
        clientId: a.client.id,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // 8. Alerts
    const alerts = generateAlerts({
      criticalClients,
      criticalIssues,
      overdueActions,
      expiringDocuments,
      newCasesPendingIntake,
      motionsDue7Days,
    })

    // 9. Recent activity — format dates
    const formattedActivity = recentActivity.map((a) => ({
      id: a.id,
      agentName: a.agentName,
      activityType: a.activityType,
      actionTaken: a.actionTaken,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    }))

    return NextResponse.json({
      pipeline,
      casesByType,
      deadlines,
      motions: motionsResponse,
      caseloadByAttorney: caseloadResponse,
      billing,
      courtCalendar,
      alerts,
      recentActivity: formattedActivity,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

function generateAlerts(data: {
  criticalClients: number
  criticalIssues: number
  overdueActions: number
  expiringDocuments: number
  newCasesPendingIntake: number
  motionsDue7Days: number
}) {
  const alerts: { type: string; message: string; severity: string }[] = []

  if (data.criticalClients > 0) {
    alerts.push({
      type: 'CRITICAL_CLIENTS',
      message: `${data.criticalClients} party/parties classified as critical priority`,
      severity: 'critical',
    })
  }

  if (data.criticalIssues > 0) {
    alerts.push({
      type: 'CRITICAL_ISSUES',
      message: `${data.criticalIssues} critical/high issues require attention`,
      severity: 'high',
    })
  }

  if (data.overdueActions > 0) {
    alerts.push({
      type: 'OVERDUE_ACTIONS',
      message: `${data.overdueActions} action item(s) are overdue`,
      severity: 'high',
    })
  }

  if (data.expiringDocuments > 0) {
    alerts.push({
      type: 'EXPIRING_DOCS',
      message: `${data.expiringDocuments} document(s) expiring within 30 days`,
      severity: 'medium',
    })
  }

  if (data.newCasesPendingIntake > 0) {
    alerts.push({
      type: 'PENDING_INTAKE',
      message: `${data.newCasesPendingIntake} case(s) pending intake review`,
      severity: 'medium',
    })
  }

  if (data.motionsDue7Days > 0) {
    alerts.push({
      type: 'MOTIONS_DUE',
      message: `${data.motionsDue7Days} motion(s) have hearings within 7 days`,
      severity: 'high',
    })
  }

  return alerts
}
