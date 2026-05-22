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
import { FileStack } from 'lucide-react'

interface Template {
  id: string
  name: string
  category: string
  subcategory: string | null
  jurisdiction: string | null
  courtType: string | null
  content: string
  format: string
  requiredFields: string | null
  isActive: boolean
  version: number
  createdAt: string
  _count: { generatedDocs: number }
}

const categoryColor = (cat: string) => {
  switch (cat) {
    case 'PLEADING': return 'bg-blue-100 text-blue-800'
    case 'CORRESPONDENCE': return 'bg-green-100 text-green-800'
    case 'MOTION': return 'bg-purple-100 text-purple-800'
    case 'NOTICE': return 'bg-yellow-100 text-yellow-800'
    case 'DISCOVERY': return 'bg-orange-100 text-orange-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [])

  const categoryCounts: Record<string, number> = {}
  for (const t of templates) {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1
  }

  const columns: Column<Template>[] = [
    {
      key: 'name',
      header: 'Template Name',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {row.subcategory && (
            <div className="text-sm text-gray-500">{row.subcategory}</div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      render: (row) => (
        <Badge className={categoryColor(row.category)} variant="outline">
          {row.category}
        </Badge>
      ),
    },
    {
      key: 'jurisdiction',
      header: 'Jurisdiction',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.jurisdiction || 'General',
      render: (row) => row.jurisdiction || <span className="text-gray-400">General</span>,
    },
    {
      key: 'format',
      header: 'Format',
      sortable: true,
      render: (row) => <span className="font-mono text-sm">{row.format}</span>,
    },
    {
      key: '_count.generatedDocs',
      header: 'Used',
      sortable: true,
      searchable: false,
      className: 'text-center',
      render: (row) => row._count.generatedDocs,
    },
    {
      key: 'version',
      header: 'Version',
      sortable: true,
      searchable: false,
      className: 'text-center',
      render: (row) => `v${row.version}`,
    },
  ]

  const parseRequiredFields = (json: string | null): string[] => {
    if (!json) return []
    try { return JSON.parse(json) } catch { return [] }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
          <p className="text-sm text-gray-500">Court-ready templates for pleadings, motions, correspondence, and discovery</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['PLEADING', 'CORRESPONDENCE', 'MOTION', 'NOTICE', 'DISCOVERY'].map((cat) => (
          <Card key={cat}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Badge className={categoryColor(cat)} variant="outline">{cat}</Badge>
                <span className="text-2xl font-bold">{categoryCounts[cat] || 0}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={templates}
            loading={loading}
            searchPlaceholder="Search templates..."
            emptyIcon={<FileStack className="h-12 w-12 text-gray-300 mb-3" />}
            emptyTitle="No templates yet"
            emptyDescription="Document templates will appear here once created."
            onRowClick={(row) => setSelectedTemplate(row)}
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge className={categoryColor(selectedTemplate.category)} variant="outline">
                    {selectedTemplate.category}
                  </Badge>
                  {selectedTemplate.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Jurisdiction:</span>
                    <p className="font-medium">{selectedTemplate.jurisdiction || 'General'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Format:</span>
                    <p className="font-medium">{selectedTemplate.format}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Version:</span>
                    <p className="font-medium">v{selectedTemplate.version}</p>
                  </div>
                </div>

                {selectedTemplate.requiredFields && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Required Merge Fields</h4>
                    <div className="flex flex-wrap gap-2">
                      {parseRequiredFields(selectedTemplate.requiredFields).map((field) => (
                        <code key={field} className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {`{{${field}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Template Content</h4>
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                    {selectedTemplate.content}
                  </pre>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
