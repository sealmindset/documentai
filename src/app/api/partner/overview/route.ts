import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(_request: NextRequest) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  try {
    const now = new Date()
    const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const day31 = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)
    const day90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    const day91 = new Date(now.getTime() + 91 * 24 * 60 * 60 * 1000)
    const day180 = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    const day7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      clientsByStatus,
      clientsWithIndustry,
      totalCases,
      openIssues,
      overdueActionsCount,
      pendingDocs,
      docDeadline30,
      docDeadline90,
      docDeadline180,
      issueDeadline30,
      issueDeadline90,
      issueDeadline180,
      actionDeadline30,
      actionDeadline90,
      actionDeadline180,
      caseloadByAttorney,
      billingTotal,
      billingByStatus,
      motions,
      calendarDocuments,
      calendarIssues,
      calendarActions,
      criticalClients,
      overdueActions,
      expiringDocuments,
      criticalIssues,
      newCasesPendingIntake,
      motionsDue7Days,
      recentActivity,
      attorneyWorkload,
    ] = await Promise.all([
      prisma.client.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.client.findMany({ select: { industry: true } }),
      prisma.client.count({ where: { status: { in: ['ACTIVE', 'PENDING', 'NEW', 'ACCEPTED', 'ASSIGNED'] } } }),
      prisma.issue.count({ where: { status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
      prisma.actionItem.count({ where: { dueDate: { lte: now }, status: { notIn: ['CLOSED', 'VERIFIED'] } } }),
      prisma.document.count({ where: { status: { in: ['PENDING', 'RECEIVED'] } } }),
      prisma.document.count({ where: { expirationDate: { gte: now, lte: day30 }, status: { not: 'EXPIRED' } } }),
      prisma.document.count({ where: { expirationDate: { gte: day31, lte: day90 }, status: { not: 'EXPIRED' } } }),
      prisma.document.count({ where: { expirationDate: { gte: day91, lte: day180 }, status: { not: 'EXPIRED' } } }),
      prisma.issue.count({ where: { dueDate: { gte: now, lte: day30 }, status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
      prisma.issue.count({ where: { dueDate: { gte: day31, lte: day90 }, status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
      prisma.issue.count({ where: { dueDate: { gte: day91, lte: day180 }, status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
      prisma.actionItem.count({ where: { dueDate: { gte: now, lte: day30 }, status: { notIn: ['CLOSED', 'VERIFIED'] } } }),
      prisma.actionItem.count({ where: { dueDate: { gte: day31, lte: day90 }, status: { notIn: ['CLOSED', 'VERIFIED'] } } }),
      prisma.actionItem.count({ where: { dueDate: { gte: day91, lte: day180 }, status: { notIn: ['CLOSED', 'VERIFIED'] } } }),
      prisma.client.groupBy({
        by: ['businessOwner'],
        where: { status: { notIn: ['CLOSED'] }, businessOwner: { not: null } },
        _count: { _all: true },
      }),
      prisma.client.aggregate({ _sum: { annualSpend: true } }),
      prisma.client.groupBy({ by: ['status'], _sum: { annualSpend: true } }),
      prisma.document.findMany({
        where: { documentType: { startsWith: 'MOTION' } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { expirationDate: 'asc' },
      }),
      prisma.document.findMany({
        where: { expirationDate: { gte: now, lte: day30 }, status: { not: 'EXPIRED' } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { expirationDate: 'asc' },
      }),
      prisma.issue.findMany({
        where: { dueDate: { gte: now, lte: day30 }, status: { notIn: ['CLOSED', 'RESOLVED'] } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.actionItem.findMany({
        where: { dueDate: { gte: now, lte: day30 }, status: { notIn: ['CLOSED', 'VERIFIED'] } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.clientProfile.count({ where: { priorityTier: 'CRITICAL', client: { status: 'ACTIVE' } } }),
      prisma.actionItem.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, dueDate: { lt: now } } }),
      prisma.document.count({ where: { expirationDate: { lte: day30, gt: now }, status: { not: 'EXPIRED' } } }),
      prisma.issue.count({ where: { severity: { in: ['CRITICAL', 'HIGH'] }, status: { not: 'CLOSED' } } }),
      prisma.client.count({ where: { status: 'NEW', createdAt: { lt: day7ago } } }),
      prisma.document.count({ where: { documentType: { startsWith: 'MOTION' }, expirationDate: { gte: now, lte: day7 } } }),
      prisma.agentActivityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, agentName: true, activityType: true, actionTaken: true, status: true, createdAt: true },
      }),
      // Attorney workload: cases + open issues + overdue actions per attorney
      prisma.client.findMany({
        where: { status: { notIn: ['CLOSED'] }, businessOwner: { not: null } },
        select: {
          businessOwner: true,
          _count: {
            select: {
              issues: { where: { status: { notIn: ['CLOSED', 'RESOLVED'] } } },
              actionItems: { where: { dueDate: { lte: now }, status: { notIn: ['CLOSED', 'VERIFIED'] } } },
            },
          },
        },
      }),
    ])

    // Pipeline
    const pipelineStatuses = ['NEW', 'ACCEPTED', 'ASSIGNED', 'ACTIVE', 'CLOSED'] as const
    const pipeline: Record<string, number> = {}
    for (const s of pipelineStatuses) pipeline[s] = 0
    for (const item of clientsByStatus) pipeline[item.status] = (pipeline[item.status] || 0) + item._count._all

    // Cases by type
    const categoryMap: Record<string, number> = {}
    for (const v of clientsWithIndustry) {
      const category = v.industry?.split(' — ')[0]?.trim() || 'Unknown'
      categoryMap[category] = (categoryMap[category] || 0) + 1
    }
    const casesByType = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    // Deadlines
    const deadlines = {
      next30: docDeadline30 + issueDeadline30 + actionDeadline30,
      next90: docDeadline90 + issueDeadline90 + actionDeadline90,
      next180: docDeadline180 + issueDeadline180 + actionDeadline180,
    }

    // Motions
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

    // Caseload
    const caseloadResponse = caseloadByAttorney
      .map((item) => ({ attorney: item.businessOwner!, count: item._count._all }))
      .sort((a, b) => b.count - a.count)

    // Billing
    const totalFees = Number(billingTotal._sum.annualSpend || 0)
    const activeStatuses = ['NEW', 'ACCEPTED', 'ASSIGNED', 'ACTIVE']
    let activeFees = 0
    let closedFees = 0
    const byStatus = billingByStatus.map((item) => {
      const total = Number(item._sum.annualSpend || 0)
      if (item.status === 'CLOSED') closedFees += total
      else if (activeStatuses.includes(item.status)) activeFees += total
      return { status: item.status, total }
    })

    // Court calendar
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

    // Alerts
    const alerts: { type: string; message: string; severity: string }[] = []
    if (criticalClients > 0) alerts.push({ type: 'CRITICAL_CLIENTS', message: `${criticalClients} case(s) classified as critical priority`, severity: 'critical' })
    if (criticalIssues > 0) alerts.push({ type: 'CRITICAL_ISSUES', message: `${criticalIssues} critical/high issues require attention`, severity: 'high' })
    if (overdueActions > 0) alerts.push({ type: 'OVERDUE_ACTIONS', message: `${overdueActions} action item(s) are overdue`, severity: 'high' })
    if (expiringDocuments > 0) alerts.push({ type: 'EXPIRING_DOCS', message: `${expiringDocuments} document(s) expiring within 30 days`, severity: 'medium' })
    if (newCasesPendingIntake > 0) alerts.push({ type: 'PENDING_INTAKE', message: `${newCasesPendingIntake} case(s) pending intake review`, severity: 'medium' })
    if (motionsDue7Days > 0) alerts.push({ type: 'MOTIONS_DUE', message: `${motionsDue7Days} motion(s) have hearings within 7 days`, severity: 'high' })

    // Attorney workload (aggregated)
    const workloadMap: Record<string, { cases: number; openIssues: number; overdueActions: number }> = {}
    for (const c of attorneyWorkload) {
      const name = c.businessOwner!
      if (!workloadMap[name]) workloadMap[name] = { cases: 0, openIssues: 0, overdueActions: 0 }
      workloadMap[name].cases += 1
      workloadMap[name].openIssues += c._count.issues
      workloadMap[name].overdueActions += c._count.actionItems
    }
    const workload = Object.entries(workloadMap)
      .map(([attorney, data]) => ({ attorney, ...data }))
      .sort((a, b) => b.cases - a.cases)

    return NextResponse.json({
      stats: { totalCases, openIssues, overdueActions: overdueActionsCount, pendingDocs },
      pipeline,
      casesByType,
      deadlines,
      motions: motionsResponse,
      caseloadByAttorney: caseloadResponse,
      billing: { totalFees, activeFees, closedFees, byStatus },
      courtCalendar,
      alerts,
      recentActivity: recentActivity.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
      workload,
    })
  } catch (error) {
    console.error('Partner overview error:', error)
    return NextResponse.json({ error: 'Failed to load firm overview' }, { status: 500 })
  }
}
