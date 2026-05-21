/**
 * Report Download Utility
 *
 * Client-side conversion and download of report content in multiple formats:
 * PDF, DOCX, Markdown, JSON, XML
 */

// Dynamic imports to avoid Turbopack bundling issues with fflate (jspdf dep)
// and to reduce initial page bundle size — these only load when user clicks download.

export type DownloadFormat = 'pdf' | 'docx' | 'md' | 'json' | 'xml'

export interface ReportDownloadData {
  reportName: string
  reportType: string
  content: string
  vendorName?: string
  generatedBy?: string
  generatedDate: string
  status: string
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').slice(0, 200)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Split markdown-style content into heading + body segments for structured export. */
function parseContentSections(content: string): Array<{ heading?: string; body: string }> {
  const lines = content.split('\n')
  const sections: Array<{ heading?: string; body: string }> = []
  let currentHeading: string | undefined
  let currentBody: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/)
    if (headingMatch) {
      if (currentBody.length > 0 || currentHeading) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
      }
      currentHeading = headingMatch[1]
      currentBody = []
    } else {
      currentBody.push(line)
    }
  }
  if (currentBody.length > 0 || currentHeading) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
  }

  return sections
}

// ── PDF ──────────────────────────────────────────────────────────────────────

async function downloadPDF(data: ReportDownloadData, filename: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const usableWidth = pageWidth - margin * 2
  let y = margin

  const addPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
  }

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(data.reportName, usableWidth) as string[]
  addPageIfNeeded(titleLines.length * 8)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 8 + 2

  // Metadata line
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  const meta = [
    data.reportType.replace(/_/g, ' '),
    data.vendorName || 'Portfolio-wide',
    `Generated ${new Date(data.generatedDate).toLocaleDateString()}`,
    data.generatedBy ? `by ${data.generatedBy}` : '',
  ]
    .filter(Boolean)
    .join('  |  ')
  doc.text(meta, margin, y)
  y += 6

  // Separator
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8
  doc.setTextColor(0, 0, 0)

  // Content
  const sections = parseContentSections(data.content)
  for (const section of sections) {
    if (section.heading) {
      addPageIfNeeded(12)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(section.heading, margin, y)
      y += 7
    }

    if (section.body) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const bodyLines = doc.splitTextToSize(section.body, usableWidth) as string[]
      for (const line of bodyLines) {
        addPageIfNeeded(5)
        doc.text(line, margin, y)
        y += 4.5
      }
      y += 3
    }
  }

  const blob = doc.output('blob')
  triggerDownload(blob, `${sanitizeFilename(filename)}.pdf`)
}

// ── DOCX ─────────────────────────────────────────────────────────────────────

async function downloadDOCX(data: ReportDownloadData, filename: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx')
  const children: InstanceType<typeof Paragraph>[] = []

  // Title
  children.push(
    new Paragraph({
      text: data.reportName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
    })
  )

  // Metadata
  const meta = [
    data.reportType.replace(/_/g, ' '),
    data.vendorName || 'Portfolio-wide',
    `Generated ${new Date(data.generatedDate).toLocaleDateString()}`,
    data.generatedBy ? `by ${data.generatedBy}` : '',
  ]
    .filter(Boolean)
    .join('  |  ')
  children.push(
    new Paragraph({
      children: [new TextRun({ text: meta, color: '888888', size: 18 })],
      spacing: { after: 300 },
    })
  )

  // Content sections
  const sections = parseContentSections(data.content)
  for (const section of sections) {
    if (section.heading) {
      children.push(
        new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      )
    }
    if (section.body) {
      for (const para of section.body.split('\n\n')) {
        if (para.trim()) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: para.trim(), size: 22 })],
              spacing: { after: 120 },
            })
          )
        }
      }
    }
  }

  const doc = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  triggerDownload(blob, `${sanitizeFilename(filename)}.docx`)
}

// ── Markdown ─────────────────────────────────────────────────────────────────

function downloadMarkdown(data: ReportDownloadData, filename: string) {
  const header = [
    `# ${data.reportName}`,
    '',
    `**Type:** ${data.reportType.replace(/_/g, ' ')}`,
    data.vendorName ? `**Vendor:** ${data.vendorName}` : '**Scope:** Portfolio-wide',
    `**Generated:** ${new Date(data.generatedDate).toLocaleDateString()}${data.generatedBy ? ` by ${data.generatedBy}` : ''}`,
    `**Status:** ${data.status}`,
    '',
    '---',
    '',
  ].join('\n')

  const blob = new Blob([header + data.content], { type: 'text/markdown;charset=utf-8' })
  triggerDownload(blob, `${sanitizeFilename(filename)}.md`)
}

// ── JSON ─────────────────────────────────────────────────────────────────────

function downloadJSON(data: ReportDownloadData, filename: string) {
  const output = {
    reportName: data.reportName,
    reportType: data.reportType,
    vendor: data.vendorName || null,
    generatedBy: data.generatedBy || null,
    generatedDate: data.generatedDate,
    status: data.status,
    content: data.content,
  }
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json;charset=utf-8' })
  triggerDownload(blob, `${sanitizeFilename(filename)}.json`)
}

// ── XML ──────────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function downloadXML(data: ReportDownloadData, filename: string) {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<report>',
    `  <reportName>${escapeXml(data.reportName)}</reportName>`,
    `  <reportType>${escapeXml(data.reportType)}</reportType>`,
    `  <vendor>${escapeXml(data.vendorName || '')}</vendor>`,
    `  <generatedBy>${escapeXml(data.generatedBy || '')}</generatedBy>`,
    `  <generatedDate>${escapeXml(data.generatedDate)}</generatedDate>`,
    `  <status>${escapeXml(data.status)}</status>`,
    `  <content>${escapeXml(data.content || '')}</content>`,
    '</report>',
  ].join('\n')
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
  triggerDownload(blob, `${sanitizeFilename(filename)}.xml`)
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function downloadReport(
  data: ReportDownloadData,
  format: DownloadFormat,
  customFilename?: string
) {
  const filename = customFilename || data.reportName

  switch (format) {
    case 'pdf':
      await downloadPDF(data, filename)
      break
    case 'docx':
      await downloadDOCX(data, filename)
      break
    case 'md':
      downloadMarkdown(data, filename)
      break
    case 'json':
      downloadJSON(data, filename)
      break
    case 'xml':
      downloadXML(data, filename)
      break
  }
}

export const FORMAT_OPTIONS: { value: DownloadFormat; label: string; ext: string }[] = [
  { value: 'pdf', label: 'PDF Document', ext: '.pdf' },
  { value: 'docx', label: 'Word Document', ext: '.docx' },
  { value: 'md', label: 'Markdown', ext: '.md' },
  { value: 'json', label: 'JSON', ext: '.json' },
  { value: 'xml', label: 'XML', ext: '.xml' },
]
