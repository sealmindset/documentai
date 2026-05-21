import prisma from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET() {
  const denied = await requirePermission('roles', 'view')
  if (denied) return denied

  const roles = await prisma.role.findMany({
    include: {
      _count: { select: { users: true } },
      rolePermissions: { select: { permissionId: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return Response.json(roles)
}

export async function POST(request: Request) {
  const denied = await requirePermission('roles', 'create')
  if (denied) return denied

  const body = await request.json()
  const { name, description, permissionIds } = body

  if (!name) {
    return Response.json({ error: 'Name is required' }, { status: 400 })
  }

  const role = await prisma.role.create({
    data: {
      name,
      description,
      isSystem: false,
      rolePermissions: {
        create: (permissionIds || []).map((pid: string) => ({
          permissionId: pid,
        })),
      },
    },
    include: {
      _count: { select: { users: true } },
      rolePermissions: { select: { permissionId: true } },
    },
  })

  return Response.json(role, { status: 201 })
}
