import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission } from '@/lib/auth'
import { listLibraries } from '@/lib/sharepoint-service'

export const GET = withRequestLog(async function GET(request: NextRequest) {
  const denied = await requirePermission('documents', 'create')
  if (denied) return denied

  const siteId = request.nextUrl.searchParams.get('siteId')
  if (!siteId) {
    return NextResponse.json({ error: 'siteId parameter required' }, { status: 400 })
  }

  try {
    const libraries = await listLibraries(siteId)
    return NextResponse.json(libraries)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to list libraries'
    console.error('[SharePoint] listLibraries error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
})
