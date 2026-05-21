import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { sanitizeStrings } from '@/lib/sanitize-input'
import { z } from 'zod'

const updateVendorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  legalName: z.string().max(255).optional(),
  dunsNumber: z.string().max(20).optional(),
  website: z.string().max(500).optional().or(z.literal('')),
  industry: z.string().max(255).optional(),
  country: z.string().max(100).optional(),
  stateProvince: z.string().max(100).optional(),
  primaryContactName: z.string().max(255).optional(),
  primaryContactEmail: z.string().email().max(255).optional().or(z.literal('')),
  primaryContactPhone: z.string().max(50).optional(),
  businessOwner: z.string().max(255).optional(),
  itOwner: z.string().max(255).optional(),
  contractStartDate: z.string().max(30).optional(),
  contractEndDate: z.string().max(30).optional(),
  annualSpend: z.number().optional(),
  status: z.enum(['NEW', 'ACCEPTED', 'ASSIGNED', 'ACTIVE', 'CLOSED', 'INACTIVE', 'PENDING', 'TERMINATED']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('vendors', 'view')
  if (denied) return denied

  try {
    const { id } = await params
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        riskProfiles: {
          orderBy: { createdAt: 'desc' },
        },
        riskAssessments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        documents: {
          where: { isCurrent: true },
          orderBy: { uploadDate: 'desc' },
        },
        riskFindings: {
          where: { status: { not: 'CLOSED' } },
          orderBy: { severity: 'asc' },
        },
        remediationActions: {
          where: { status: { not: 'CLOSED' } },
          orderBy: { dueDate: 'asc' },
        },
      },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    return NextResponse.json(vendor)
  } catch (error) {
    console.error('Error fetching vendor:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('vendors', 'edit')
  if (denied) return denied

  try {
    const { id } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const validated = sanitizeStrings(updateVendorSchema.parse(body))

    const existingVendor = await prisma.vendor.findUnique({
      where: { id },
    })

    if (!existingVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const updateData: any = { ...validated }
    if (validated.contractStartDate) {
      updateData.contractStartDate = new Date(validated.contractStartDate)
    }
    if (validated.contractEndDate) {
      updateData.contractEndDate = new Date(validated.contractEndDate)
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: updateData,
    })

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        action: 'UPDATE',
        entityType: 'Vendor',
        entityId: vendor.id,
        oldValues: existingVendor as any,
        newValues: validated as any,
      },
    })

    return NextResponse.json(vendor)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Error updating vendor:', error)
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('vendors', 'delete')
  if (denied) return denied

  try {
    const { id } = await params
    const vendor = await prisma.vendor.findUnique({
      where: { id },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Soft delete - set status to TERMINATED
    await prisma.vendor.update({
      where: { id },
      data: { status: 'TERMINATED' },
    })

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        action: 'DELETE',
        entityType: 'Vendor',
        entityId: id,
        oldValues: JSON.stringify({ status: vendor.status }),
        newValues: JSON.stringify({ status: 'TERMINATED' }),
      },
    })

    return NextResponse.json({ message: 'Vendor terminated successfully' })
  } catch (error) {
    console.error('Error deleting vendor:', error)
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    )
  }
}
