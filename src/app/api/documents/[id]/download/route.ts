import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

export const GET = withRequestLog(async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('documents', 'view')
  if (denied) return denied

  try {
    const { id } = await params
    const document = await prisma.document.findUnique({
      where: { id },
      select: { filePath: true, documentName: true, mimeType: true },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!document.filePath || !existsSync(document.filePath)) {
      return NextResponse.json({ error: 'No file stored for this document' }, { status: 404 })
    }

    const fileBuffer = await readFile(document.filePath)
    const contentType = document.mimeType || 'application/octet-stream'
    const fileName = document.documentName || 'document'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (error) {
    console.error('Error downloading document:', error)
    return NextResponse.json({ error: 'Failed to download document' }, { status: 500 })
  }
})
