import { NextResponse } from 'next/server'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/db'
import { buildNotificationWhere, withUnreadFilter } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications/count — Lightweight unread count for polling
 */
export async function GET() {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ unreadCount: 0 })
  }

  const baseWhere = buildNotificationWhere(user.id, user.roleName)
  if (!baseWhere) {
    return NextResponse.json({ unreadCount: 0 })
  }

  const unreadCount = await prisma.notification.count({
    where: withUnreadFilter(baseWhere),
  })

  return NextResponse.json({ unreadCount })
}
