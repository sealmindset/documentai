'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  Download,
  X,
  GripHorizontal,
  AlertTriangle,
  CheckCircle,
  Shield,
  FileImage,
  ChevronDown,
} from 'lucide-react'

interface DocumentIssue {
  id: string
  title: string
  severity: string
  status: string
  findingCategory: string | null
}

interface DocumentDetail {
  id: string
  clientId: string
  documentType: string
  documentName: string
  filePath: string | null
  fileSize: number | null
  mimeType: string | null
  uploadDate: string
  expirationDate: string | null
  status: string
  retrievedBy: string | null
  source: string | null
  isCurrent: boolean
  analysisResult: string | null
  client: { id: string; name: string }
  issues: DocumentIssue[]
}

interface AnalysisData {
  summary?: string
  documentType?: string
  keyFindings?: string[]
  riskFactors?: string[]
  strengths?: string[]
  recommendedRating?: string
  controlsCovered?: string[]
  recommendations?: string[]
  expirationDate?: string
}

interface DocumentViewerProps {
  documentId: string
  onClose: () => void
  initialPosition?: { x: number; y: number }
  zIndex: number
  onFocus: () => void
}

const severityColor: Record<string, string> = {
  CRITICAL: 'text-red-600 bg-red-50 border-red-200',
  HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
  MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  LOW: 'text-green-600 bg-green-50 border-green-200',
}

const ratingColor: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

function parseAnalysis(raw: string | null): AnalysisData | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return { summary: raw }
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const typeLabel = (t: string) =>
  t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export function DocumentViewer({
  documentId,
  onClose,
  initialPosition,
  zIndex,
  onFocus,
}: DocumentViewerProps) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; offsetX: number; offsetY: number }>({
    isDragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0,
  })
  const [position, setPosition] = useState(initialPosition || { x: 100, y: 80 })

  useEffect(() => {
    fetch(`/api/documents/${documentId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load')
        return r.json()
      })
      .then(setDoc)
      .catch(() => setError('Could not load document'))
      .finally(() => setLoading(false))
  }, [documentId])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, select')) return
    onFocus()
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: position.x,
      offsetY: position.y,
    }
    e.preventDefault()
  }, [position, onFocus])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setPosition({
        x: dragRef.current.offsetX + dx,
        y: Math.max(0, dragRef.current.offsetY + dy),
      })
    }
    const handleMouseUp = () => {
      dragRef.current.isDragging = false
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const analysis = doc ? parseAnalysis(doc.analysisResult) : null
  const hasFile = doc?.filePath != null && doc.filePath !== ''

  async function exportAs(format: 'pdf' | 'docx' | 'png') {
    if (!doc || !analysis) return
    setExporting(true)
    setShowExportMenu(false)

    try {
      if (format === 'pdf') {
        const { jsPDF } = await import('jspdf')
        const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
        const margin = 15
        const pageWidth = 210 - margin * 2
        let y = margin

        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        pdf.text(doc.documentName, margin, y)
        y += 8

        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(100)
        pdf.text(`${doc.client.name} | ${typeLabel(doc.documentType)} | ${doc.status}`, margin, y)
        pdf.setTextColor(0)
        y += 10

        if (analysis.summary) {
          pdf.setFontSize(12)
          pdf.setFont('helvetica', 'bold')
          pdf.text('Summary', margin, y)
          y += 6
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'normal')
          const lines = pdf.splitTextToSize(analysis.summary, pageWidth)
          pdf.text(lines, margin, y)
          y += lines.length * 5 + 6
        }

        const sections: [string, string[] | undefined][] = [
          ['Key Findings', analysis.keyFindings],
          ['Risk Factors', analysis.riskFactors],
          ['Strengths', analysis.strengths],
          ['Recommendations', analysis.recommendations],
        ]

        for (const [title, items] of sections) {
          if (!items?.length) continue
          if (y > 270) { pdf.addPage(); y = margin }
          pdf.setFontSize(12)
          pdf.setFont('helvetica', 'bold')
          pdf.text(title, margin, y)
          y += 6
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'normal')
          for (const item of items) {
            if (y > 275) { pdf.addPage(); y = margin }
            const bulletLines = pdf.splitTextToSize(`• ${item}`, pageWidth - 5)
            pdf.text(bulletLines, margin + 3, y)
            y += bulletLines.length * 5 + 2
          }
          y += 4
        }

        if (doc.issues.length > 0) {
          if (y > 250) { pdf.addPage(); y = margin }
          pdf.setFontSize(12)
          pdf.setFont('helvetica', 'bold')
          pdf.text(`Related Issues (${doc.issues.length})`, margin, y)
          y += 6
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'normal')
          for (const issue of doc.issues) {
            if (y > 275) { pdf.addPage(); y = margin }
            pdf.text(`• [${issue.severity}] ${issue.title} — ${issue.status}`, margin + 3, y)
            y += 5
          }
        }

        pdf.setFontSize(8)
        pdf.setTextColor(150)
        pdf.text(`Generated ${new Date().toLocaleString()} — Document AI Platform`, margin, 290)

        pdf.save(`${doc.documentName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
      }

      if (format === 'docx') {
        const docxLib = await import('docx')
        const { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } = docxLib

        const children: InstanceType<typeof Paragraph>[] = []

        children.push(new Paragraph({
          text: doc.documentName,
          heading: HeadingLevel.HEADING_1,
        }))
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${doc.client.name} | ${typeLabel(doc.documentType)} | ${doc.status}`, color: '666666', size: 20 }),
          ],
        }))
        children.push(new Paragraph({ text: '' }))

        if (analysis.summary) {
          children.push(new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_2 }))
          children.push(new Paragraph({ text: analysis.summary }))
          children.push(new Paragraph({ text: '' }))
        }

        const sections: [string, string[] | undefined][] = [
          ['Key Findings', analysis.keyFindings],
          ['Risk Factors', analysis.riskFactors],
          ['Strengths', analysis.strengths],
          ['Recommendations', analysis.recommendations],
        ]

        for (const [title, items] of sections) {
          if (!items?.length) continue
          children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }))
          for (const item of items) {
            children.push(new Paragraph({
              children: [new TextRun({ text: `• ${item}` })],
            }))
          }
          children.push(new Paragraph({ text: '' }))
        }

        if (doc.issues.length > 0) {
          children.push(new Paragraph({ text: `Related Issues (${doc.issues.length})`, heading: HeadingLevel.HEADING_2 }))
          for (const issue of doc.issues) {
            children.push(new Paragraph({
              children: [new TextRun({ text: `• [${issue.severity}] ${issue.title} — ${issue.status}` })],
            }))
          }
        }

        children.push(new Paragraph({ text: '' }))
        children.push(new Paragraph({
          children: [new TextRun({ text: `Generated ${new Date().toLocaleString()} — Document AI Platform`, color: '999999', size: 16 })],
          alignment: AlignmentType.RIGHT,
        }))

        const docFile = new Document({
          sections: [{ children }],
        })

        const blob = await Packer.toBlob(docFile)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${doc.documentName.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
        a.click()
        URL.revokeObjectURL(url)
      }

      if (format === 'png') {
        const { toPng } = await import('html-to-image')
        if (!contentRef.current) return
        const dataUrl = await toPng(contentRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 })
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${doc.documentName.replace(/[^a-zA-Z0-9]/g, '_')}.png`
        a.click()
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  async function downloadOriginal() {
    if (!doc) return
    const a = document.createElement('a')
    a.href = `/api/documents/${doc.id}/download`
    a.download = doc.documentName
    a.click()
  }

  return (
    <div
      ref={containerRef}
      className="fixed shadow-2xl border rounded-lg bg-background overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: 640,
        maxHeight: 'calc(100vh - 100px)',
        zIndex,
      }}
      onMouseDown={() => onFocus()}
    >
      {/* Draggable title bar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="font-medium text-sm truncate">
            {loading ? 'Loading...' : doc?.documentName || 'Document'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Download menu */}
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 gap-1"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={loading || !!error || exporting}
            >
              <Download className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3" />
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 top-8 w-48 bg-background border rounded-md shadow-lg py-1 z-10">
                {hasFile && (
                  <>
                    <button
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                      onClick={downloadOriginal}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Original File
                    </button>
                    <div className="border-t my-1" />
                  </>
                )}
                <div className="px-3 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                  Export Analysis As
                </div>
                <button
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => exportAs('pdf')}
                >
                  <FileText className="h-3.5 w-3.5 text-red-500" />
                  PDF Document
                </button>
                <button
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => exportAs('docx')}
                >
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                  Word Document (.docx)
                </button>
                <button
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => exportAs('png')}
                >
                  <FileImage className="h-3.5 w-3.5 text-green-500" />
                  PNG Image
                </button>
              </div>
            )}
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {loading && (
          <div className="p-8 text-center">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading document...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {doc && (
          <div ref={contentRef}>
            {/* Document metadata header */}
            <div className="px-4 py-3 border-b bg-muted/20">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={doc.status === 'ANALYZED' ? 'low' : doc.status === 'PENDING' ? 'medium' : 'secondary'}>
                  {doc.status}
                </Badge>
                <Badge variant="outline">{typeLabel(doc.documentType)}</Badge>
                {doc.retrievedBy && (
                  <Badge variant="outline" className="text-[10px]">{doc.retrievedBy}</Badge>
                )}
                {analysis?.recommendedRating && (
                  <Badge variant={ratingColor[analysis.recommendedRating] || 'secondary'}>
                    {analysis.recommendedRating} Priority
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>{doc.client.name}</span>
                <span>Uploaded {new Date(doc.uploadDate).toLocaleDateString()}</span>
                {doc.fileSize && <span>{formatFileSize(doc.fileSize)}</span>}
                {doc.expirationDate && (
                  <span className="text-red-600">
                    Expires {new Date(doc.expirationDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="analysis" className="px-4 pt-3 pb-4">
              <TabsList>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                {hasFile && <TabsTrigger value="preview">File Preview</TabsTrigger>}
                {doc.issues.length > 0 && (
                  <TabsTrigger value="issues">
                    Issues ({doc.issues.length})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="analysis" className="space-y-4 mt-3">
                {analysis ? (
                  <>
                    {analysis.summary && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Summary</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
                      </div>
                    )}

                    {analysis.keyFindings && analysis.keyFindings.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                          Key Findings
                        </h3>
                        <ul className="space-y-1">
                          {analysis.keyFindings.map((f, i) => (
                            <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-0">
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.riskFactors && analysis.riskFactors.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                          Risk Factors
                        </h3>
                        <ul className="space-y-1">
                          {analysis.riskFactors.map((r, i) => (
                            <li key={i} className="text-sm text-orange-700 pl-4 relative before:content-['•'] before:absolute before:left-0">
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.strengths && analysis.strengths.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1 flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5 text-green-500" />
                          Strengths
                        </h3>
                        <ul className="space-y-1">
                          {analysis.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-green-700 pl-4 relative before:content-['•'] before:absolute before:left-0">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.recommendations && analysis.recommendations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Recommendations</h3>
                        <ul className="space-y-1">
                          {analysis.recommendations.map((r, i) => (
                            <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-0">
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!analysis.summary && !analysis.keyFindings?.length && (
                      <p className="text-sm text-muted-foreground italic">
                        {doc.analysisResult || 'No analysis available for this document.'}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No analysis available</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload the document through the onboarding wizard to generate an AI analysis.
                    </p>
                  </div>
                )}
              </TabsContent>

              {hasFile && (
                <TabsContent value="preview" className="mt-3">
                  {doc.mimeType?.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/documents/${doc.id}/download`}
                      alt={doc.documentName}
                      className="max-w-full rounded border"
                    />
                  ) : doc.mimeType === 'application/pdf' ? (
                    <iframe
                      src={`/api/documents/${doc.id}/download`}
                      className="w-full h-[500px] rounded border"
                      title={doc.documentName}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Preview not available for this file type
                      </p>
                      <Button size="sm" variant="outline" className="mt-3" onClick={downloadOriginal}>
                        <Download className="h-4 w-4 mr-1" />
                        Download to view
                      </Button>
                    </div>
                  )}
                </TabsContent>
              )}

              {doc.issues.length > 0 && (
                <TabsContent value="issues" className="mt-3 space-y-2">
                  {doc.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-3 rounded-md border text-sm ${severityColor[issue.severity] || 'bg-muted'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{issue.title}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{issue.severity}</Badge>
                          <Badge variant="outline" className="text-[10px]">{issue.status}</Badge>
                        </div>
                      </div>
                      {issue.findingCategory && (
                        <span className="text-[10px] mt-1 block opacity-70">{issue.findingCategory}</span>
                      )}
                    </div>
                  ))}
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
