import { requirePermission } from '@/lib/auth'
import { getAuditLog } from '@/lib/settings-service'

export async function GET() {
  const denied = await requirePermission('settings', 'view')
  if (denied) return denied

  const logs = await getAuditLog()
  return Response.json(logs)
}
