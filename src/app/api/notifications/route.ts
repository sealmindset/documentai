import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/db'
import { buildNotificationWhere, withUnreadFilter } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications — List notifications for the current user
 * Query params: status=UNREAD (optional), limit (default 20), offset (default 0)
 */
export async function GET(request: NextRequest) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseWhere = buildNotificationWhere(user.id, user.roleName)
  if (!baseWhere) {
    return NextResponse.json({ notifications: [], unreadCount: 0, total: 0 })
  }

  const searchParams = request.nextUrl.searchParams
  const statusFilter = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const where = statusFilter === 'UNREAD' ? withUnreadFilter(baseWhere) : baseWhere

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: withUnreadFilter(baseWhere) }),
  ])

  return NextResponse.json({ notifications, unreadCount, total })
}

/**
 * PATCH /api/notifications — Mark notifications as read
 * Body: { ids: string[] } or { markAllRead: true }
 */
export async function PATCH(request: NextRequest) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseWhere = buildNotificationWhere(user.id, user.roleName)
  if (!baseWhere) {
    return NextResponse.json({ updated: 0 })
  }

  const body = await request.json()
  const { ids, markAllRead } = body as { ids?: string[]; markAllRead?: boolean }

  let where: Parameters<typeof prisma.notification.updateMany>[0]['where']

  if (markAllRead) {
    where = { ...withUnreadFilter(baseWhere) }
  } else if (ids && ids.length > 0) {
    where = { ...baseWhere, id: { in: ids }, readAt: null }
  } else {
    return NextResponse.json({ error: 'Provide ids or markAllRead' }, { status: 400 })
  }

  const result = await prisma.notification.updateMany({
    where,
    data: { readAt: new Date(), status: 'READ' },
  })

  return NextResponse.json({ updated: result.count })
}
