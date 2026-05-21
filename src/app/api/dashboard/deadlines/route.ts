import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET(request: Request) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '180')

  const now = new Date()
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  // Fetch all three sources in parallel
  const [documents, issues, actions] = await Promise.all([
    prisma.document.findMany({
      where: { expirationDate: { gte: now, lte: cutoff }, status: { not: 'EXPIRED' } },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { expirationDate: 'asc' },
    }),
    prisma.issue.findMany({
      where: { dueDate: { gte: now, lte: cutoff }, status: { notIn: ['CLOSED', 'RESOLVED'] } },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.actionItem.findMany({
      where: { dueDate: { gte: now, lte: cutoff }, status: { notIn: ['CLOSED', 'VERIFIED'] } },
      include: { client: { select: { id: true, name: true } }, issue: { select: { title: true } } },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  // Normalize into unified shape
  const deadlines = [
    ...documents.map((d) => ({
      id: d.id,
      type: 'document' as const,
      title: d.documentName,
      dueDate: d.expirationDate!.toISOString(),
      clientId: d.client.id,
      clientName: d.client.name,
      status: d.status,
      documentType: d.documentType,
      severity: null,
      priority: null,
    })),
    ...issues.map((f) => ({
      id: f.id,
      type: 'issue' as const,
      title: f.title,
      dueDate: f.dueDate!.toISOString(),
      clientId: f.client.id,
      clientName: f.client.name,
      status: f.status,
      documentType: null,
      severity: f.severity,
      priority: null,
    })),
    ...actions.map((a) => ({
      id: a.id,
      type: 'action' as const,
      title: a.title,
      dueDate: a.dueDate!.toISOString(),
      clientId: a.client.id,
      clientName: a.client.name,
      status: a.status,
      documentType: null,
      severity: null,
      priority: a.priority,
    })),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  return NextResponse.json({ deadlines })
}
