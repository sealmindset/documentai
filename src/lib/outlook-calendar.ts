import { graphFetch, isGraphConfigured } from './graph-client'
import prisma from './db'

const CALENDAR_USER = () =>
  process.env.M365_CALENDAR_USER_EMAIL || process.env.M365_SENDER_EMAIL || ''

interface OutlookEvent {
  id: string
  changeKey: string
  subject: string
  body?: { contentType: string; content: string }
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  isAllDay: boolean
  location?: { displayName: string }
  categories?: string[]
  lastModifiedDateTime: string
}

const EVENT_TYPE_CATEGORY: Record<string, string> = {
  COURT_DATE: 'Court Date',
  DEADLINE: 'Deadline',
  CLIENT_MEETING: 'Client Meeting',
  GENERAL: 'General',
}

function toOutlookPayload(event: {
  title: string
  description?: string | null
  startAt: Date
  endAt: Date
  allDay: boolean
  location?: string | null
  eventType: string
}) {
  return {
    subject: event.title,
    body: event.description
      ? { contentType: 'text', content: event.description }
      : undefined,
    start: {
      dateTime: event.allDay
        ? event.startAt.toISOString().split('T')[0]
        : event.startAt.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: event.allDay
        ? event.endAt.toISOString().split('T')[0]
        : event.endAt.toISOString(),
      timeZone: 'UTC',
    },
    isAllDay: event.allDay,
    location: event.location ? { displayName: event.location } : undefined,
    categories: [EVENT_TYPE_CATEGORY[event.eventType] || 'General'],
  }
}

function parseOutlookEvent(oe: OutlookEvent) {
  const category = oe.categories?.[0] || ''
  const eventType =
    Object.entries(EVENT_TYPE_CATEGORY).find(
      ([, v]) => v === category
    )?.[0] || 'GENERAL'

  return {
    title: oe.subject,
    description: oe.body?.content || null,
    eventType,
    startAt: new Date(oe.start.dateTime + (oe.start.dateTime.includes('Z') ? '' : 'Z')),
    endAt: new Date(oe.end.dateTime + (oe.end.dateTime.includes('Z') ? '' : 'Z')),
    allDay: oe.isAllDay,
    location: oe.location?.displayName || null,
    outlookEventId: oe.id,
    outlookChangeKey: oe.changeKey,
  }
}

export async function pushEventToOutlook(eventId: string): Promise<boolean> {
  if (!isGraphConfigured() || !CALENDAR_USER()) return false

  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } })
  if (!event) return false

  const userEmail = CALENDAR_USER()
  const payload = toOutlookPayload(event)

  if (event.outlookEventId) {
    const res = await graphFetch(
      `/users/${userEmail}/events/${event.outlookEventId}`,
      { method: 'PATCH', body: JSON.stringify(payload) }
    )
    if (res.ok) {
      const updated: OutlookEvent = await res.json()
      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { outlookChangeKey: updated.changeKey, lastSyncedAt: new Date() },
      })
      return true
    }
    return false
  }

  const res = await graphFetch(`/users/${userEmail}/events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (res.ok) {
    const created: OutlookEvent = await res.json()
    await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        outlookEventId: created.id,
        outlookChangeKey: created.changeKey,
        lastSyncedAt: new Date(),
      },
    })
    return true
  }
  return false
}

export async function deleteFromOutlook(outlookEventId: string): Promise<boolean> {
  if (!isGraphConfigured() || !CALENDAR_USER()) return false

  const res = await graphFetch(
    `/users/${CALENDAR_USER()}/events/${outlookEventId}`,
    { method: 'DELETE' }
  )
  return res.ok || res.status === 404
}

export async function pullFromOutlook(
  rangeStart: Date,
  rangeEnd: Date
): Promise<{ created: number; updated: number; deleted: number }> {
  if (!isGraphConfigured() || !CALENDAR_USER()) {
    return { created: 0, updated: 0, deleted: 0 }
  }

  const userEmail = CALENDAR_USER()
  const start = rangeStart.toISOString()
  const end = rangeEnd.toISOString()
  const filter = `start/dateTime ge '${start}' and end/dateTime le '${end}'`

  const res = await graphFetch(
    `/users/${userEmail}/calendarView?startDateTime=${start}&endDateTime=${end}&$top=500&$select=id,changeKey,subject,body,start,end,isAllDay,location,categories,lastModifiedDateTime`
  )

  if (!res.ok) return { created: 0, updated: 0, deleted: 0 }

  const data = await res.json()
  const outlookEvents: OutlookEvent[] = data.value || []

  let created = 0
  let updated = 0

  const seenOutlookIds = new Set<string>()

  for (const oe of outlookEvents) {
    seenOutlookIds.add(oe.id)
    const parsed = parseOutlookEvent(oe)

    const existing = await prisma.calendarEvent.findUnique({
      where: { outlookEventId: oe.id },
    })

    if (existing) {
      if (existing.outlookChangeKey !== oe.changeKey) {
        await prisma.calendarEvent.update({
          where: { id: existing.id },
          data: { ...parsed, lastSyncedAt: new Date() },
        })
        updated++
      }
    } else {
      await prisma.calendarEvent.create({
        data: { ...parsed, status: 'SCHEDULED', lastSyncedAt: new Date() },
      })
      created++
    }
  }

  const localWithOutlook = await prisma.calendarEvent.findMany({
    where: {
      outlookEventId: { not: null },
      startAt: { gte: rangeStart },
      endAt: { lte: rangeEnd },
    },
    select: { id: true, outlookEventId: true },
  })

  let deleted = 0
  for (const local of localWithOutlook) {
    if (local.outlookEventId && !seenOutlookIds.has(local.outlookEventId)) {
      await prisma.calendarEvent.update({
        where: { id: local.id },
        data: { status: 'CANCELLED' },
      })
      deleted++
    }
  }

  return { created, updated, deleted }
}

export async function fullSync(): Promise<{
  pushed: number
  pulled: { created: number; updated: number; deleted: number }
}> {
  const now = new Date()
  const pastStart = new Date(now.getFullYear() - 2, 0, 1)
  const futureEnd = new Date(now.getFullYear() + 1, 11, 31)

  const unsyncedLocal = await prisma.calendarEvent.findMany({
    where: {
      outlookEventId: null,
      status: { not: 'CANCELLED' },
    },
  })

  let pushed = 0
  for (const evt of unsyncedLocal) {
    const ok = await pushEventToOutlook(evt.id)
    if (ok) pushed++
  }

  const pulled = await pullFromOutlook(pastStart, futureEnd)

  return { pushed, pulled }
}

export function isOutlookSyncEnabled(): boolean {
  return (
    process.env.M365_CALENDAR_SYNC_ENABLED === 'true' &&
    isGraphConfigured() &&
    !!CALENDAR_USER()
  )
}
