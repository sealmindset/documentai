import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { fullSync, isOutlookSyncEnabled } from '@/lib/outlook-calendar'

export async function POST() {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  if (!isOutlookSyncEnabled()) {
    return NextResponse.json(
      { error: 'Outlook sync is not configured. Set M365_CALENDAR_SYNC_ENABLED=true and ensure M365 credentials are set.' },
      { status: 400 }
    )
  }

  try {
    const result = await fullSync()
    return NextResponse.json({
      success: true,
      pushed: result.pushed,
      pulled: result.pulled,
      syncedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Sync failed', detail: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  return NextResponse.json({
    enabled: isOutlookSyncEnabled(),
    calendarUser: process.env.M365_CALENDAR_USER_EMAIL || process.env.M365_SENDER_EMAIL || null,
  })
}
