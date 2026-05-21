import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'

const templateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['PLEADING', 'CORRESPONDENCE', 'MOTION', 'NOTICE', 'DISCOVERY']),
  subcategory: z.string().max(100).optional(),
  jurisdiction: z.string().max(10).optional(),
  courtType: z.string().max(50).optional(),
  content: z.string().min(1).max(500000),
  format: z.enum(['DOCX', 'PDF', 'TXT']).default('DOCX'),
  requiredFields: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  const denied = await requirePermission('templates', 'view')
  if (denied) return denied

  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { isActive: true }
    if (category) where.category = category
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { subcategory: { contains: search } },
      ]
    }

    const templates = await prisma.documentTemplate.findMany({
      where,
      include: {
        _count: { select: { generatedDocs: true } },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requirePermission('templates', 'create')
  if (denied) return denied

  try {
    const body = await request.json()
    const validated = templateCreateSchema.parse(body)
    const user = await getCurrentUser()

    const template = await prisma.documentTemplate.create({
      data: {
        name: validated.name,
        category: validated.category,
        subcategory: validated.subcategory,
        jurisdiction: validated.jurisdiction,
        courtType: validated.courtType,
        content: validated.content,
        format: validated.format,
        requiredFields: validated.requiredFields ? JSON.stringify(validated.requiredFields) : null,
        createdBy: user?.id,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
