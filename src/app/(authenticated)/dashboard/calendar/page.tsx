'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { ArrowLeft, Calendar } from 'lucide-react'

interface CalendarEvent {
  id: string
  date: string
  type: string
  title: string
  clientId: string
  clientName: string
  status: string
}

function eventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    motion_hearing: 'Motion Hearing',
    document_deadline: 'Document Deadline',
    issue_deadline: 'Issue Deadline',
    action_deadline: 'Action Deadline',
  }
  return labels[type] || type
}

function eventTypeBadge(type: string) {
  const map: Record<string, string> = {
    motion_hearing: 'critical',
    document_deadline: 'medium',
    issue_deadline: 'high',
    action_deadline: 'info',
  }
  return map[type] || 'secondary'
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/calendar?days=90')
      .then((r) => r.ok ? r.json() : { events: [] })
      .then((d) => setEvents(d.events || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<CalendarEvent>[] = [
    {
      key: 'date', header: 'Date', sortable: true,
      render: (row) => new Date(row.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    },
    {
      key: 'daysUntil', header: 'Days', sortable: true,
      filterValue: (row) => String(daysUntil(row.date)),
      render: (row) => {
        const d = daysUntil(row.date)
        const variant = d <= 7 ? 'critical' : d <= 14 ? 'high' : 'medium'
        return <Badge variant={variant as any}>{d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d}d`}</Badge>
      },
    },
    {
      key: 'type', header: 'Event Type', sortable: true, filterable: true,
      filterValue: (row) => eventTypeLabel(row.type),
      render: (row) => <Badge variant={eventTypeBadge(row.type) as any}>{eventTypeLabel(row.type)}</Badge>,
    },
    { key: 'title', header: 'Title', sortable: true, filterable: true },
    { key: 'clientName', header: 'Case', sortable: true, filterable: true },
    {
      key: 'status', header: 'Status', sortable: true, filterable: true,
      render: (row) => <Badge variant="outline">{row.status}</Badge>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" /> Court Calendar
        </h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={events}
            loading={loading}
            searchPlaceholder="Search events..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
