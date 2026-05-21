import { requirePermission } from '@/lib/auth'
import { getAllSettings } from '@/lib/settings-service'

export async function GET() {
  const denied = await requirePermission('settings', 'view')
  if (denied) return denied

  const settings = await getAllSettings()
  return Response.json(settings)
}
