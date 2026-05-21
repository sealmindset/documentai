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

const contactSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
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

export async function GET(request: NextRequest) {
  const denied = await requirePermission('contacts', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          phones: true,
          emails: true,
          _count: {
            select: { caseContacts: true },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.contact.count({ where }),
    ])

    return NextResponse.json({ contacts, total })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const denied = await requirePermission('contacts', 'create')
  if (denied) return denied

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validated = contactSchema.parse(body)
    const { phones, emails, ...contactData } = validated
    const sanitized = sanitizeStrings(contactData)

    const contact = await prisma.$transaction(async (tx) => {
      const created = await tx.contact.create({
        data: {
          ...sanitized,
          phones: phones && phones.length > 0
            ? { create: phones.map((p) => sanitizeStrings({ ...p })) }
            : undefined,
          emails: emails && emails.length > 0
            ? { create: emails.map((e) => sanitizeStrings({ ...e })) }
            : undefined,
        },
        include: {
          phones: true,
          emails: true,
        },
      })
      return created
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
