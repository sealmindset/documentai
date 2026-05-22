import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission } from '@/lib/auth'
import { syncLibrary } from '@/lib/sharepoint-service'

export const POST = withRequestLog(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('documents', 'create')
  if (denied) return denied

  const { id } = await params

  try {
    const result = await syncLibrary(id)
    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Sync failed'
    console.error('[SharePoint] sync error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
})
