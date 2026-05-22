'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, Column } from '@/components/ui/data-table'
import { useAuth } from '@/lib/auth-context'
import { Activity, Trash2, RefreshCw } from 'lucide-react'

interface LogEntry {
  id: string
  type: 'INBOUND' | 'OUTBOUND'
  timestamp: string
  method: string
  path: string
  status: number
  durationMs: number
  userEmail?: string
  userRole?: string
  ip?: string
  service?: string
  error?: string
}

interface LogStats {
  bufferSize: number
  maxSize: number
  totalReceived: number
  inboundCount: number
  outboundCount: number
  recentErrors: number
  status2xx: number
  status4xx: number
  status5xx: number
}

export default function ActivityLogsPage() {
  const { hasPermission } = useAuth()
  const [events, setEvents] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const canDelete = hasPermission('logs', 'delete')

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (methodFilter) params.set('method', methodFilter)
    if (search) params.set('search', search)
    params.set('limit', '200')

    const [eventsRes, statsRes] = await Promise.all([
      fetch(`/api/admin/logs/events?${params}`),
      fetch('/api/admin/logs/stats'),
    ])

    if (eventsRes.ok) {
      const data = await eventsRes.json()
      setEvents(data.events || [])
    }
    if (statsRes.ok) setStats(await statsRes.json())
    setLoading(false)
  }, [typeFilter, methodFilter, search])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 5000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, fetchData])

  const handleClear = async () => {
    if (!confirm('Clear all log entries from the buffer?')) return
    await fetch('/api/admin/logs/events', { method: 'DELETE' })
    fetchData()
  }

  const statusBadge = (status: number) => {
    if (status >= 500) return <Badge variant="destructive">{status}</Badge>
    if (status >= 400) return <Badge variant="outline" className="text-orange-600 border-orange-300">{status}</Badge>
    if (status >= 200) return <Badge variant="outline" className="text-green-600 border-green-300">{status}</Badge>
    return <Badge variant="secondary">{status}</Badge>
  }

  const columns: Column<LogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      render: (e) => new Date(e.timestamp).toLocaleTimeString(),
    },
    {
      key: 'type',
      header: 'Type',
      filterable: true,
      render: (e) => (
        <Badge variant={e.type === 'INBOUND' ? 'default' : 'secondary'}>
          {e.type === 'INBOUND' ? 'IN' : 'OUT'}
        </Badge>
      ),
    },
    { key: 'method', header: 'Method', sortable: true, filterable: true },
    { key: 'path', header: 'Path', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (e) => statusBadge(e.status),
    },
    {
      key: 'durationMs',
      header: 'Duration',
      sortable: true,
      render: (e) => `${e.durationMs}ms`,
    },
    {
      key: 'userEmail',
      header: 'User / Service',
      render: (e) => e.userEmail || e.service || '—',
    },
    {
      key: 'error',
      header: 'Error',
      render: (e) => e.error ? <span className="text-red-500 text-xs">{e.error}</span> : null,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" /> Activity Logs
          </h1>
          <p className="text-muted-foreground">In-memory request and outbound call log</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear Buffer
            </Button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{stats.bufferSize}</div>
              <div className="text-xs text-muted-foreground">Buffer ({stats.bufferSize}/{stats.maxSize})</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{stats.totalReceived}</div>
              <div className="text-xs text-muted-foreground">Total Received</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{stats.inboundCount}</div>
              <div className="text-xs text-muted-foreground">Inbound Requests</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold">{stats.outboundCount}</div>
              <div className="text-xs text-muted-foreground">Outbound Calls</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-red-500">{stats.recentErrors}</div>
              <div className="text-xs text-muted-foreground">Errors (5min)</div>
            </CardContent>
          </Card>
        </div>
      )}

      {stats && (
        <div className="flex gap-2">
          <Badge variant="outline" className="text-green-600 border-green-300">2xx: {stats.status2xx}</Badge>
          <Badge variant="outline" className="text-orange-600 border-orange-300">4xx: {stats.status4xx}</Badge>
          <Badge variant="destructive">5xx: {stats.status5xx}</Badge>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Search paths, users, errors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="INBOUND">Inbound</option>
          <option value="OUTBOUND">Outbound</option>
        </select>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
        >
          <option value="">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <DataTable
        data={events}
        columns={columns}
        loading={loading}
      />
    </div>
  )
}
