import ExcelJS from 'exceljs'
import JSZip from 'jszip'

// Import pdf-parse/lib/pdf-parse directly to bypass index.js debug wrapper
// that tries to Fs.readFileSync('./test/data/05-versions-space.pdf') --
// a file that doesn't exist in Next.js standalone production builds.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseLib = require('pdf-parse/lib/pdf-parse') as (
  buffer: Buffer,
  options?: Record<string, unknown>
) => Promise<{ text: string; numpages: number }>

export type FileType = 'pdf' | 'docx' | 'xlsx' | 'image' | 'text'

export interface ExtractedContent {
  text: string
  isImage: boolean
  imageBase64?: string
  imageMime?: string
}

/** Extract text from PDF using pdf-parse (lib direct import) */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParseLib(buffer)
    return data.text
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error('Failed to extract PDF content')
  }
}

/** Extract text from DOCX using JSZip */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    if (!documentXml) {
      throw new Error('No document.xml found in DOCX')
    }

    const text = documentXml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return text
  } catch (error) {
    console.error('DOCX extraction error:', error)
    throw new Error('Failed to extract DOCX content')
  }
}

/** Extract text from XLSX using ExcelJS */
export async function extractXlsxText(buffer: Buffer): Promise<string> {
  try {
    const workbook = new ExcelJS.Workbook()
    const { Readable } = await import('stream')
    const stream = Readable.from(buffer)
    await workbook.xlsx.read(stream)
    const texts: string[] = []

    workbook.eachSheet((worksheet) => {
      const rows: string[] = []
      worksheet.eachRow((row) => {
        const values = row.values as (string | number | boolean | Date | null | undefined)[]
        const rowData = values.slice(1).map(v => v?.toString() ?? '').join(',')
        rows.push(rowData)
      })
      texts.push(`=== Sheet: ${worksheet.name} ===\n${rows.join('\n')}`)
    })

    return texts.join('\n\n')
  } catch (error) {
    console.error('XLSX extraction error:', error)
    throw new Error('Failed to extract XLSX content')
  }
}

/** Detect file type from extension and MIME */
export function getFileType(filename: string, mimeType: string): FileType {
  const ext = filename.toLowerCase().split('.').pop() || ''

  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf'
  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  if (ext === 'doc' || mimeType === 'application/msword') return 'docx'
  if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheet')) return 'xlsx'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) || mimeType.startsWith('image/')) return 'image'

  return 'text'
}

/** Get proper MIME type for images */
export function getImageMimeType(filename: string, originalMime: string): string {
  const ext = filename.toLowerCase().split('.').pop() || ''
  const mimeMap: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
  }
  return mimeMap[ext] || originalMime || 'image/png'
}

/** Extract content from a file buffer, returning text or image data */
export async function extractContent(buffer: Buffer, filename: string, mimeType: string): Promise<ExtractedContent> {
  const fileType = getFileType(filename, mimeType)

  switch (fileType) {
    case 'pdf':
      return { text: await extractPdfText(buffer), isImage: false }
    case 'docx':
      return { text: await extractDocxText(buffer), isImage: false }
    case 'xlsx':
      return { text: await extractXlsxText(buffer), isImage: false }
    case 'image':
      return {
        text: '',
        isImage: true,
        imageBase64: buffer.toString('base64'),
        imageMime: getImageMimeType(filename, mimeType),
      }
    case 'text':
    default:
      return { text: buffer.toString('utf-8'), isImage: false }
  }
}
