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

const addContactSchema = z.object({
  contactId: z.string().min(1),
  role: z.enum(VALID_ROLES),
  notes: z.string().max(5000).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('contacts', 'view')
  if (denied) return denied

  try {
    const { id: clientId } = await params

    // Verify client (case) exists
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const contacts = await prisma.caseContact.findMany({
      where: { clientId },
      include: {
        contact: {
          include: {
            phones: true,
            emails: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('Error fetching case contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch case contacts' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('contacts', 'create')
  if (denied) return denied

  try {
    const { id: clientId } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validated = addContactSchema.parse(body)

    // Verify client (case) exists
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Verify contact exists
    const contact = await prisma.contact.findUnique({ where: { id: validated.contactId } })
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const caseContact = await prisma.caseContact.create({
      data: {
        clientId,
        contactId: validated.contactId,
        role: validated.role,
        notes: validated.notes,
      },
      include: {
        contact: {
          include: {
            phones: true,
            emails: true,
          },
        },
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
    console.error('Error adding contact to case:', error)
    return NextResponse.json(
      { error: 'Failed to add contact to case' },
      { status: 500 }
    )
  }
}
