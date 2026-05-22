import { NextRequest, NextResponse } from 'next/server'
import { withRequestLog } from '@/lib/request-logger'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { processFile } from '@/lib/sharepoint-service'

export const POST = withRequestLog(async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('documents', 'create')
  if (denied) return denied

  const { id } = await params

  try {
    const config = await prisma.sharePointSync.findUnique({ where: { id } })
    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 })
    }

    let body: Record<string, unknown> = {}
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      // No body = process all pending
    }

    const fileIds: string[] = body.fileIds as string[] || []

    let filesToProcess
    if (fileIds.length > 0) {
      filesToProcess = await prisma.sharePointFile.findMany({
        where: { syncConfigId: id, id: { in: fileIds } },
      })
    } else {
      filesToProcess = await prisma.sharePointFile.findMany({
        where: { syncConfigId: id, status: 'PENDING' },
        take: 10,
      })
    }

    const results: { fileId: string; fileName: string; success: boolean; documentId?: string; clientName?: string | null; error?: string }[] = []

    for (const file of filesToProcess) {
      try {
        const r = await processFile(file.id, config.driveId)
        results.push({
          fileId: file.id,
          fileName: file.fileName,
          success: true,
          documentId: r.documentId,
          clientName: r.clientName,
        })
      } catch (err) {
        results.push({
          fileId: file.id,
          fileName: file.fileName,
          success: false,
          error: err instanceof Error ? err.message : 'Processing failed',
        })
      }
    }

    return NextResponse.json({
      processed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Process failed'
    console.error('[SharePoint] process error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
})
