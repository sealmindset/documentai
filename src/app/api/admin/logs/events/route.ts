import { NextRequest } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { logStore } from '@/lib/log-store'
import type { LogEntry } from '@/lib/log-store'

export async function GET(request: NextRequest) {
  const denied = await requirePermission('logs', 'view')
  if (denied) return denied

  const url = request.nextUrl
  const type = url.searchParams.get('type') as LogEntry['type'] | null
  const method = url.searchParams.get('method')
  const service = url.searchParams.get('service')
  const search = url.searchParams.get('search')
  const limit = parseInt(url.searchParams.get('limit') || '100', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const result = logStore.query({
    type: type || undefined,
    method: method || undefined,
    service: service || undefined,
    search: search || undefined,
    limit,
    offset,
  })

  return Response.json(result)
}

export async function DELETE() {
  const denied = await requirePermission('logs', 'delete')
  if (denied) return denied

  logStore.clear()
  return Response.json({ message: 'Log buffer cleared' })
}
