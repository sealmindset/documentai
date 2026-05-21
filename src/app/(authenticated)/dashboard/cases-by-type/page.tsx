'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'
import { ArrowLeft, Briefcase } from 'lucide-react'

interface Client {
  id: string
  name: string
  status: string
  industry: string | null
  businessOwner: string | null
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    NEW: 'info', ACCEPTED: 'medium', ASSIGNED: 'high', ACTIVE: 'low', CLOSED: 'secondary',
  }
  return map[status] || 'outline'
}

export default function CasesByTypePage() {
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

  const columns: Column<Client>[] = [
    { key: 'name', header: 'Case', sortable: true, filterable: true },
    {
      key: 'category', header: 'Category', sortable: true, filterable: true,
      filterValue: (row) => row.industry?.split(' — ')[0]?.trim() || 'Unknown',
      render: (row) => row.industry?.split(' — ')[0]?.trim() || 'Unknown',
    },
    {
      key: 'subcategory', header: 'Subcategory', sortable: true, filterable: true,
      filterValue: (row) => row.industry?.split(' — ')[1]?.trim() || '—',
      render: (row) => row.industry?.split(' — ')[1]?.trim() || '—',
    },
    {
      key: 'status', header: 'Status', sortable: true, filterable: true,
      render: (row) => <Badge variant={getStatusBadge(row.status) as any}>{row.status}</Badge>,
    },
    {
      key: 'businessOwner', header: 'Lead Attorney', sortable: true, filterable: true,
      render: (row) => row.businessOwner || '—',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6" /> Cases by Type
        </h1>
      </div>
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
