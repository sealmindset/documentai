import { NextResponse, NextRequest } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { pushEventToOutlook, deleteFromOutlook, isOutlookSyncEnabled } from '@/lib/outlook-calendar'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const { id } = await params
  const event = await prisma.calendarEvent.findUnique({
    where: { id },
    include: { client: { select: { id: true, name: true } } },
  })

  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(event)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const { id } = await params
  const existing = await prisma.calendarEvent.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const {
    title, description, eventType, startAt, endAt, allDay,
    location, courtroom, judge, clientId, reminderMinutes, status, color,
  } = body

  const event = await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(eventType !== undefined && { eventType }),
      ...(startAt !== undefined && { startAt: new Date(startAt) }),
      ...(endAt !== undefined && { endAt: new Date(endAt) }),
      ...(allDay !== undefined && { allDay }),
      ...(location !== undefined && { location }),
      ...(courtroom !== undefined && { courtroom }),
      ...(judge !== undefined && { judge }),
      ...(clientId !== undefined && { clientId: clientId || null }),
      ...(reminderMinutes !== undefined && { reminderMinutes }),
      ...(status !== undefined && { status }),
      ...(color !== undefined && { color }),
    },
    include: { client: { select: { id: true, name: true } } },
  })

  if (isOutlookSyncEnabled()) {
    pushEventToOutlook(event.id).catch(() => {})
  }

  return NextResponse.json(event)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const { id } = await params
  const event = await prisma.calendarEvent.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (event.outlookEventId && isOutlookSyncEnabled()) {
    await deleteFromOutlook(event.outlookEventId).catch(() => {})
  }

  await prisma.calendarEvent.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
