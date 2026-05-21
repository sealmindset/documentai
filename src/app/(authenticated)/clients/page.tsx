'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, Column } from '@/components/ui/data-table'
import { Plus, Building2 } from 'lucide-react'

interface Client {
  id: string
  name: string
  dunsNumber: string | null
  industry: string | null
  stateProvince: string | null
  website: string | null
  status: string
  businessOwner: string | null
  itOwner: string | null
  primaryContactName: string | null
  clientProfiles: {
    priorityTier: string
    overallReviewScore: number | null
  }[]
  _count: {
    issues: number
    documents: number
  }
}

const getPriorityBadgeVariant = (tier: string) => {
  switch (tier) {
    case 'CRITICAL': return 'critical'
    case 'HIGH': return 'high'
    case 'MEDIUM': return 'medium'
    case 'LOW': return 'low'
    default: return 'outline'
  }
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'NEW': return 'info'
    case 'ACCEPTED': return 'medium'
    case 'ASSIGNED': return 'high'
    case 'ACTIVE': return 'low'
    case 'CLOSED': return 'secondary'
    case 'PENDING': return 'secondary'
    case 'INACTIVE': case 'TERMINATED': return 'destructive'
    default: return 'outline'
  }
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Case Name',
      sortable: true,
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'dunsNumber',
      header: 'Case No.',
      sortable: true,
      render: (row) => row.dunsNumber
        ? <span className="font-mono text-xs">{row.dunsNumber}</span>
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'industry',
      header: 'Case Type',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.industry || 'Not Specified',
      render: (row) => row.industry || <span className="text-gray-400">—</span>,
    },
    {
      key: 'priorityTier',
      header: 'Priority Tier',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.clientProfiles[0]?.priorityTier || 'Not Assessed',
      render: (row) =>
        row.clientProfiles[0] ? (
          <Badge variant={getPriorityBadgeVariant(row.clientProfiles[0].priorityTier)}>
            {row.clientProfiles[0].priorityTier}
          </Badge>
        ) : (
          <Badge variant="outline">Not Assessed</Badge>
        ),
    },
    {
      key: 'reviewScore',
      header: 'Review Score',
      sortable: true,
      searchable: false,
      render: (row) => row.clientProfiles[0]?.overallReviewScore ?? <span className="text-gray-400">-</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (row) => (
        <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: 'businessOwner',
      header: 'Lead Attorney',
      sortable: true,
      filterable: true,
      render: (row) => row.businessOwner || <span className="text-gray-400">&mdash;</span>,
    },
    {
      key: 'itOwner',
      header: 'Associate',
      sortable: true,
      filterable: true,
      render: (row) => row.itOwner || <span className="text-gray-400">&mdash;</span>,
    },
    {
      key: '_count.issues',
      header: 'Open Issues',
      sortable: true,
      searchable: false,
      className: 'text-center',
      render: (row) =>
        row._count.issues > 0 ? (
          <Badge variant="destructive">{row._count.issues}</Badge>
        ) : (
          <span className="text-gray-400">0</span>
        ),
    },
    {
      key: '_count.documents',
      header: 'Documents',
      sortable: true,
      searchable: false,
      className: 'text-center',
      render: (row) => row._count.documents,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <Link href={`/clients/${row.id}`} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm">View</Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500">Manage client profiles and document reviews</p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={clients}
            loading={loading}
            searchPlaceholder="Search clients..."
            emptyIcon={<Building2 className="h-12 w-12 text-gray-300 mb-3" />}
            emptyTitle="No clients yet"
            emptyDescription="Get started by adding your first client"
            onRowClick={(row) => router.push(`/clients/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
