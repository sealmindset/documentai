'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FilePen,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  Copy,
  Download,
} from 'lucide-react'

interface Template {
  id: string
  name: string
  category: string
  subcategory: string | null
}

interface Client {
  id: string
  name: string
  caseNumber: string | null
  status: string
}

interface MergeFields {
  [category: string]: Record<string, string | null>
}

interface GenerationResult {
  success: boolean
  document?: {
    documentName: string
    content: string
    resolvedFields: Record<string, string>
    unresolvedFields: string[]
    warnings: string[]
  }
  processingTimeMs?: number
  error?: string
}

type Step = 'template' | 'case' | 'review' | 'generate' | 'result'

export default function GeneratePage() {
  const [step, setStep] = useState<Step>('template')
  const [templates, setTemplates] = useState<Template[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [mergeFields, setMergeFields] = useState<MergeFields | null>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [loadingFields, setLoadingFields] = useState(false)

  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
  }, [])

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.clients || []
        setClients(list)
      })
      .catch(() => setClients([]))
  }, [])

  const loadMergeFields = async (clientId: string) => {
    setLoadingFields(true)
    try {
      const res = await fetch(`/api/generate?clientId=${clientId}`)
      const data = await res.json()
      setMergeFields(data)
    } catch {
      setMergeFields(null)
    } finally {
      setLoadingFields(false)
    }
  }

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId)
    loadMergeFields(clientId)
    setStep('review')
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          templateId: selectedTemplate,
          overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
        }),
      })
      const data = await res.json()
      setResult(data)
      setStep('result')
    } catch (error) {
      setResult({ success: false, error: 'Failed to generate document' })
      setStep('result')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const selectedTemplateName = templates.find((t) => t.id === selectedTemplate)?.name
  const selectedClientName = clients.find((c) => c.id === selectedClient)?.name

  const steps: { key: Step; label: string; number: number }[] = [
    { key: 'template', label: 'Select Template', number: 1 },
    { key: 'case', label: 'Select Case', number: 2 },
    { key: 'review', label: 'Review Fields', number: 3 },
    { key: 'generate', label: 'Generate', number: 4 },
    { key: 'result', label: 'Result', number: 5 },
  ]

  const stepIndex = steps.findIndex((s) => s.key === step)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Document</h1>
        <p className="text-sm text-gray-500">Create court-ready documents from templates with auto-populated case data</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              i < stepIndex ? 'bg-green-100 text-green-800' :
              i === stepIndex ? 'bg-blue-100 text-blue-800 font-medium' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < stepIndex ? <Check className="h-4 w-4" /> : <span>{s.number}</span>}
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Template */}
      {step === 'template' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card
              key={t.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedTemplate === t.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => {
                setSelectedTemplate(t.id)
                setStep('case')
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{t.name}</h3>
                    {t.subcategory && (
                      <p className="text-sm text-gray-500">{t.subcategory}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">{t.category}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No templates available. Create templates first.</p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Case */}
      {step === 'case' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Select Case for: {selectedTemplateName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleClientSelect}>
              <SelectTrigger className="w-full max-w-lg">
                <SelectValue placeholder="Choose a case..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.caseNumber ? `(${c.caseNumber})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" className="mt-4" onClick={() => setStep('template')}>
              Back
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review Merge Fields */}
      {step === 'review' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Review Merge Fields
              </CardTitle>
              <p className="text-sm text-gray-500">
                Template: <strong>{selectedTemplateName}</strong> | Case: <strong>{selectedClientName}</strong>
              </p>
            </CardHeader>
            <CardContent>
              {loadingFields ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading case data...
                </div>
              ) : mergeFields ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(mergeFields).map(([category, fields]) => (
                    <div key={category}>
                      <h4 className="font-medium text-gray-900 mb-2 capitalize">{category}</h4>
                      <div className="space-y-1">
                        {Object.entries(fields).map(([field, value]) => (
                          <div key={`${category}.${field}`} className="flex items-start gap-2 text-sm">
                            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                              {category}.{field}
                            </code>
                            {value ? (
                              <span className="text-gray-900">{value}</span>
                            ) : (
                              <span className="text-orange-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Not set
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Failed to load merge fields.</p>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setStep('case')}>Back</Button>
                <Button onClick={() => { setStep('generate'); handleGenerate() }}>
                  <FilePen className="h-4 w-4 mr-2" />
                  Generate Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Generating */}
      {step === 'generate' && generating && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <h3 className="text-lg font-medium">Generating Document...</h3>
            <p className="text-sm text-gray-500">SAGE is populating your template with case data</p>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Result */}
      {step === 'result' && result && (
        <div className="space-y-4">
          {result.success && result.document ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-500" />
                        {result.document.documentName}
                      </CardTitle>
                      <p className="text-sm text-gray-500">
                        Generated in {result.processingTimeMs}ms |{' '}
                        {Object.keys(result.document.resolvedFields).length} fields resolved
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(result.document!.content)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {result.document.warnings.length > 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-1">Warnings</h4>
                      {result.document.warnings.map((w, i) => (
                        <p key={i} className="text-sm text-yellow-700">{w}</p>
                      ))}
                    </div>
                  )}

                  <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-6 rounded-lg border max-h-[60vh] overflow-y-auto">
                    {result.document.content}
                  </pre>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep('template')
                    setResult(null)
                    setSelectedTemplate('')
                    setSelectedClient('')
                    setMergeFields(null)
                  }}
                >
                  Generate Another
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium">Generation Failed</h3>
                <p className="text-sm text-gray-500">{result.error || 'Unknown error'}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setStep('review')}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
