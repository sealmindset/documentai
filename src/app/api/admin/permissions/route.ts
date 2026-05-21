import prisma from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET() {
  const denied = await requirePermission('roles', 'view')
  if (denied) return denied

  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: 'asc' }, { action: 'asc' }],
  })

  return Response.json(permissions)
}
