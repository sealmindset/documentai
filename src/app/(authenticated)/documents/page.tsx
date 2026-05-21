'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/data-table'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import {
  FileText,
  Upload,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building2,
} from 'lucide-react'

interface Document {
  id: string
  vendorId: string
  documentType: string
  documentName: string
  fileSize: number | null
  mimeType: string | null
  uploadDate: string
  expirationDate: string | null
  status: string
  retrievedBy: string | null
  source: string | null
  isCurrent: boolean
  vendor: { id: string; name: string }
  _count: { riskFindings: number }
}

const statusVariant = (s: string) => {
  switch (s) {
    case 'ANALYZED': return 'low'
    case 'RECEIVED': return 'info'
    case 'PENDING': case 'ANALYZING': return 'medium'
    case 'EXPIRED': return 'high'
    case 'REJECTED': return 'critical'
    default: return 'secondary'
  }
}

const typeLabel = (t: string) =>
  t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const fetchDocuments = () => {
    setLoading(true)
    fetch('/api/documents')
      .then((r) => r.json())
      .then((data) => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDocuments() }, [])

  const total = documents.length
  const analyzed = documents.filter((d) => d.status === 'ANALYZED').length
  const pending = documents.filter((d) => d.status === 'PENDING' || d.status === 'RECEIVED').length
  const [expiring, setExpiring] = useState(0)
  useEffect(() => {
    const count = documents.filter((d) => {
      if (!d.expirationDate) return false
      const exp = new Date(d.expirationDate)
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      return exp <= thirtyDays && d.status !== 'EXPIRED'
    }).length
    setExpiring(count)
  }, [documents])

  const columns: Column<Document>[] = [
    {
      key: 'documentName',
      header: 'Document',
      sortable: true,
      filterable: true,
      filterValue: (row) => typeLabel(row.documentType),
      render: (row) => (
        <div>
          <div className="font-medium">{row.documentName}</div>
          <div className="text-xs text-gray-500">{typeLabel(row.documentType)}</div>
        </div>
      ),
    },
    {
      key: 'vendor.name',
      header: 'Party',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.vendor.name,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span>{row.vendor.name}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (row) => (
        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: 'fileSize',
      header: 'Size',
      sortable: true,
      searchable: false,
      render: (row) => formatFileSize(row.fileSize),
    },
    {
      key: '_count.riskFindings',
      header: 'Findings',
      sortable: true,
      searchable: false,
      className: 'text-center',
      render: (row) => row._count.riskFindings,
    },
    {
      key: 'retrievedBy',
      header: 'Source',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.retrievedBy || row.source || 'Unknown',
      render: (row) => (
        <span className="text-sm">
          {row.retrievedBy ? (
            <Badge variant="outline">{row.retrievedBy}</Badge>
          ) : (
            row.source || '—'
          )}
        </span>
      ),
    },
    {
      key: 'uploadDate',
      header: 'Uploaded',
      sortable: true,
      searchable: false,
      render: (row) => new Date(row.uploadDate).toLocaleDateString(),
    },
    {
      key: 'expirationDate',
      header: 'Expires',
      sortable: true,
      searchable: false,
      render: (row) => {
        if (!row.expirationDate) return <span className="text-gray-400">—</span>
        const exp = new Date(row.expirationDate)
        const isExpiring = exp <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        return (
          <span className={isExpiring ? 'text-red-600 font-medium' : ''}>
            {exp.toLocaleDateString()}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500">
            Legal documents and compliance certifications
          </p>
        </div>
        <Button onClick={() => setShowOnboarding(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload &amp; Onboard
        </Button>
      </div>

      <OnboardingWizard
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => fetchDocuments()}
      />

      {/* Summary cards (informational only) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Analyzed</p>
                <p className="text-2xl font-bold">{analyzed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold">{pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold">{expiring}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={documents}
            loading={loading}
            searchPlaceholder="Search documents..."
            emptyIcon={<FileText className="h-12 w-12 text-gray-300 mb-3" />}
            emptyTitle="No documents yet"
            emptyDescription="Documents will appear here when uploaded or retrieved by DORA."
            onRowClick={(row) => router.push(`/parties/${row.vendor.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
