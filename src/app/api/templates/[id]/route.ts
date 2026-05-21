import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'

const templateUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(['PLEADING', 'CORRESPONDENCE', 'MOTION', 'NOTICE', 'DISCOVERY']).optional(),
  subcategory: z.string().max(100).nullable().optional(),
  jurisdiction: z.string().max(10).nullable().optional(),
  courtType: z.string().max(50).nullable().optional(),
  content: z.string().min(1).max(500000).optional(),
  format: z.enum(['DOCX', 'PDF', 'TXT']).optional(),
  requiredFields: z.array(z.string()).nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('templates', 'view')
  if (denied) return denied

  const { id } = await params

  try {
    const template = await prisma.documentTemplate.findUnique({
      where: { id },
      include: {
        _count: { select: { generatedDocs: true } },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('templates', 'edit')
  if (denied) return denied

  const { id } = await params

  try {
    const body = await request.json()
    const validated = templateUpdateSchema.parse(body)

    const existing = await prisma.documentTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (validated.name !== undefined) data.name = validated.name
    if (validated.category !== undefined) data.category = validated.category
    if (validated.subcategory !== undefined) data.subcategory = validated.subcategory
    if (validated.jurisdiction !== undefined) data.jurisdiction = validated.jurisdiction
    if (validated.courtType !== undefined) data.courtType = validated.courtType
    if (validated.format !== undefined) data.format = validated.format
    if (validated.isActive !== undefined) data.isActive = validated.isActive
    if (validated.requiredFields !== undefined) {
      data.requiredFields = validated.requiredFields ? JSON.stringify(validated.requiredFields) : null
    }

    if (validated.content !== undefined && validated.content !== existing.content) {
      data.content = validated.content
      data.version = existing.version + 1
    }

    const template = await prisma.documentTemplate.update({
      where: { id },
      data,
    })

    return NextResponse.json(template)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('templates', 'delete')
  if (denied) return denied

  const { id } = await params

  try {
    await prisma.documentTemplate.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
