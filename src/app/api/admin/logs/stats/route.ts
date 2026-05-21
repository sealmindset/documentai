import { requirePermission } from '@/lib/auth'
import { logStore } from '@/lib/log-store'

export async function GET() {
  const denied = await requirePermission('logs', 'view')
  if (denied) return denied

  return Response.json(logStore.stats())
}
