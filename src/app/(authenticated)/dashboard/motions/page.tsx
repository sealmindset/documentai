'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { ArrowLeft, Gavel } from 'lucide-react'

interface Motion {
  id: string
  documentType: string
  documentName: string
  expirationDate: string | null
  status: string
  clientId: string
  clientName: string
  leadAttorney: string | null
  caseType: string | null
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatMotionType(type: string) {
  return type.replace('MOTION_', '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function MotionsPage() {
  const [motions, setMotions] = useState<Motion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/motions')
      .then((r) => r.ok ? r.json() : { motions: [] })
      .then((d) => setMotions(d.motions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Motion>[] = [
    {
      key: 'documentType', header: 'Motion Type', sortable: true, filterable: true,
      render: (row) => formatMotionType(row.documentType),
    },
    { key: 'clientName', header: 'Case', sortable: true, filterable: true },
    {
      key: 'expirationDate', header: 'Hearing Date', sortable: true,
      render: (row) => row.expirationDate
        ? new Date(row.expirationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—',
    },
    {
      key: 'daysUntil', header: 'Days Until', sortable: true,
      filterValue: (row) => row.expirationDate ? String(daysUntil(row.expirationDate)) : '',
      render: (row) => {
        if (!row.expirationDate) return '—'
        const d = daysUntil(row.expirationDate)
        const variant = d <= 7 ? 'critical' : d <= 30 ? 'high' : 'medium'
        return <Badge variant={variant as any}>{d}d</Badge>
      },
    },
    {
      key: 'leadAttorney', header: 'Lead Attorney', sortable: true, filterable: true,
      render: (row) => row.leadAttorney || '—',
    },
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
          <Gavel className="h-6 w-6" /> Motions
        </h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={motions}
            loading={loading}
            searchPlaceholder="Search motions..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
