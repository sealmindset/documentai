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
  const [documents, findings, actions] = await Promise.all([
    prisma.document.findMany({
      where: { expirationDate: { gte: now, lte: cutoff }, status: { not: 'EXPIRED' } },
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: { expirationDate: 'asc' },
    }),
    prisma.riskFinding.findMany({
      where: { dueDate: { gte: now, lte: cutoff }, status: { notIn: ['CLOSED', 'RESOLVED'] } },
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.remediationAction.findMany({
      where: { dueDate: { gte: now, lte: cutoff }, status: { notIn: ['CLOSED', 'VERIFIED'] } },
      include: { vendor: { select: { id: true, name: true } }, finding: { select: { title: true } } },
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
      vendorId: d.vendor.id,
      vendorName: d.vendor.name,
      status: d.status,
      documentType: d.documentType,
      severity: null,
      priority: null,
    })),
    ...findings.map((f) => ({
      id: f.id,
      type: 'finding' as const,
      title: f.title,
      dueDate: f.dueDate!.toISOString(),
      vendorId: f.vendor.id,
      vendorName: f.vendor.name,
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
      vendorId: a.vendor.id,
      vendorName: a.vendor.name,
      status: a.status,
      documentType: null,
      severity: null,
      priority: a.priority,
    })),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  return NextResponse.json({ deadlines })
}
