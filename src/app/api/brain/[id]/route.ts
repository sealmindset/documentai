import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { withRequestLog } from '@/lib/request-logger'
import { sanitizeStrings } from '@/lib/sanitize-input'
import { z } from 'zod'
import { getMemory, updateMemory, deleteMemory, isBrainEnabled } from '@/lib/brain-service'

const updateSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  category: z.enum(['preference', 'procedure', 'relationship', 'fact', 'pattern']).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  confidence: z.number().min(0).max(1).optional(),
  isApproved: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

export const GET = withRequestLog(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('brain', 'view')
  if (denied) return denied

  const enabled = await isBrainEnabled()
  if (!enabled) {
    return NextResponse.json({ error: 'Brain layer is not enabled' }, { status: 403 })
  }

  const { id } = await params
  const memory = await getMemory(id)

  if (!memory) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  }

  return NextResponse.json(memory)
})

export const PUT = withRequestLog(async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('brain', 'edit')
  if (denied) return denied

  const enabled = await isBrainEnabled()
  if (!enabled) {
    return NextResponse.json({ error: 'Brain layer is not enabled' }, { status: 403 })
  }

  const { id } = await params

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const validated = sanitizeStrings(updateSchema.parse(body))

    const memory = await updateMemory(id, {
      ...validated,
      expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : validated.expiresAt === null ? undefined : undefined,
    })

    return NextResponse.json(memory)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Error updating brain memory:', error)
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
  }
})

export const DELETE = withRequestLog(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('brain', 'delete')
  if (denied) return denied

  const enabled = await isBrainEnabled()
  if (!enabled) {
    return NextResponse.json({ error: 'Brain layer is not enabled' }, { status: 403 })
  }

  const { id } = await params

  try {
    await deleteMemory(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting brain memory:', error)
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
  }
})
