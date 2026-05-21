import prisma from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET(request: Request) {
  const denied = await requirePermission('prompts', 'view')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const agentName = searchParams.get('agentName')
  const category = searchParams.get('category')

  const where: Record<string, unknown> = {}
  if (agentName) where.agentName = agentName
  if (category) where.category = category

  const prompts = await prisma.managedPrompt.findMany({
    where,
    include: {
      _count: { select: { versions: true } },
    },
    orderBy: [{ agentName: 'asc' }, { category: 'asc' }, { name: 'asc' }],
  })

  return Response.json(prompts)
}
