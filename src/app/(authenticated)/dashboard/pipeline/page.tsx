'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { ArrowLeft, Scale } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  status: string
  industry: string | null
  businessOwner: string | null
  annualSpend: number | null
  primaryContactName: string | null
}

function getStatusBadge(status: string) {
  const map: Record<string, 'info' | 'medium' | 'high' | 'low' | 'secondary'> = {
    NEW: 'info', ACCEPTED: 'medium', ASSIGNED: 'high', ACTIVE: 'low', CLOSED: 'secondary',
  }
  return map[status] || 'outline'
}

export default function PipelinePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('status')
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/vendors')
      .then((r) => r.ok ? r.json() : { vendors: [] })
      .then((d) => setVendors(d.vendors || d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = statusFilter
    ? vendors.filter((v) => v.status === statusFilter)
    : vendors

  const columns: Column<Vendor>[] = [
    { key: 'name', header: 'Case', sortable: true, filterable: true },
    {
      key: 'status', header: 'Status', sortable: true, filterable: true,
      render: (row) => <Badge variant={getStatusBadge(row.status) as any}>{row.status}</Badge>,
    },
    {
      key: 'industry', header: 'Type', sortable: true, filterable: true,
      render: (row) => row.industry || '—',
    },
    {
      key: 'businessOwner', header: 'Lead Attorney', sortable: true, filterable: true,
      render: (row) => row.businessOwner || '—',
    },
    {
      key: 'annualSpend', header: 'Fees', sortable: true,
      render: (row) => row.annualSpend
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.annualSpend)
        : '—',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" /> Case Pipeline
            {statusFilter && <Badge variant={getStatusBadge(statusFilter) as any} className="ml-2">{statusFilter}</Badge>}
          </h1>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            searchPlaceholder="Search cases..."
            onRowClick={(row) => router.push(`/parties/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
