'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable, Column } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  FileText,
  Calendar,
  Building2,
} from 'lucide-react'

interface Finding {
  id: string
  issueCode: string | null
  title: string
  description: string | null
  recommendation: string | null
  severity: string
  status: string
  findingCategory: string | null
  dueDate: string | null
  identifiedDate: string
  identifiedBy: string | null
  client: { id: string; name: string }
  document: { id: string; documentType: string; documentName: string } | null
  assessment: { id: string; assessmentType: string; assessmentDate: string | null } | null
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)

  useEffect(() => {
    fetch('/api/issues?includeAll=true&limit=1000')
      .then((r) => r.json())
      .then((data) => setFindings(data.findings || []))
      .catch(() => setFindings([]))
      .finally(() => setLoading(false))
  }, [])

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-600 text-white'
      case 'HIGH': return 'bg-orange-500 text-white'
      case 'MEDIUM': return 'bg-yellow-500 text-black'
      case 'LOW': return 'bg-blue-500 text-white'
      case 'INFORMATIONAL': return 'bg-gray-400 text-white'
      default: return 'bg-gray-300'
    }
  }

  const getStatusColor = (stat: string) => {
    switch (stat) {
      case 'OPEN': return 'bg-red-100 text-red-800 border-red-200'
      case 'IN_REMEDIATION': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'PENDING_VERIFICATION': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'RESOLVED': case 'CLOSED': return 'bg-green-100 text-green-800 border-green-200'
      case 'ACCEPTED': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Summary counts
  const severityCounts: Record<string, number> = {}
  for (const f of findings) {
    severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1
  }

  const columns: Column<Finding>[] = [
    {
      key: 'issueCode',
      header: 'ID',
      sortable: true,
      className: 'w-[100px]',
      render: (row) => (
        <span className="font-mono text-sm">
          {row.issueCode || row.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Issue',
      sortable: true,
      render: (row) => (
        <div className="max-w-xs">
          <div className="font-medium truncate">{row.title}</div>
          {row.description && (
            <div className="text-sm text-gray-500 truncate">
              {row.description.slice(0, 80)}...
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'client.name',
      header: 'Client',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.client.name,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Building2 className="h-4 w-4 text-gray-400" />
          {row.client.name}
        </div>
      ),
    },
    {
      key: 'findingCategory',
      header: 'Category',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.findingCategory || 'Uncategorized',
      render: (row) => row.findingCategory || <span className="text-gray-400">-</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      filterable: true,
      render: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(row.severity)}`}>
          {row.severity}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.status.replace(/_/g, ' '),
      render: (row) => (
        <Badge className={getStatusColor(row.status)} variant="outline">
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'identifiedBy',
      header: 'Identified By',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.identifiedBy || 'Unknown',
      render: (row) => row.identifiedBy || <span className="text-gray-400">-</span>,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      searchable: false,
      render: (row) =>
        row.dueDate ? (
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            {new Date(row.dueDate).toLocaleDateString()}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
          <p className="text-gray-500">Search and manage issues across all clients</p>
        </div>
        <div className="text-sm text-gray-500">{findings.length} total issues</div>
      </div>

      {/* Summary cards (informational only) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'].map((sev) => (
          <Card key={sev}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(sev)}`}>
                  {sev}
                </span>
                <span className="text-2xl font-bold">
                  {severityCounts[sev] || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={findings}
            loading={loading}
            pageSize={25}
            searchPlaceholder="Search issues..."
            emptyIcon={<AlertTriangle className="h-12 w-12 text-gray-300 mb-3" />}
            emptyTitle="No issues found"
            emptyDescription="Issues will appear here after document analysis."
            onRowClick={(row) => setSelectedFinding(row)}
          />
        </CardContent>
      </Card>

      {/* Finding Detail Modal */}
      <Dialog open={!!selectedFinding} onOpenChange={() => setSelectedFinding(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedFinding && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(selectedFinding.severity)}`}>
                    {selectedFinding.severity}
                  </span>
                  {selectedFinding.issueCode || selectedFinding.id.slice(0, 8)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedFinding.title}</h3>
                  <Badge className={getStatusColor(selectedFinding.status)} variant="outline">
                    {selectedFinding.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Client:</span>
                    <p className="font-medium">{selectedFinding.client.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <p className="font-medium">{selectedFinding.findingCategory || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Identified:</span>
                    <p className="font-medium">
                      {new Date(selectedFinding.identifiedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Due Date:</span>
                    <p className="font-medium">
                      {selectedFinding.dueDate
                        ? new Date(selectedFinding.dueDate).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Identified By:</span>
                    <p className="font-medium">{selectedFinding.identifiedBy || '-'}</p>
                  </div>
                  {selectedFinding.document && (
                    <div>
                      <span className="text-gray-500">Source Document:</span>
                      <p className="font-medium flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {selectedFinding.document.documentType}
                      </p>
                    </div>
                  )}
                </div>

                {selectedFinding.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedFinding.description}
                    </p>
                  </div>
                )}

                {selectedFinding.recommendation && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Recommendation</h4>
                    <p className="text-gray-700 whitespace-pre-wrap bg-blue-50 p-3 rounded-lg">
                      {selectedFinding.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
