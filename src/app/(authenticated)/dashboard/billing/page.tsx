'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { ArrowLeft, DollarSign } from 'lucide-react'

interface Client {
  id: string
  name: string
  status: string
  businessOwner: string | null
  annualSpend: number | null
  industry: string | null
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    NEW: 'info', ACCEPTED: 'medium', ASSIGNED: 'high', ACTIVE: 'low', CLOSED: 'secondary',
  }
  return map[status] || 'outline'
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function BillingPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.ok ? r.json() : { clients: [] })
      .then((d) => setClients(d.clients || d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalFees = clients.reduce((sum, v) => sum + (v.annualSpend || 0), 0)

  const columns: Column<Client>[] = [
    { key: 'name', header: 'Case', sortable: true, filterable: true },
    {
      key: 'status', header: 'Status', sortable: true, filterable: true,
      render: (row) => <Badge variant={getStatusBadge(row.status) as any}>{row.status}</Badge>,
    },
    {
      key: 'businessOwner', header: 'Lead Attorney', sortable: true, filterable: true,
      render: (row) => row.businessOwner || '—',
    },
    {
      key: 'annualSpend', header: 'Fees', sortable: true,
      render: (row) => row.annualSpend ? formatCurrency(row.annualSpend) : '—',
    },
    {
      key: 'industry', header: 'Case Type', sortable: true, filterable: true,
      render: (row) => row.industry || '—',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" /> Billing Summary
        </h1>
      </div>
      {!loading && (
        <div className="text-lg text-gray-700">
          Total fees across all cases: <span className="font-bold">{formatCurrency(totalFees)}</span>
        </div>
      )}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={clients}
            loading={loading}
            searchPlaceholder="Search cases..."
            onRowClick={(row) => router.push(`/clients/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
