import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET(request: Request) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const motions = await prisma.document.findMany({
    where: { documentType: { startsWith: 'MOTION' } },
    include: { vendor: { select: { id: true, name: true, businessOwner: true, industry: true } } },
    orderBy: { expirationDate: 'asc' },
  })

  return NextResponse.json({
    motions: motions.map((m) => ({
      id: m.id,
      documentType: m.documentType,
      documentName: m.documentName,
      expirationDate: m.expirationDate?.toISOString() || null,
      status: m.status,
      vendorId: m.vendor.id,
      vendorName: m.vendor.name,
      leadAttorney: m.vendor.businessOwner,
      caseType: m.vendor.industry,
    })),
  })
}
