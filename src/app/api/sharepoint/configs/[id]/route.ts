import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('documents', 'view')
  if (denied) return denied

  const { id } = await params

  try {
    const config = await prisma.sharePointSync.findUnique({
      where: { id },
      include: {
        files: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    })

    if (!config) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('[SharePoint] get config error:', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('documents', 'edit')
  if (denied) return denied

  const { id } = await params

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { isEnabled, label, folderPath } = body as Record<string, unknown>

    const data: Record<string, unknown> = {}
    if (typeof isEnabled === 'boolean') data.isEnabled = isEnabled
    if (typeof label === 'string') data.label = label
    if (typeof folderPath === 'string') data.folderPath = folderPath

    const config = await prisma.sharePointSync.update({
      where: { id },
      data,
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('[SharePoint] update config error:', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('documents', 'delete')
  if (denied) return denied

  const { id } = await params

  try {
    await prisma.sharePointSync.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SharePoint] delete config error:', error)
    return NextResponse.json({ error: 'Failed to delete config' }, { status: 500 })
  }
}
