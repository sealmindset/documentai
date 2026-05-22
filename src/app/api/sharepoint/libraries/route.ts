import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { listLibraries } from '@/lib/sharepoint-service'

export async function GET(request: NextRequest) {
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
}
