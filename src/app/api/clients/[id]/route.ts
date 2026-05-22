import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { sanitizeStrings } from '@/lib/sanitize-input'
import { z } from 'zod'

const updateClientSchema = z.object({
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

export const GET = withRequestLog(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('clients', 'view')
  if (denied) return denied

  try {
    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        clientProfiles: {
          orderBy: { createdAt: 'desc' },
        },
        caseReviews: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        documents: {
          where: { isCurrent: true },
          orderBy: { uploadDate: 'desc' },
        },
        issues: {
          where: { status: { not: 'CLOSED' } },
          orderBy: { severity: 'asc' },
        },
        actionItems: {
          where: { status: { not: 'CLOSED' } },
          orderBy: { dueDate: 'asc' },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
})

export const PUT = withRequestLog(async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('clients', 'edit')
  if (denied) return denied

  try {
    const { id } = await params
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const validated = sanitizeStrings(updateClientSchema.parse(body))

    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const updateData: any = { ...validated }
    if (validated.contractStartDate) {
      updateData.contractStartDate = new Date(validated.contractStartDate)
    }
    if (validated.contractEndDate) {
      updateData.contractEndDate = new Date(validated.contractEndDate)
    }

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
    })

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        action: 'UPDATE',
        entityType: 'Client',
        entityId: client.id,
        oldValues: existingClient as any,
        newValues: validated as any,
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
})

export const DELETE = withRequestLog(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('clients', 'delete')
  if (denied) return denied

  try {
    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Soft delete - set status to TERMINATED
    await prisma.client.update({
      where: { id },
      data: { status: 'TERMINATED' },
    })

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        action: 'DELETE',
        entityType: 'Client',
        entityId: id,
        oldValues: JSON.stringify({ status: client.status }),
        newValues: JSON.stringify({ status: 'TERMINATED' }),
      },
    })

    return NextResponse.json({ message: 'Client terminated successfully' })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
})
