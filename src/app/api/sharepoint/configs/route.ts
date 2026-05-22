import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'
import { sanitizeStrings } from '@/lib/sanitize-input'

const createSchema = z.object({
  label: z.string().min(1).max(200),
  siteId: z.string().min(1).max(500),
  siteName: z.string().min(1).max(500),
  driveId: z.string().min(1).max(500),
  driveName: z.string().min(1).max(500),
  folderPath: z.string().max(1000).optional(),
})

export async function GET() {
  const denied = await requirePermission('documents', 'view')
  if (denied) return denied

  try {
    const configs = await prisma.sharePointSync.findMany({
      include: {
        _count: { select: { files: true } },
        files: {
          where: { status: 'PENDING' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = configs.map(c => ({
      ...c,
      pendingCount: c.files.length,
      totalFiles: c._count.files,
      files: undefined,
      _count: undefined,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[SharePoint] list configs error:', error)
    return NextResponse.json({ error: 'Failed to fetch sync configurations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requirePermission('documents', 'create')
  if (denied) return denied

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validated = sanitizeStrings(createSchema.parse(body))

    const config = await prisma.sharePointSync.create({
      data: validated,
    })

    return NextResponse.json(config, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }
    console.error('[SharePoint] create config error:', error)
    return NextResponse.json({ error: 'Failed to create sync configuration' }, { status: 500 })
  }
}
