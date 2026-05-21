import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'

const VALID_ROLES = [
  'OPPOSING_COUNSEL',
  'PROSECUTOR',
  'CO_COUNSEL',
  'WITNESS',
  'EXPERT_WITNESS',
  'JUDGE',
  'COURT_CLERK',
  'CLIENT',
  'GUARDIAN_AD_LITEM',
  'MEDIATOR',
  'INSURANCE_ADJUSTER',
] as const

const linkCaseSchema = z.object({
  vendorId: z.string().min(1),
  role: z.enum(VALID_ROLES),
  notes: z.string().max(5000).optional(),
})

const unlinkCaseSchema = z.object({
  vendorId: z.string().min(1),
  role: z.enum(VALID_ROLES),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('contacts', 'create')
  if (denied) return denied

  try {
    const { id: contactId } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validated = linkCaseSchema.parse(body)

    // Verify contact exists
    const contact = await prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Verify vendor (case) exists
    const vendor = await prisma.vendor.findUnique({ where: { id: validated.vendorId } })
    if (!vendor) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const caseContact = await prisma.caseContact.create({
      data: {
        contactId,
        vendorId: validated.vendorId,
        role: validated.role,
        notes: validated.notes,
      },
      include: {
        vendor: {
          select: { id: true, name: true, status: true },
        },
        contact: true,
      },
    })

    return NextResponse.json(caseContact, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'This contact is already linked to this case with this role' },
        { status: 409 }
      )
    }
    console.error('Error linking contact to case:', error)
    return NextResponse.json(
      { error: 'Failed to link contact to case' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('contacts', 'delete')
  if (denied) return denied

  try {
    const { id: contactId } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validated = unlinkCaseSchema.parse(body)

    const caseContact = await prisma.caseContact.findFirst({
      where: {
        contactId,
        vendorId: validated.vendorId,
        role: validated.role,
      },
    })

    if (!caseContact) {
      return NextResponse.json(
        { error: 'Case contact link not found' },
        { status: 404 }
      )
    }

    await prisma.caseContact.delete({ where: { id: caseContact.id } })

    return NextResponse.json({ message: 'Contact unlinked from case successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Error unlinking contact from case:', error)
    return NextResponse.json(
      { error: 'Failed to unlink contact from case' },
      { status: 500 }
    )
  }
}
