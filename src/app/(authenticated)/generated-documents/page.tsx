'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText,
  Check,
  Copy,
  Download,
  Trash2,
  Loader2,
  FilePen,
} from 'lucide-react'
import Link from 'next/link'

interface GeneratedDoc {
  id: string
  documentName: string
  status: string
  generatedBy: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  template: { name: string; category: string }
  client: { id: string; name: string; caseNumber: string | null }
}

const statusColor = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'bg-gray-100 text-gray-800'
    case 'PENDING_REVIEW': return 'bg-yellow-100 text-yellow-800'
    case 'APPROVED': return 'bg-green-100 text-green-800'
    case 'SENT': return 'bg-blue-100 text-blue-800'
    case 'FILED': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function GeneratedDocumentsPage() {
  const [docs, setDocs] = useState<GeneratedDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [docDetail, setDocDetail] = useState<GeneratedDoc & { content: string } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [approving, setApproving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchDocs = () => {
    fetch('/api/generated-documents')
      .then((r) => r.json())
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDocs() }, [])

  const openDetail = async (id: string) => {
    setSelectedDoc(id)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/generated-documents/${id}`)
      const data = await res.json()
      setDocDetail(data)
    } catch {
      setDocDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleApprove = async (id: string) => {
    setApproving(true)
    try {
      const res = await fetch(`/api/generated-documents/${id}/approve`, { method: 'PUT' })
      if (res.ok) {
        fetchDocs()
        if (docDetail?.id === id) {
          setDocDetail({ ...docDetail, status: 'APPROVED' })
        }
      }
    } catch { /* ignore */ } finally {
      setApproving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/generated-documents/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id))
        if (selectedDoc === id) {
          setSelectedDoc(null)
          setDocDetail(null)
        }
      }
    } catch { /* ignore */ } finally {
      setDeleting(null)
    }
  }

  const handleDownload = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusCounts: Record<string, number> = {}
  for (const d of docs) {
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1
  }

  const columns: Column<GeneratedDoc>[] = [
    {
      key: 'documentName',
      header: 'Document',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium">{row.documentName}</div>
          <div className="text-sm text-gray-500">{row.template.name}</div>
        </div>
      ),
    },
    {
      key: 'client.name',
      header: 'Case',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-sm">{row.client.name}</div>
          {row.client.caseNumber && (
            <div className="text-xs text-gray-500">{row.client.caseNumber}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (row) => (
        <Badge className={statusColor(row.status)} variant="outline">
          {row.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      searchable: false,
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      }),
    },
    {
      key: 'reviewedBy',
      header: 'Reviewed By',
      sortable: true,
      render: (row) => row.reviewedBy || <span className="text-gray-400">--</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generated Documents</h1>
          <p className="text-sm text-gray-500">Court-ready documents generated by SAGE</p>
        </div>
        <Link href="/generate">
          <Button>
            <FilePen className="h-4 w-4 mr-2" />
            Generate New
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SENT', 'FILED'].map((status) => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Badge className={statusColor(status)} variant="outline">
                  {status.replace('_', ' ')}
                </Badge>
                <span className="text-2xl font-bold">{statusCounts[status] || 0}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={docs}
            loading={loading}
            searchPlaceholder="Search generated documents..."
            emptyIcon={<FileText className="h-12 w-12 text-gray-300 mb-3" />}
            emptyTitle="No documents generated yet"
            emptyDescription="Use the Generate page to create court-ready documents from templates."
            onRowClick={(row) => openDetail(row.id)}
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedDoc} onOpenChange={() => { setSelectedDoc(null); setDocDetail(null) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : docDetail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge className={statusColor(docDetail.status)} variant="outline">
                    {docDetail.status.replace('_', ' ')}
                  </Badge>
                  {docDetail.documentName}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Case:</span>
                    <p className="font-medium">{docDetail.client.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Template:</span>
                    <p className="font-medium">{docDetail.template.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <p className="font-medium">
                      {new Date(docDetail.createdAt).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {docDetail.reviewedBy && (
                  <div className="text-sm">
                    <span className="text-gray-500">Reviewed by:</span>{' '}
                    <span className="font-medium">{docDetail.reviewedBy}</span>
                    {docDetail.reviewedAt && (
                      <span className="text-gray-500">
                        {' '}on {new Date(docDetail.reviewedAt).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(docDetail.content)
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(docDetail.documentName, docDetail.content)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  {(docDetail.status === 'DRAFT' || docDetail.status === 'PENDING_REVIEW') && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(docDetail.id)}
                      disabled={approving}
                    >
                      {approving ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                  )}
                  {docDetail.status !== 'FILED' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(docDetail.id)}
                      disabled={deleting === docDetail.id}
                    >
                      {deleting === docDetail.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Delete
                    </Button>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Document Content</h4>
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-6 rounded-lg border max-h-96 overflow-y-auto">
                    {docDetail.content}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-500 py-8 text-center">Failed to load document.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
