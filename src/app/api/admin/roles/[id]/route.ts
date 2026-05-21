import prisma from '@/lib/db'
import { requirePermission, getCurrentUser } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('roles', 'view')
  if (denied) return denied

  const { id } = await params
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true } },
      rolePermissions: { include: { permission: true } },
    },
  })

  if (!role) {
    return Response.json({ error: 'Role not found' }, { status: 404 })
  }

  return Response.json(role)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('roles', 'edit')
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  // Update permission assignments
  if (body.permissionIds) {
    // Delete existing and recreate
    await prisma.rolePermission.deleteMany({ where: { roleId: id } })
    await prisma.rolePermission.createMany({
      data: body.permissionIds.map((pid: string) => ({
        roleId: id,
        permissionId: pid,
      })),
    })
  }

  // Update name/description for custom roles
  const role = await prisma.role.findUnique({ where: { id } })
  if (role && !role.isSystem) {
    if (body.name) await prisma.role.update({ where: { id }, data: { name: body.name } })
    if (body.description !== undefined)
      await prisma.role.update({ where: { id }, data: { description: body.description } })
  }

  const updated = await prisma.role.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true } },
      rolePermissions: { select: { permissionId: true } },
    },
  })

  const currentUser = await getCurrentUser()
  await prisma.auditTrail.create({
    data: {
      userId: currentUser?.id,
      action: 'UPDATE',
      entityType: 'Role',
      entityId: id,
      newValues: JSON.stringify(body),
    },
  })

  return Response.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('roles', 'delete')
  if (denied) return denied

  const { id } = await params
  const role = await prisma.role.findUnique({ where: { id } })

  if (!role) {
    return Response.json({ error: 'Role not found' }, { status: 404 })
  }

  if (role.isSystem) {
    return Response.json(
      { error: 'System roles cannot be deleted' },
      { status: 400 }
    )
  }

  // Reassign users to VIEWER role before deleting
  const viewerRole = await prisma.role.findUnique({ where: { name: 'VIEWER' } })
  if (viewerRole) {
    await prisma.user.updateMany({
      where: { roleId: id },
      data: { roleId: viewerRole.id },
    })
  }

  await prisma.rolePermission.deleteMany({ where: { roleId: id } })
  await prisma.role.delete({ where: { id } })

  const currentUser = await getCurrentUser()
  await prisma.auditTrail.create({
    data: {
      userId: currentUser?.id,
      action: 'DELETE',
      entityType: 'Role',
      entityId: id,
      oldValues: JSON.stringify({ name: role.name }),
    },
  })

  return Response.json({ message: 'Role deleted' })
}
