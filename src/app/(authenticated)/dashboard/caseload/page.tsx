'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { ArrowLeft, Users } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  status: string
  industry: string | null
  businessOwner: string | null
  annualSpend: number | null
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    NEW: 'info', ACCEPTED: 'medium', ASSIGNED: 'high', ACTIVE: 'low', CLOSED: 'secondary',
  }
  return map[status] || 'outline'
}

export default function CaseloadPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/vendors')
      .then((r) => r.ok ? r.json() : { vendors: [] })
      .then((d) => {
        const all = d.vendors || d
        setVendors(all.filter((v: Vendor) => v.status !== 'CLOSED'))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Vendor>[] = [
    {
      key: 'businessOwner', header: 'Lead Attorney', sortable: true, filterable: true,
      render: (row) => row.businessOwner || '—',
    },
    { key: 'name', header: 'Case', sortable: true, filterable: true },
    {
      key: 'industry', header: 'Type', sortable: true, filterable: true,
      render: (row) => row.industry || '—',
    },
    {
      key: 'status', header: 'Status', sortable: true, filterable: true,
      render: (row) => <Badge variant={getStatusBadge(row.status) as any}>{row.status}</Badge>,
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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Caseload by Attorney
        </h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={vendors}
            loading={loading}
            searchPlaceholder="Search by attorney or case..."
            onRowClick={(row) => router.push(`/parties/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
