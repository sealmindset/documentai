import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { listSites, isSharePointConfigured } from '@/lib/sharepoint-service'

export async function GET() {
  const denied = await requirePermission('documents', 'create')
  if (denied) return denied

  if (!isSharePointConfigured()) {
    return NextResponse.json(
      { error: 'Microsoft Graph is not configured. Check M365 environment variables.' },
      { status: 503 }
    )
  }

  try {
    const sites = await listSites()
    return NextResponse.json(sites)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to list sites'
    console.error('[SharePoint] listSites error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
