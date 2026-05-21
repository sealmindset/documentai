import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { sanitizeStrings } from '@/lib/sanitize-input'
import { z } from 'zod'

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

const updateContactSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  organization: z.string().max(255).optional(),
  title: z.string().max(255).optional(),
  streetAddress: z.string().max(500).optional(),
  city: z.string().max(255).optional(),
  state: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
  notes: z.string().max(5000).optional(),
  phones: z.array(phoneSchema).optional(),
  emails: z.array(emailSchema).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('contacts', 'view')
  if (denied) return denied

  try {
    const { id } = await params

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        phones: true,
        emails: true,
        caseContacts: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                status: true,
                industry: true,
                dunsNumber: true,
              },
            },
          },
        },
      },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('contacts', 'edit')
  if (denied) return denied

  try {
    const { id } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validated = updateContactSchema.parse(body)
    const { phones, emails, ...contactData } = validated
    const sanitized = sanitizeStrings(contactData)

    const existing = await prisma.contact.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const contact = await prisma.$transaction(async (tx) => {
      // Delete existing phones and emails if new arrays are provided (replace strategy)
      if (phones !== undefined) {
        await tx.contactPhone.deleteMany({ where: { contactId: id } })
      }
      if (emails !== undefined) {
        await tx.contactEmail.deleteMany({ where: { contactId: id } })
      }

      const updated = await tx.contact.update({
        where: { id },
        data: {
          ...sanitized,
          phones: phones !== undefined
            ? { create: phones.map((p) => sanitizeStrings({ ...p })) }
            : undefined,
          emails: emails !== undefined
            ? { create: emails.map((e) => sanitizeStrings({ ...e })) }
            : undefined,
        },
        include: {
          phones: true,
          emails: true,
        },
      })

      return updated
    })

    return NextResponse.json(contact)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: 'Failed to update contact' },
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
    const { id } = await params

    const contact = await prisma.contact.findUnique({ where: { id } })
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    await prisma.contact.delete({ where: { id } })

    return NextResponse.json({ message: 'Contact deleted successfully' })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}
