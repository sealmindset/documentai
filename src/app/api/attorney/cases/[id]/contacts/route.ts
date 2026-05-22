import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { sanitizeStrings } from '@/lib/sanitize-input'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const VALID_ROLES = [
  'OPPOSING_COUNSEL', 'PROSECUTOR', 'CO_COUNSEL', 'WITNESS',
  'EXPERT_WITNESS', 'JUDGE', 'COURT_CLERK', 'CLIENT',
  'GUARDIAN_AD_LITEM', 'MEDIATOR', 'INSURANCE_ADJUSTER',
] as const

const phoneSchema = z.object({
  phone: z.string().min(1).max(50),
  type: z.enum(['BUSINESS', 'HOME', 'CELLULAR', 'FAX', 'COURT']).default('BUSINESS'),
  isPrimary: z.boolean().default(false),
})

const emailSchema = z.object({
  email: z.string().email().max(255),
  type: z.enum(['BUSINESS', 'PERSONAL', 'COURT']).default('BUSINESS'),
  isPrimary: z.boolean().default(false),
})

const createAndLinkSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  organization: z.string().max(255).optional(),
  title: z.string().max(255).optional(),
  role: z.enum(VALID_ROLES),
  notes: z.string().max(5000).optional(),
  phones: z.array(phoneSchema).optional(),
  emails: z.array(emailSchema).optional(),
})

const linkExistingSchema = z.object({
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

  const { id: clientId } = await params
  const search = request.nextUrl.searchParams.get('search')

  if (search) {
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { organization: { contains: search, mode: 'insensitive' } },
        ],
        NOT: {
          caseContacts: { some: { clientId } },
        },
      },
      include: { phones: true, emails: true },
      take: 10,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
    return NextResponse.json({ contacts })
  }

  const contacts = await prisma.caseContact.findMany({
    where: { clientId },
    include: {
      contact: { include: { phones: true, emails: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ contacts })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('contacts', 'create')
  if (denied) return denied

  const { id: clientId } = await params

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>

  try {
    if (raw.contactId) {
      const validated = linkExistingSchema.parse(raw)
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
        include: { contact: { include: { phones: true, emails: true } } },
      })

      return NextResponse.json(caseContact, { status: 201 })
    }

    const validated = createAndLinkSchema.parse(raw)
    const { phones, emails, role, notes, ...contactData } = validated
    const sanitized = sanitizeStrings(contactData)

    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data: {
          ...sanitized,
          phones: phones?.length ? { create: phones.map((p) => sanitizeStrings({ ...p })) } : undefined,
          emails: emails?.length ? { create: emails.map((e) => sanitizeStrings({ ...e })) } : undefined,
        },
        include: { phones: true, emails: true },
      })

      const caseContact = await tx.caseContact.create({
        data: { clientId, contactId: contact.id, role, notes },
        include: { contact: { include: { phones: true, emails: true } } },
      })

      return caseContact
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'This contact is already linked to this case with this role' },
        { status: 409 }
      )
    }
    console.error('Error adding contact:', error)
    return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 })
  }
}
