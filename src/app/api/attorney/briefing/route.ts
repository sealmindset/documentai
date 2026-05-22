import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET() {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    todayEvents,
    urgentDeadlines,
    activeCases,
    recentAlerts,
    caseStats,
  ] = await Promise.all([
    // Today's court dates / calendar events
    prisma.document.findMany({
      where: {
        expirationDate: { gte: todayStart, lt: todayEnd },
        status: { not: 'EXPIRED' },
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { expirationDate: 'asc' },
    }),

    // Urgent: overdue + due within 7 days
    Promise.all([
      prisma.actionItem.findMany({
        where: {
          dueDate: { lte: week },
          status: { notIn: ['CLOSED', 'VERIFIED'] },
        },
        include: {
          client: { select: { id: true, name: true } },
          issue: { select: { title: true, severity: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.issue.findMany({
        where: {
          severity: { in: ['CRITICAL', 'HIGH'] },
          status: { notIn: ['CLOSED', 'RESOLVED'] },
        },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]),

    // Active cases
    prisma.client.findMany({
      where: { status: { in: ['ACTIVE', 'PENDING', 'NEW', 'ACCEPTED', 'ASSIGNED'] } },
      include: {
        clientProfiles: {
          select: { priorityTier: true, overallReviewScore: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            documents: true,
            issues: { where: { status: { notIn: ['CLOSED', 'RESOLVED'] } } },
            actionItems: { where: { status: { notIn: ['CLOSED', 'VERIFIED'] } } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),

    // Recent notifications / alerts
    prisma.notification.findMany({
      where: { readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),

    // Quick stats
    Promise.all([
      prisma.client.count({ where: { status: { in: ['ACTIVE', 'PENDING', 'NEW', 'ACCEPTED', 'ASSIGNED'] } } }),
      prisma.issue.count({ where: { status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
      prisma.actionItem.count({ where: { dueDate: { lte: now }, status: { notIn: ['CLOSED', 'VERIFIED'] } } }),
      prisma.document.count({ where: { status: { in: ['PENDING', 'RECEIVED'] } } }),
    ]),
  ])

  const [urgentActions, criticalIssues] = urgentDeadlines
  const [totalCases, openIssues, overdueActions, pendingDocs] = caseStats

  return NextResponse.json({
    todayEvents: todayEvents.map((d) => ({
      id: d.id,
      title: d.documentName,
      type: d.documentType,
      clientId: d.client.id,
      clientName: d.client.name,
      date: d.expirationDate?.toISOString(),
    })),
    urgent: {
      actions: urgentActions.map((a) => ({
        id: a.id,
        title: a.title,
        dueDate: a.dueDate?.toISOString(),
        isOverdue: a.dueDate ? a.dueDate < now : false,
        clientId: a.client.id,
        clientName: a.client.name,
        severity: a.issue?.severity || 'MEDIUM',
      })),
      issues: criticalIssues.map((i) => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        clientId: i.client.id,
        clientName: i.client.name,
      })),
    },
    cases: activeCases.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      caseNumber: c.dunsNumber,
      court: c.stateProvince,
      priorityTier: c.clientProfiles[0]?.priorityTier || null,
      reviewScore: c.clientProfiles[0]?.overallReviewScore || null,
      openIssues: c._count.issues,
      openActions: c._count.actionItems,
      documents: c._count.documents,
    })),
    alerts: recentAlerts,
    stats: { totalCases, openIssues, overdueActions, pendingDocs },
  })
}
