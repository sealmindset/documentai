/**
 * Shared notification query helpers
 *
 * Used by /api/notifications and /api/notifications/count to build
 * user-scoped WHERE clauses consistently.
 */

import type { Prisma } from '@prisma/client'

const INTERNAL_ROLES = ['ADMIN', 'ANALYST', 'VIEWER']

/**
 * Build a Prisma WHERE clause that scopes notifications to the current user.
 *
 * Internal users see:
 *   - Broadcast INTERNAL notifications (recipientId is null)
 *   - Targeted INTERNAL notifications (recipientId = their user ID)
 *
 * Vendor users: returns null (no user-vendor association yet).
 */
export function buildNotificationWhere(
  userId: string,
  roleName: string
): Prisma.NotificationWhereInput | null {
  if (!INTERNAL_ROLES.includes(roleName)) {
    return null // Vendor users — not wired yet
  }

  return {
    OR: [
      { recipientType: 'INTERNAL', recipientId: null },
      { recipientType: 'INTERNAL', recipientId: userId },
    ],
  }
}

/**
 * Add an unread filter to an existing WHERE clause.
 */
export function withUnreadFilter(
  where: Prisma.NotificationWhereInput
): Prisma.NotificationWhereInput {
  return { ...where, readAt: null }
}
