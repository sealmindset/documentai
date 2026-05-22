import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import prisma from '@/lib/db'
import { pushEventToOutlook, isOutlookSyncEnabled } from '@/lib/outlook-calendar'

export async function GET(request: Request) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const type = searchParams.get('type')
  const clientId = searchParams.get('clientId')

  const where: Record<string, unknown> = {}

  if (start) where.startAt = { ...(where.startAt as object || {}), gte: new Date(start) }
  if (end) where.endAt = { ...(where.endAt as object || {}), lte: new Date(end) }
  if (type) where.eventType = type
  if (clientId) where.clientId = clientId

  const events = await prisma.calendarEvent.findMany({
    where,
    include: { client: { select: { id: true, name: true } } },
    orderBy: { startAt: 'asc' },
  })

  return NextResponse.json({ events, outlookSyncEnabled: isOutlookSyncEnabled() })
}

export async function POST(request: Request) {
  const denied = await requirePermission('dashboard', 'view')
  if (denied) return denied

  const body = await request.json()
  const {
    title, description, eventType, startAt, endAt, allDay,
    location, courtroom, judge, clientId, reminderMinutes, color,
  } = body

  if (!title || !eventType || !startAt || !endAt) {
    return NextResponse.json({ error: 'title, eventType, startAt, endAt are required' }, { status: 400 })
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      description: description || null,
      eventType,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      allDay: allDay || false,
      location: location || null,
      courtroom: courtroom || null,
      judge: judge || null,
      clientId: clientId || null,
      reminderMinutes: reminderMinutes ?? null,
      color: color || null,
    },
    include: { client: { select: { id: true, name: true } } },
  })

  if (isOutlookSyncEnabled()) {
    pushEventToOutlook(event.id).catch(() => {})
  }

  return NextResponse.json(event, { status: 201 })
}
