import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { sanitizeStrings } from '@/lib/sanitize-input'
import { z } from 'zod'

const vendorSchema = z.object({
  name: z.string().min(1).max(255),
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
})

export async function GET(request: NextRequest) {
  const denied = await requirePermission('vendors', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const riskTier = searchParams.get('riskTier')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          riskProfiles: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              riskFindings: { where: { status: { not: 'CLOSED' } } },
              documents: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vendor.count({ where }),
    ])

    // Filter by risk tier if specified (post-query filter due to relation)
    let filteredVendors = vendors
    if (riskTier) {
      filteredVendors = vendors.filter(
        (v) => v.riskProfiles[0]?.riskTier === riskTier
      )
    }

    return NextResponse.json({
      vendors: filteredVendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const denied = await requirePermission('vendors', 'create')
  if (denied) return denied

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const validated = sanitizeStrings(vendorSchema.parse(body))

    const vendor = await prisma.vendor.create({
      data: {
        name: validated.name,
        legalName: validated.legalName,
        dunsNumber: validated.dunsNumber,
        website: validated.website || null,
        industry: validated.industry,
        country: validated.country,
        stateProvince: validated.stateProvince,
        primaryContactName: validated.primaryContactName,
        primaryContactEmail: validated.primaryContactEmail || null,
        primaryContactPhone: validated.primaryContactPhone,
        businessOwner: validated.businessOwner,
        itOwner: validated.itOwner,
        contractStartDate: validated.contractStartDate
          ? new Date(validated.contractStartDate)
          : null,
        contractEndDate: validated.contractEndDate
          ? new Date(validated.contractEndDate)
          : null,
        annualSpend: validated.annualSpend,
        status: 'NEW',
      },
    })

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        action: 'CREATE',
        entityType: 'Vendor',
        entityId: vendor.id,
        newValues: JSON.stringify(validated),
      },
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Error creating vendor:', error)
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    )
  }
}
