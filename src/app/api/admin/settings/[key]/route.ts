import { NextRequest } from 'next/server'
import { getCurrentUser, requirePermission } from '@/lib/auth'
import { updateSetting, revealSetting } from '@/lib/settings-service'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const denied = await requirePermission('settings', 'edit')
  if (denied) return denied

  const { key } = await params
  const user = await getCurrentUser()
  const body = await request.json()

  try {
    const updated = await updateSetting(key, body.value, user?.email || 'unknown')
    return Response.json(updated)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 404 }
    )
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const denied = await requirePermission('settings', 'edit')
  if (denied) return denied

  const { key } = await params
  try {
    const value = await revealSetting(key)
    return Response.json({ key, value })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Not found' },
      { status: 404 }
    )
  }
}
