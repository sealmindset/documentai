'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  FileStack,
  Plus,
  Upload,
  FileText,
  Sparkles,
  Loader2,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
} from 'lucide-react'

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

interface AnalysisResult {
  category: string
  subcategory: string | null
  jurisdiction: string | null
  courtType: string | null
  summary: string
  detectedFields: string[]
  suggestedFields: { field: string; reason: string }[]
  cleanedContent: string
  originalContent: string
}

const CATEGORIES = ['PLEADING', 'CORRESPONDENCE', 'MOTION', 'NOTICE', 'DISCOVERY'] as const
const COURT_TYPES = ['CIRCUIT', 'SUPERIOR', 'DISTRICT', 'FEDERAL_DISTRICT'] as const

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
  const [showAdd, setShowAdd] = useState(false)

  const fetchTemplates = () => {
    setLoading(true)
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTemplates() }, [])

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
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {CATEGORIES.map((cat) => (
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

      {/* View Template Dialog */}
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

      {/* Add Template Wizard */}
      <AddTemplateDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={() => { setShowAdd(false); fetchTemplates() }}
      />
    </div>
  )
}

// =============================================
// Add Template Wizard (3 steps)
// =============================================

function AddTemplateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [inputMode, setInputMode] = useState<'upload' | 'paste' | null>(null)
  const [pasteContent, setPasteContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [courtType, setCourtType] = useState('')
  const [format, setFormat] = useState('DOCX')
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set())
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep(1)
    setInputMode(null)
    setPasteContent('')
    setFile(null)
    setAnalyzing(false)
    setAnalyzeError(null)
    setAnalysis(null)
    setName('')
    setCategory('')
    setSubcategory('')
    setJurisdiction('')
    setCourtType('')
    setFormat('DOCX')
    setAcceptedSuggestions(new Set())
    setContent('')
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setAnalyzeError(null)

    try {
      let res: Response

      if (inputMode === 'upload' && file) {
        const formData = new FormData()
        formData.append('file', file)
        res = await fetch('/api/templates/analyze', { method: 'POST', body: formData })
      } else {
        res = await fetch('/api/templates/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: pasteContent }),
        })
      }

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Analysis failed')
      }

      const data: AnalysisResult = await res.json()
      setAnalysis(data)
      setName(data.subcategory || '')
      setCategory(data.category)
      setSubcategory(data.subcategory || '')
      setJurisdiction(data.jurisdiction || '')
      setCourtType(data.courtType || '')
      setContent(data.cleanedContent || data.originalContent)

      if (file) {
        const ext = file.name.split('.').pop()?.toUpperCase()
        if (ext === 'PDF' || ext === 'DOCX' || ext === 'TXT') setFormat(ext)
      }

      setStep(2)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const toggleSuggestion = (field: string) => {
    setAcceptedSuggestions((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  const allFields = analysis
    ? [
        ...analysis.detectedFields,
        ...analysis.suggestedFields.filter((s) => acceptedSuggestions.has(s.field)).map((s) => s.field),
      ]
    : []

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'Untitled Template',
          category,
          subcategory: subcategory || undefined,
          jurisdiction: jurisdiction || undefined,
          courtType: courtType || undefined,
          content,
          format,
          requiredFields: allFields.length > 0 ? allFields : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      onCreated()
      reset()
    } catch {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Add Template
            <span className="text-sm font-normal text-gray-400 ml-2">Step {step} of 3</span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Input */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload a document file or paste template content. AI will analyze it to detect merge fields and classify the template.
            </p>

            {!inputMode && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setInputMode('upload')}
                  className="border-2 border-dashed rounded-lg p-8 hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
                >
                  <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  <p className="font-medium">Upload File</p>
                  <p className="text-sm text-gray-500 mt-1">DOCX, PDF, or TXT</p>
                </button>
                <button
                  onClick={() => setInputMode('paste')}
                  className="border-2 border-dashed rounded-lg p-8 hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
                >
                  <FileText className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  <p className="font-medium">Paste Text</p>
                  <p className="text-sm text-gray-500 mt-1">Paste or type template content</p>
                </button>
              </div>
            )}

            {inputMode === 'upload' && (
              <div className="space-y-3">
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => { setInputMode(null); setFile(null) }}
                >
                  &larr; Back to options
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf,.txt,.doc"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {!file ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <p className="font-medium">Click to select a file</p>
                    <p className="text-sm text-gray-500 mt-1">DOCX, PDF, or TXT up to 500KB</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {inputMode === 'paste' && (
              <div className="space-y-3">
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => { setInputMode(null); setPasteContent('') }}
                >
                  &larr; Back to options
                </button>
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Paste your template content here...&#10;&#10;Use {{field_name}} for merge fields, or let AI detect them for you."
                  className="w-full h-64 p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400">{pasteContent.length.toLocaleString()} characters</p>
              </div>
            )}

            {analyzeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {analyzeError}
              </div>
            )}
          </div>
        )}

        {/* Step 2: AI Analysis Review */}
        {step === 2 && analysis && (
          <div className="space-y-5">
            {/* AI Summary */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">AI Analysis</p>
                  <p className="text-sm text-blue-800 mt-1">{analysis.summary}</p>
                </div>
              </div>
            </div>

            {/* Editable metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Motion to Suppress Evidence"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                <input
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Suppression of Evidence"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
                <input
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. MN, IN, Federal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Court Type</label>
                <select
                  value={courtType}
                  onChange={(e) => setCourtType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {COURT_TYPES.map((c) => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DOCX">DOCX</option>
                  <option value="PDF">PDF</option>
                  <option value="TXT">TXT</option>
                </select>
              </div>
            </div>

            {/* Detected fields */}
            {analysis.detectedFields.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Detected Merge Fields ({analysis.detectedFields.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.detectedFields.map((field) => (
                    <code key={field} className="px-2 py-1 bg-green-50 border border-green-200 text-green-800 rounded text-sm flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {`{{${field}}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested fields */}
            {analysis.suggestedFields.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  AI-Suggested Fields ({analysis.suggestedFields.length})
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Click to accept or reject. Accepted fields will be added as merge placeholders.
                </p>
                <div className="space-y-2">
                  {analysis.suggestedFields.map((s) => {
                    const accepted = acceptedSuggestions.has(s.field)
                    return (
                      <button
                        key={s.field}
                        onClick={() => toggleSuggestion(s.field)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          accepted
                            ? 'bg-green-50 border-green-300'
                            : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-medium">
                            {`{{${s.field}}}`}
                          </code>
                          {accepted ? (
                            <Badge className="bg-green-100 text-green-800" variant="outline">Accepted</Badge>
                          ) : (
                            <Badge variant="outline">Click to accept</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{s.reason}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review Content */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="font-medium">{name || 'Untitled'}</p>
              </div>
              <div>
                <span className="text-gray-500">Category</span>
                <Badge className={categoryColor(category)} variant="outline">{category}</Badge>
              </div>
              <div>
                <span className="text-gray-500">Jurisdiction</span>
                <p className="font-medium">{jurisdiction || 'General'}</p>
              </div>
              <div>
                <span className="text-gray-500">Format</span>
                <p className="font-mono font-medium">{format}</p>
              </div>
            </div>

            {allFields.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Merge Fields ({allFields.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {allFields.map((field) => (
                    <code key={field} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded text-sm">
                      {`{{${field}}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Template Content</h4>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-80 p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              {step === 1 && (
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing || (inputMode === 'upload' ? !file : inputMode === 'paste' ? !pasteContent.trim() : true)}
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              )}
              {step === 2 && (
                <Button onClick={() => setStep(3)}>
                  Review Content
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {step === 3 && (
                <Button onClick={handleSave} disabled={saving || !name.trim() || !content.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Template
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
