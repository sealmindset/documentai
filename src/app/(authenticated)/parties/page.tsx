'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, Column } from '@/components/ui/data-table'
import { Plus, Building2 } from 'lucide-react'

interface Vendor {
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
  riskProfiles: {
    riskTier: string
    overallRiskScore: number | null
  }[]
  _count: {
    riskFindings: number
    documents: number
  }
}

const getRiskBadgeVariant = (tier: string) => {
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

export default function VendorsPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/vendors')
      .then((r) => r.json())
      .then((data) => setVendors(data.vendors || []))
      .catch(() => setVendors([]))
      .finally(() => setLoading(false))
  }, [])

  const columns: Column<Vendor>[] = [
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
      key: 'riskTier',
      header: 'Priority Tier',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.riskProfiles[0]?.riskTier || 'Not Assessed',
      render: (row) =>
        row.riskProfiles[0] ? (
          <Badge variant={getRiskBadgeVariant(row.riskProfiles[0].riskTier)}>
            {row.riskProfiles[0].riskTier}
          </Badge>
        ) : (
          <Badge variant="outline">Not Assessed</Badge>
        ),
    },
    {
      key: 'riskScore',
      header: 'Review Score',
      sortable: true,
      searchable: false,
      render: (row) => row.riskProfiles[0]?.overallRiskScore ?? <span className="text-gray-400">-</span>,
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
      key: '_count.riskFindings',
      header: 'Open Issues',
      sortable: true,
      searchable: false,
      className: 'text-center',
      render: (row) =>
        row._count.riskFindings > 0 ? (
          <Badge variant="destructive">{row._count.riskFindings}</Badge>
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
        <Link href={`/parties/${row.id}`} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm">View</Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parties</h1>
          <p className="text-gray-500">Manage party profiles and document reviews</p>
        </div>
        <Link href="/parties/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Party
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={vendors}
            loading={loading}
            searchPlaceholder="Search parties..."
            emptyIcon={<Building2 className="h-12 w-12 text-gray-300 mb-3" />}
            emptyTitle="No parties yet"
            emptyDescription="Get started by adding your first party"
            onRowClick={(row) => router.push(`/parties/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
