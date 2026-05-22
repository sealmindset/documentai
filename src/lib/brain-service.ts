import prisma from '@/lib/db'

export interface BrainMemoryInput {
  agentName?: string
  entityType?: string
  entityId?: string
  category: string
  content: string
  tags?: string[]
  confidence?: number
  source?: string
  createdBy?: string
  isApproved?: boolean
  expiresAt?: Date
}

export interface BrainSearchParams {
  entityType?: string
  entityId?: string
  category?: string
  agentName?: string
  tags?: string[]
  approvedOnly?: boolean
  limit?: number
}

export type BrainCategory = 'preference' | 'procedure' | 'relationship' | 'fact' | 'pattern'

export async function isBrainEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'brain.enabled' },
    })
    return setting?.value === 'true'
  } catch {
    return false
  }
}

export async function createMemory(input: BrainMemoryInput) {
  return prisma.brainMemory.create({
    data: {
      agentName: input.agentName,
      entityType: input.entityType,
      entityId: input.entityId,
      category: input.category,
      content: input.content,
      tags: JSON.stringify(input.tags || []),
      confidence: input.confidence ?? 1.0,
      source: input.source,
      createdBy: input.createdBy,
      isApproved: input.isApproved ?? !input.agentName,
      expiresAt: input.expiresAt,
    },
  })
}

export async function getMemory(id: string) {
  const memory = await prisma.brainMemory.findUnique({ where: { id } })
  if (memory) {
    await prisma.brainMemory.update({
      where: { id },
      data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
    })
  }
  return memory
}

export async function updateMemory(id: string, updates: Partial<BrainMemoryInput> & { isArchived?: boolean }) {
  return prisma.brainMemory.update({
    where: { id },
    data: {
      ...(updates.content !== undefined && { content: updates.content }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.tags !== undefined && { tags: JSON.stringify(updates.tags) }),
      ...(updates.confidence !== undefined && { confidence: updates.confidence }),
      ...(updates.isApproved !== undefined && { isApproved: updates.isApproved }),
      ...(updates.isArchived !== undefined && { isArchived: updates.isArchived }),
      ...(updates.expiresAt !== undefined && { expiresAt: updates.expiresAt }),
    },
  })
}

export async function deleteMemory(id: string) {
  return prisma.brainMemory.delete({ where: { id } })
}

export async function searchMemories(params: BrainSearchParams) {
  const where: Record<string, unknown> = {
    isArchived: false,
  }

  if (params.approvedOnly !== false) {
    where.isApproved = true
  }

  if (params.entityType) where.entityType = params.entityType
  if (params.entityId) where.entityId = params.entityId
  if (params.category) where.category = params.category
  if (params.agentName) where.agentName = params.agentName

  // Exclude expired memories
  where.OR = [
    { expiresAt: null },
    { expiresAt: { gt: new Date() } },
  ]

  const memories = await prisma.brainMemory.findMany({
    where,
    orderBy: [{ confidence: 'desc' }, { accessCount: 'desc' }, { updatedAt: 'desc' }],
    take: params.limit || 20,
  })

  // Tag-based filtering (post-query since tags are JSON strings)
  if (params.tags && params.tags.length > 0) {
    return memories.filter((m) => {
      const memTags = JSON.parse(m.tags) as string[]
      return params.tags!.some((t) => memTags.includes(t))
    })
  }

  return memories
}

export async function getContextForEntity(entityType: string, entityId: string, limit = 10): Promise<string> {
  const memories = await searchMemories({
    entityType,
    entityId,
    approvedOnly: true,
    limit,
  })

  if (memories.length === 0) return ''

  const lines = memories.map((m) => `- [${m.category}] ${m.content}`)
  return `\n\n--- BRAIN CONTEXT (${entityType} ${entityId}) ---\n${lines.join('\n')}\n--- END BRAIN CONTEXT ---`
}

export async function getContextForAgent(agentName: string, entityType?: string, entityId?: string, limit = 10): Promise<string> {
  const parts: string[] = []

  // Agent-specific memories
  const agentMemories = await searchMemories({ agentName, limit: Math.ceil(limit / 2) })
  if (agentMemories.length > 0) {
    parts.push(...agentMemories.map((m) => `- [${m.category}] ${m.content}`))
  }

  // Entity-specific memories (if applicable)
  if (entityType && entityId) {
    const entityMemories = await searchMemories({
      entityType,
      entityId,
      limit: Math.ceil(limit / 2),
    })
    if (entityMemories.length > 0) {
      parts.push(...entityMemories.map((m) => `- [${m.category}] ${m.content}`))
    }
  }

  if (parts.length === 0) return ''

  // Update access counts
  const allIds = [...new Set([
    ...agentMemories.map((m) => m.id),
    ...(entityType && entityId ? (await searchMemories({ entityType, entityId, limit })).map((m) => m.id) : []),
  ])]

  if (allIds.length > 0) {
    await prisma.brainMemory.updateMany({
      where: { id: { in: allIds } },
      data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
    })
  }

  return `\n\n--- BRAIN CONTEXT ---\n${[...new Set(parts)].join('\n')}\n--- END BRAIN CONTEXT ---`
}

export async function decayMemories(): Promise<number> {
  const DECAY_RATE = 0.02
  const STALE_THRESHOLD_DAYS = 30
  const ARCHIVE_THRESHOLD = 0.2

  const staleDate = new Date()
  staleDate.setDate(staleDate.getDate() - STALE_THRESHOLD_DAYS)

  const staleMemories = await prisma.brainMemory.findMany({
    where: {
      isArchived: false,
      lastAccessedAt: { lt: staleDate },
    },
  })

  let decayed = 0
  for (const memory of staleMemories) {
    const newConfidence = Math.max(0, memory.confidence - DECAY_RATE)
    if (newConfidence < ARCHIVE_THRESHOLD) {
      await prisma.brainMemory.update({
        where: { id: memory.id },
        data: { confidence: newConfidence, isArchived: true },
      })
    } else {
      await prisma.brainMemory.update({
        where: { id: memory.id },
        data: { confidence: newConfidence },
      })
    }
    decayed++
  }

  return decayed
}

export async function getStats() {
  const [total, approved, pending, archived, byCategory, byAgent] = await Promise.all([
    prisma.brainMemory.count({ where: { isArchived: false } }),
    prisma.brainMemory.count({ where: { isApproved: true, isArchived: false } }),
    prisma.brainMemory.count({ where: { isApproved: false, isArchived: false } }),
    prisma.brainMemory.count({ where: { isArchived: true } }),
    prisma.brainMemory.groupBy({
      by: ['category'],
      _count: true,
      where: { isArchived: false },
    }),
    prisma.brainMemory.groupBy({
      by: ['agentName'],
      _count: true,
      where: { isArchived: false },
    }),
  ])

  return {
    total,
    approved,
    pending,
    archived,
    byCategory: byCategory.reduce((acc, r) => ({ ...acc, [r.category]: r._count }), {} as Record<string, number>),
    byAgent: byAgent.reduce((acc, r) => ({ ...acc, [r.agentName || 'User']: r._count }), {} as Record<string, number>),
  }
}
