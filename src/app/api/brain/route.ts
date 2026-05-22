import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import { withRequestLog } from '@/lib/request-logger'
import { sanitizeStrings } from '@/lib/sanitize-input'
import { z } from 'zod'
import {
  createMemory,
  searchMemories,
  getStats,
  isBrainEnabled,
  decayMemories,
} from '@/lib/brain-service'

const createSchema = z.object({
  entityType: z.string().max(100).optional(),
  entityId: z.string().max(100).optional(),
  category: z.enum(['preference', 'procedure', 'relationship', 'fact', 'pattern']),
  content: z.string().min(1).max(5000),
  tags: z.array(z.string().max(50)).max(20).optional(),
  expiresAt: z.string().datetime().optional(),
})

export const GET = withRequestLog(async function GET(request: NextRequest) {
  const denied = await requirePermission('brain', 'view')
  if (denied) return denied

  const enabled = await isBrainEnabled()
  if (!enabled) {
    return NextResponse.json({ error: 'Brain layer is not enabled' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const action = searchParams.get('action')

  if (action === 'stats') {
    const stats = await getStats()
    return NextResponse.json(stats)
  }

  if (action === 'decay') {
    const adminDenied = await requirePermission('brain', 'edit')
    if (adminDenied) return adminDenied
    const decayed = await decayMemories()
    return NextResponse.json({ decayed })
  }

  const memories = await searchMemories({
    entityType: searchParams.get('entityType') || undefined,
    entityId: searchParams.get('entityId') || undefined,
    category: searchParams.get('category') || undefined,
    agentName: searchParams.get('agentName') || undefined,
    approvedOnly: searchParams.get('approvedOnly') !== 'false',
    limit: parseInt(searchParams.get('limit') || '50'),
  })

  return NextResponse.json(memories)
})

export const POST = withRequestLog(async function POST(request: NextRequest) {
  const denied = await requirePermission('brain', 'create')
  if (denied) return denied

  const enabled = await isBrainEnabled()
  if (!enabled) {
    return NextResponse.json({ error: 'Brain layer is not enabled' }, { status: 403 })
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const validated = sanitizeStrings(createSchema.parse(body))

    const user = await getCurrentUser()
    const memory = await createMemory({
      ...validated,
      createdBy: user?.name || user?.email || 'unknown',
      isApproved: true,
      expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : undefined,
    })

    return NextResponse.json(memory, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('Error creating brain memory:', error)
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 })
  }
})
