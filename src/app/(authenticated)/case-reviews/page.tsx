'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable, Column } from '@/components/ui/data-table'
import {
  ClipboardCheck,
  Calendar,
  Building2,
  Filter,
} from 'lucide-react'

interface Assessment {
  id: string
  assessmentType: string
  assessmentStatus: string
  reviewRating: string | null
  overallReviewScore: number | null
  assessmentDate: string | null
  assessedBy: string | null
  summary: string | null
  createdAt: string
  client: { id: string; name: string }
  _count: { issues: number }
}

const statusVariant = (s: string) => {
  switch (s) {
    case 'COMPLETE': case 'APPROVED': return 'low'
    case 'IN_PROGRESS': case 'PENDING_REVIEW': return 'medium'
    case 'DRAFT': return 'info'
    default: return 'secondary'
  }
}

const ratingVariant = (r: string | null) => {
  switch (r) {
    case 'CRITICAL': return 'critical'
    case 'HIGH': return 'high'
    case 'MEDIUM': return 'medium'
    case 'LOW': return 'low'
    default: return 'secondary'
  }
}

const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export default function AssessmentsPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/case-reviews')
      .then((r) => r.json())
      .then((data) => setAssessments(Array.isArray(data) ? data : []))
      .catch(() => setAssessments([]))
      .finally(() => setLoading(false))
  }, [])

  // Summary counts
  const total = assessments.length
  const inProgress = assessments.filter((a) => a.assessmentStatus === 'IN_PROGRESS').length
  const pendingReview = assessments.filter((a) => a.assessmentStatus === 'PENDING_REVIEW').length
  const complete = assessments.filter((a) => a.assessmentStatus === 'COMPLETE' || a.assessmentStatus === 'APPROVED').length

  const columns: Column<Assessment>[] = [
    {
      key: 'client.name',
      header: 'Client',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.client.name,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{row.client.name}</span>
        </div>
      ),
    },
    {
      key: 'assessmentType',
      header: 'Type',
      sortable: true,
      filterable: true,
      filterValue: (row) => typeLabel(row.assessmentType),
      render: (row) => typeLabel(row.assessmentType),
    },
    {
      key: 'assessmentStatus',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.assessmentStatus.replace(/_/g, ' '),
      render: (row) => (
        <Badge variant={statusVariant(row.assessmentStatus)}>
          {row.assessmentStatus.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'reviewRating',
      header: 'Priority Rating',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.reviewRating || 'Not Rated',
      render: (row) =>
        row.reviewRating ? (
          <Badge variant={ratingVariant(row.reviewRating)}>{row.reviewRating}</Badge>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'overallReviewScore',
      header: 'Score',
      sortable: true,
      searchable: false,
      className: 'text-center',
      render: (row) =>
        row.overallReviewScore != null ? (
          <span className="font-mono">{row.overallReviewScore}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: '_count.issues',
      header: 'Issues',
      sortable: true,
      searchable: false,
      className: 'text-center',
      render: (row) => row._count.issues,
    },
    {
      key: 'assessedBy',
      header: 'Assessed By',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.assessedBy || 'Unassigned',
      render: (row) => row.assessedBy || <span className="text-gray-400">—</span>,
    },
    {
      key: 'assessmentDate',
      header: 'Date',
      sortable: true,
      searchable: false,
      render: (row) =>
        row.assessmentDate
          ? new Date(row.assessmentDate).toLocaleDateString()
          : <span className="text-gray-400">—</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Reviews</h1>
          <p className="text-sm text-gray-500">Track and manage legal document reviews</p>
        </div>
      </div>

      {/* Summary cards (informational only) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold">{inProgress}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold">{pendingReview}</p>
              </div>
              <Filter className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Complete</p>
                <p className="text-2xl font-bold">{complete}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={assessments}
            loading={loading}
            searchPlaceholder="Search assessments..."
            emptyIcon={<ClipboardCheck className="h-12 w-12 text-gray-300 mb-3" />}
            emptyTitle="No reviews yet"
            emptyDescription="Reviews will appear here when CLARA analyzes client documents."
            onRowClick={(row) => router.push(`/clients/${row.client.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
