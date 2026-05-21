import prisma from '@/lib/db'
import { requirePermission, getCurrentUser } from '@/lib/auth'

export async function GET() {
  const denied = await requirePermission('users', 'view')
  if (denied) return denied

  const users = await prisma.user.findMany({
    include: { role: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return Response.json(users)
}

export async function POST(request: Request) {
  const denied = await requirePermission('users', 'create')
  if (denied) return denied

  const body = await request.json()
  const { email, name, roleId } = body

  if (!email || !roleId) {
    return Response.json(
      { error: 'Email and roleId are required' },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return Response.json({ error: 'User already exists' }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: { email, name, roleId },
    include: { role: { select: { id: true, name: true } } },
  })

  const currentUser = await getCurrentUser()
  await prisma.auditTrail.create({
    data: {
      userId: currentUser?.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      newValues: JSON.stringify({ email, name, roleId }),
    },
  })

  return Response.json(user, { status: 201 })
}
