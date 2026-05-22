'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { ArrowLeft, Clock } from 'lucide-react'

interface Deadline {
  id: string
  type: string
  title: string
  dueDate: string
  clientId: string
  clientName: string
  status: string
  documentType: string | null
  severity: string | null
  priority: string | null
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function urgencyBadge(days: number) {
  if (days <= 7) return 'critical'
  if (days <= 30) return 'high'
  if (days <= 90) return 'medium'
  return 'low'
}

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/deadlines?days=180')
      .then((r) => r.ok ? r.json() : { deadlines: [] })
      .then((d) => setDeadlines(d.deadlines || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Deadline>[] = [
    {
      key: 'dueDate', header: 'Due Date', sortable: true,
      render: (row) => new Date(row.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    {
      key: 'daysLeft', header: 'Days Left', sortable: true,
      filterValue: (row) => {
        const d = daysUntil(row.dueDate)
        if (d <= 30) return '0-30 days'
        if (d <= 90) return '31-90 days'
        return '91-180 days'
      },
      filterable: true,
      render: (row) => {
        const d = daysUntil(row.dueDate)
        return <Badge variant={urgencyBadge(d) as BadgeProps['variant']}>{d}d</Badge>
      },
    },
    {
      key: 'type', header: 'Source', sortable: true, filterable: true,
      render: (row) => {
        const labels: Record<string, string> = { document: 'Document', finding: 'Issue', action: 'Action Item' }
        return labels[row.type] || row.type
      },
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
          <Clock className="h-6 w-6" /> Upcoming Deadlines
        </h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={deadlines}
            loading={loading}
            searchPlaceholder="Search deadlines..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
