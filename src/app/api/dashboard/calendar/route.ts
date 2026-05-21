import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET(request: Request) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  const now = new Date()
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

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
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  const events = [
    ...documents.map((d) => ({
      id: d.id,
      date: d.expirationDate!.toISOString(),
      type: d.documentType.startsWith('MOTION') ? 'motion_hearing' : 'document_deadline',
      title: d.documentName,
      vendorId: d.vendor.id,
      vendorName: d.vendor.name,
      status: d.status,
    })),
    ...findings.map((f) => ({
      id: f.id,
      date: f.dueDate!.toISOString(),
      type: 'issue_deadline',
      title: f.title,
      vendorId: f.vendor.id,
      vendorName: f.vendor.name,
      status: f.status,
    })),
    ...actions.map((a) => ({
      id: a.id,
      date: a.dueDate!.toISOString(),
      type: 'action_deadline',
      title: a.title,
      vendorId: a.vendor.id,
      vendorName: a.vendor.name,
      status: a.status,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return NextResponse.json({ events })
}
