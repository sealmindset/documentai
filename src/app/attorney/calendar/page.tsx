'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Gavel,
  Clock,
  Users,
  Calendar as CalIcon,
  MapPin,
  X,
  Trash2,
  Pencil,
  RefreshCw,
  Check,
  AlertTriangle,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface CalEvent {
  id: string
  title: string
  description: string | null
  eventType: string
  startAt: string
  endAt: string
  allDay: boolean
  location: string | null
  courtroom: string | null
  judge: string | null
  clientId: string | null
  client: { id: string; name: string } | null
  reminderMinutes: number | null
  status: string
  color: string | null
  outlookEventId: string | null
  lastSyncedAt: string | null
}

interface CaseOption {
  id: string
  name: string
}

type View = 'month' | 'week' | 'day' | 'agenda'

const EVENT_TYPES = [
  { value: 'COURT_DATE', label: 'Court Date', icon: Gavel, color: 'bg-purple-500', light: 'bg-purple-50 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  { value: 'DEADLINE', label: 'Deadline', icon: Clock, color: 'bg-red-500', light: 'bg-red-50 text-red-800 border-red-200', dot: 'bg-red-500' },
  { value: 'CLIENT_MEETING', label: 'Client Meeting', icon: Users, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  { value: 'GENERAL', label: 'General', icon: CalIcon, color: 'bg-gray-500', light: 'bg-gray-50 text-gray-800 border-gray-200', dot: 'bg-gray-400' },
] as const

const eventMeta = (type: string) => EVENT_TYPES.find((t) => t.value === type) || EVENT_TYPES[3]

const STATUS_OPTIONS = ['SCHEDULED', 'COMPLETED', 'CANCELLED']

// ============================================
// Date helpers
// ============================================

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59) }
function startOfWeek(d: Date) { const s = new Date(d); s.setDate(s.getDate() - s.getDay()); s.setHours(0,0,0,0); return s }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }
function isToday(d: Date) { return isSameDay(d, new Date()) }
function isPast(d: Date) { const t = new Date(); t.setHours(0,0,0,0); return d < t }
function formatTime(d: Date) { return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }
function formatDate(d: Date) { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }
function formatDateLong(d: Date) { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) }
function formatMonthYear(d: Date) { return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
function toLocalDatetime(d: Date) {
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60000)
  return local.toISOString().slice(0, 16)
}
function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ============================================
// Event Form Component
// ============================================

function EventForm({
  event,
  cases,
  onSave,
  onDelete,
  onClose,
  defaultDate,
}: {
  event?: CalEvent | null
  cases: CaseOption[]
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
  defaultDate?: Date
}) {
  const now = defaultDate || new Date()
  const defaultStart = event ? new Date(event.startAt) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0)
  const defaultEnd = event ? new Date(event.endAt) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0)

  const [title, setTitle] = useState(event?.title || '')
  const [eventType, setEventType] = useState(event?.eventType || 'GENERAL')
  const [allDay, setAllDay] = useState(event?.allDay || false)
  const [startAt, setStartAt] = useState(allDay ? toLocalDate(defaultStart) : toLocalDatetime(defaultStart))
  const [endAt, setEndAt] = useState(allDay ? toLocalDate(defaultEnd) : toLocalDatetime(defaultEnd))
  const [location, setLocation] = useState(event?.location || '')
  const [courtroom, setCourtroom] = useState(event?.courtroom || '')
  const [judge, setJudge] = useState(event?.judge || '')
  const [clientId, setClientId] = useState(event?.clientId || '')
  const [description, setDescription] = useState(event?.description || '')
  const [status, setStatus] = useState(event?.status || 'SCHEDULED')
  const [reminderMinutes, setReminderMinutes] = useState<string>(
    event?.reminderMinutes != null ? String(event.reminderMinutes) : ''
  )
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleAllDayToggle = (checked: boolean) => {
    setAllDay(checked)
    if (checked) {
      setStartAt(toLocalDate(new Date(startAt)))
      setEndAt(toLocalDate(new Date(endAt)))
    } else {
      const s = new Date(startAt + 'T09:00')
      const e = new Date(endAt + 'T10:00')
      setStartAt(toLocalDatetime(s))
      setEndAt(toLocalDatetime(e))
    }
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        eventType,
        allDay,
        startAt: allDay ? new Date(startAt + 'T00:00:00').toISOString() : new Date(startAt).toISOString(),
        endAt: allDay ? new Date(endAt + 'T23:59:59').toISOString() : new Date(endAt).toISOString(),
        location: location || null,
        courtroom: courtroom || null,
        judge: judge || null,
        clientId: clientId || null,
        description: description || null,
        status,
        reminderMinutes: reminderMinutes ? parseInt(reminderMinutes) : null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <input
        type="text"
        placeholder="Event title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-lg font-semibold bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none py-2 placeholder:text-gray-300"
        autoFocus
      />

      {/* Event Type */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {EVENT_TYPES.map((t) => {
          const Icon = t.icon
          const selected = eventType === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setEventType(t.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                selected ? `${t.light} border-current font-medium` : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* All day toggle */}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => handleAllDayToggle(e.target.checked)}
          className="rounded border-gray-300"
        />
        All day
      </label>

      {/* Date/Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Start</label>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">End</label>
          <input
            type={allDay ? 'date' : 'datetime-local'}
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Location</label>
        <input
          type="text"
          placeholder="Address or room name"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
        />
      </div>

      {/* Court Date specifics */}
      {eventType === 'COURT_DATE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Courtroom</label>
            <input
              type="text"
              placeholder="e.g., Courtroom 1450"
              value={courtroom}
              onChange={(e) => setCourtroom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Judge</label>
            <input
              type="text"
              placeholder="e.g., Hon. Patricia Simmons"
              value={judge}
              onChange={(e) => setJudge(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* Case link */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Linked Case (optional)</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-white"
        >
          <option value="">No case linked</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Reminder */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Reminder</label>
        <select
          value={reminderMinutes}
          onChange={(e) => setReminderMinutes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-white"
        >
          <option value="">No reminder</option>
          <option value="15">15 minutes before</option>
          <option value="30">30 minutes before</option>
          <option value="60">1 hour before</option>
          <option value="120">2 hours before</option>
          <option value="1440">1 day before</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Notes</label>
        <textarea
          placeholder="Additional details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none resize-none"
        />
      </div>

      {/* Status (edit only) */}
      {event && (
        <div>
          <label className="text-xs text-gray-500 block mb-1">Status</label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  status === s
                    ? s === 'COMPLETED' ? 'bg-green-100 text-green-800' : s === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div>
          {event && onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Delete this event?</span>
                <button onClick={onDelete} className="text-xs text-red-600 font-medium hover:underline">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:underline">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            )
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? 'Saving...' : event ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Event Detail Card
// ============================================

function EventCard({ event, onClick }: { event: CalEvent; onClick: () => void }) {
  const meta = eventMeta(event.eventType)
  const Icon = meta.icon
  const start = new Date(event.startAt)
  const past = event.status === 'COMPLETED' || event.status === 'CANCELLED'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all active:scale-[0.99] ${
        past ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${meta.light}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${past ? 'line-through text-gray-400' : 'text-gray-900'}`}>{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
          {event.allDay ? (
            <span>All day</span>
          ) : (
            <span>{formatTime(start)}</span>
          )}
          {event.client && <span>· {event.client.name}</span>}
          {event.location && (
            <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{event.location.length > 30 ? event.location.slice(0, 30) + '...' : event.location}</span>
          )}
        </div>
        {event.courtroom && (
          <p className="text-xs text-purple-600 mt-0.5">{event.courtroom}{event.judge ? ` · ${event.judge}` : ''}</p>
        )}
      </div>
      {event.outlookEventId && (
        <div className="shrink-0 mt-1" title="Synced with Outlook">
          <RefreshCw className="h-3 w-3 text-blue-400" />
        </div>
      )}
    </button>
  )
}

// ============================================
// Month Grid
// ============================================

function MonthGrid({
  month,
  events,
  selectedDate,
  onSelectDate,
}: {
  month: Date
  events: CalEvent[]
  selectedDate: Date | null
  onSelectDate: (d: Date) => void
}) {
  const first = startOfMonth(month)
  const gridStart = startOfWeek(first)

  const weeks: Date[][] = []
  let current = new Date(gridStart)
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current))
      current = addDays(current, 1)
    }
    if (w === 5 && week[0].getMonth() !== month.getMonth()) break
    weeks.push(week)
  }

  const eventsOnDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.startAt), day))

  return (
    <div>
      <div className="grid grid-cols-7 gap-px">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
        {weeks.flat().map((day, i) => {
          const inMonth = day.getMonth() === month.getMonth()
          const today = isToday(day)
          const selected = selectedDate && isSameDay(day, selectedDate)
          const dayEvents = eventsOnDay(day)

          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={`relative min-h-[72px] md:min-h-[90px] p-1.5 text-left transition-colors ${
                inMonth ? 'bg-white' : 'bg-gray-50'
              } ${selected ? 'ring-2 ring-blue-500 ring-inset' : ''} hover:bg-blue-50`}
            >
              <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                today ? 'bg-blue-600 text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'
              }`}>
                {day.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => {
                  const m = eventMeta(e.eventType)
                  return (
                    <div key={e.id} className={`text-[10px] leading-tight truncate px-1 py-0.5 rounded ${m.light}`}>
                      <span className="hidden md:inline">{e.allDay ? '' : formatTime(new Date(e.startAt)) + ' '}</span>
                      {e.title}
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// Week View
// ============================================

function WeekView({
  weekStart,
  events,
  onSelectEvent,
}: {
  weekStart: Date
  events: CalEvent[]
  onSelectEvent: (e: CalEvent) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: 14 }, (_, i) => i + 6) // 6am to 7pm

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
          <div />
          {days.map((d, i) => (
            <div key={i} className={`text-center py-2 text-xs ${isToday(d) ? 'text-blue-600 font-bold' : 'text-gray-500 font-medium'}`}>
              <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className={`text-lg ${isToday(d) ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' : ''}`}>
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* All-day events */}
        {(() => {
          const allDayEvents = days.map((day) =>
            events.filter((e) => e.allDay && isSameDay(new Date(e.startAt), day))
          )
          const hasAny = allDayEvents.some((a) => a.length > 0)
          if (!hasAny) return null
          return (
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50">
              <div className="text-[10px] text-gray-400 p-1">All day</div>
              {allDayEvents.map((dayEvts, i) => (
                <div key={i} className="p-0.5 space-y-0.5">
                  {dayEvts.map((e) => {
                    const m = eventMeta(e.eventType)
                    return (
                      <button key={e.id} onClick={() => onSelectEvent(e)}
                        className={`w-full text-[10px] truncate px-1 py-0.5 rounded ${m.light} hover:opacity-80`}>
                        {e.title}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        })()}

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {hours.map((h) => (
            <div key={h} className="contents">
              <div className="text-[10px] text-gray-400 text-right pr-2 pt-0 h-12 border-b border-gray-100">
                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </div>
              {days.map((day, di) => {
                const slotEvents = events.filter((e) => {
                  if (e.allDay) return false
                  const s = new Date(e.startAt)
                  return isSameDay(s, day) && s.getHours() === h
                })
                return (
                  <div key={di} className="relative h-12 border-b border-l border-gray-100">
                    {slotEvents.map((e) => {
                      const m = eventMeta(e.eventType)
                      return (
                        <button key={e.id} onClick={() => onSelectEvent(e)}
                          className={`absolute left-0.5 right-0.5 top-0.5 text-[10px] truncate px-1 py-0.5 rounded ${m.light} z-10 hover:opacity-80`}
                          style={{ minHeight: '20px' }}>
                          {e.title}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Day View
// ============================================

function DayView({
  day,
  events,
  onSelectEvent,
  onCreateAt,
}: {
  day: Date
  events: CalEvent[]
  onSelectEvent: (e: CalEvent) => void
  onCreateAt: (date: Date) => void
}) {
  const hours = Array.from({ length: 18 }, (_, i) => i + 5) // 5am to 10pm
  const dayEvents = events.filter((e) => isSameDay(new Date(e.startAt), day))
  const allDayEvents = dayEvents.filter((e) => e.allDay)
  const timedEvents = dayEvents.filter((e) => !e.allDay)

  const eventAtHour = (h: number) =>
    timedEvents.filter((e) => new Date(e.startAt).getHours() === h)

  const eventSpansHour = (e: CalEvent, h: number) => {
    const s = new Date(e.startAt)
    const end = new Date(e.endAt)
    return s.getHours() < h && end.getHours() > h
  }

  const spanningAtHour = (h: number) =>
    timedEvents.filter((e) => eventSpansHour(e, h))

  const durationSlots = (e: CalEvent) => {
    const s = new Date(e.startAt)
    const end = new Date(e.endAt)
    const mins = (end.getTime() - s.getTime()) / 60000
    return Math.max(1, Math.round(mins / 60))
  }

  return (
    <div>
      {/* Day header */}
      <div className={`text-center py-3 border-b border-gray-200 ${isToday(day) ? 'bg-blue-50' : ''}`}>
        <div className={`text-sm ${isToday(day) ? 'text-blue-600 font-bold' : 'text-gray-500 font-medium'}`}>
          {day.toLocaleDateString('en-US', { weekday: 'long' })}
        </div>
        <div className={`text-3xl font-bold mt-0.5 ${
          isToday(day)
            ? 'bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto'
            : 'text-gray-900'
        }`}>
          {day.getDate()}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {day.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 p-2 space-y-1">
          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">All day</div>
          {allDayEvents.map((e) => {
            const m = eventMeta(e.eventType)
            const Icon = m.icon
            return (
              <button key={e.id} onClick={() => onSelectEvent(e)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg ${m.light} hover:opacity-80 transition-opacity`}>
                <Icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-medium truncate block">{e.title}</span>
                  {e.client && <span className="text-xs opacity-70">{e.client.name}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="grid grid-cols-[60px_1fr]">
        {hours.map((h) => {
          const starting = eventAtHour(h)
          const spanning = spanningAtHour(h)

          return (
            <div key={h} className="contents">
              <div className="text-xs text-gray-400 text-right pr-3 pt-1 h-16 border-b border-gray-100">
                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </div>
              <button
                onClick={() => {
                  const d = new Date(day)
                  d.setHours(h, 0, 0, 0)
                  onCreateAt(d)
                }}
                className="relative h-16 border-b border-gray-100 hover:bg-blue-50/50 transition-colors"
              >
                {starting.map((e) => {
                  const m = eventMeta(e.eventType)
                  const Icon = m.icon
                  const slots = durationSlots(e)
                  return (
                    <div
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); onSelectEvent(e) }}
                      className={`absolute left-1 right-1 top-0.5 rounded-lg px-3 py-1.5 ${m.light} z-10 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden border`}
                      style={{ height: `${slots * 64 - 4}px` }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-sm font-medium truncate">{e.title}</span>
                      </div>
                      <div className="text-xs opacity-70 mt-0.5">
                        {formatTime(new Date(e.startAt))} – {formatTime(new Date(e.endAt))}
                        {e.location && <span className="ml-1">· {e.location.length > 25 ? e.location.slice(0, 25) + '...' : e.location}</span>}
                      </div>
                      {e.client && (
                        <div className="text-xs opacity-60 mt-0.5">{e.client.name}</div>
                      )}
                    </div>
                  )
                })}
                {spanning.length > 0 && starting.length === 0 && (
                  <div className="absolute inset-0 pointer-events-none" />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// Main Calendar Page
// ============================================

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [cases, setCases] = useState<CaseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [view, setView] = useState<View>('month')
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null)
  const [detailEvent, setDetailEvent] = useState<CalEvent | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const loadEvents = useCallback(async (month: Date) => {
    const start = new Date(month.getFullYear(), month.getMonth() - 1, 1)
    const end = new Date(month.getFullYear(), month.getMonth() + 2, 0)
    const res = await fetch(`/api/attorney/calendar?start=${start.toISOString()}&end=${end.toISOString()}`)
    if (res.ok) {
      const data = await res.json()
      setEvents(data.events || [])
      setSyncEnabled(data.outlookSyncEnabled || false)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      loadEvents(currentMonth),
      fetch('/api/clients').then((r) => r.ok ? r.json() : []),
    ]).then(([, clientData]) => {
      const list = Array.isArray(clientData) ? clientData : clientData?.clients || []
      setCases(list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
    }).finally(() => setLoading(false))
  }, [currentMonth, loadEvents])

  const filteredEvents = useMemo(() => {
    if (!typeFilter) return events
    return events.filter((e) => e.eventType === typeFilter)
  }, [events, typeFilter])

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return []
    return filteredEvents
      .filter((e) => isSameDay(new Date(e.startAt), selectedDate))
      .sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      })
  }, [filteredEvents, selectedDate])

  const agendaEvents = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return filteredEvents
      .filter((e) => new Date(e.startAt) >= addDays(now, -30))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  }, [filteredEvents])

  const agendaGrouped = useMemo(() => {
    const groups: { date: Date; label: string; events: CalEvent[] }[] = []
    for (const e of agendaEvents) {
      const d = new Date(e.startAt)
      d.setHours(0, 0, 0, 0)
      const last = groups[groups.length - 1]
      if (last && isSameDay(last.date, d)) {
        last.events.push(e)
      } else {
        groups.push({
          date: d,
          label: isToday(d) ? 'Today' : isPast(d) ? formatDate(d) + ' (past)' : formatDate(d),
          events: [e],
        })
      }
    }
    return groups
  }, [agendaEvents])

  const navigate = (dir: -1 | 1) => {
    if (view === 'day') {
      const next = addDays(selectedDate || new Date(), dir)
      setSelectedDate(next)
      if (next.getMonth() !== currentMonth.getMonth()) setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1))
    } else if (view === 'week') {
      const next = addDays(selectedDate || new Date(), dir * 7)
      setSelectedDate(next)
      if (next.getMonth() !== currentMonth.getMonth()) setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1))
    } else {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + dir, 1))
    }
  }
  const prevMonth = () => navigate(-1)
  const nextMonth = () => navigate(1)
  const goToday = () => { setCurrentMonth(new Date()); setSelectedDate(new Date()) }

  const handleSave = async (data: Record<string, unknown>) => {
    const url = editingEvent
      ? `/api/attorney/calendar/${editingEvent.id}`
      : '/api/attorney/calendar'
    const method = editingEvent ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setShowForm(false)
      setEditingEvent(null)
      setDetailEvent(null)
      await loadEvents(currentMonth)
    }
  }

  const handleDelete = async () => {
    if (!editingEvent) return
    const res = await fetch(`/api/attorney/calendar/${editingEvent.id}`, { method: 'DELETE' })
    if (res.ok) {
      setShowForm(false)
      setEditingEvent(null)
      setDetailEvent(null)
      await loadEvents(currentMonth)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch('/api/attorney/calendar/sync', { method: 'POST' })
      await loadEvents(currentMonth)
    } finally {
      setSyncing(false)
    }
  }

  const openCreate = (date?: Date) => {
    setEditingEvent(null)
    setSelectedDate(date || selectedDate || new Date())
    setShowForm(true)
    setDetailEvent(null)
  }

  const openEdit = (event: CalEvent) => {
    setEditingEvent(event)
    setShowForm(true)
    setDetailEvent(null)
  }

  const openDetail = (event: CalEvent) => {
    setDetailEvent(event)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-48" />
        <div className="h-96 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Court dates, deadlines, and appointments</p>
        </div>
        <div className="flex items-center gap-2">
          {syncEnabled && (
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{syncing ? 'Syncing...' : 'Sync Outlook'}</span>
            </Button>
          )}
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden md:inline">New Event</span>
            <span className="md:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* View toggle + Month nav */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 rounded-lg transition-colors min-w-[160px] text-center">
            {view === 'day' && selectedDate
              ? formatDateLong(selectedDate)
              : view === 'week' && selectedDate
                ? `Week of ${formatDate(startOfWeek(selectedDate))}`
                : formatMonthYear(currentMonth)}
          </button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="ml-1 text-xs">
            Today
          </Button>
        </div>

        {/* View selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['month', 'week', 'day', 'agenda'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTypeFilter(null)}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            !typeFilter ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          All
        </button>
        {EVENT_TYPES.map((t) => {
          const active = typeFilter === t.value
          return (
            <button
              key={t.value}
              onClick={() => setTypeFilter(active ? null : t.value)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                active ? `${t.light} border-current` : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${t.dot}`} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Main Content: Calendar + Side Panel */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Calendar */}
        <div className="flex-1 min-w-0">
          {view === 'month' && (
            <MonthGrid
              month={currentMonth}
              events={filteredEvents}
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                if (selectedDate && isSameDay(d, selectedDate)) {
                  setView('day')
                } else {
                  setSelectedDate(d)
                }
              }}
            />
          )}
          {view === 'week' && (
            <WeekView
              weekStart={startOfWeek(selectedDate || new Date())}
              events={filteredEvents}
              onSelectEvent={openDetail}
            />
          )}
          {view === 'day' && (
            <DayView
              day={selectedDate || new Date()}
              events={filteredEvents}
              onSelectEvent={openDetail}
              onCreateAt={(d) => { setSelectedDate(d); openCreate(d) }}
            />
          )}
          {view === 'agenda' && (
            <div className="space-y-6">
              {agendaGrouped.length === 0 ? (
                <div className="text-center py-16">
                  <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No events to show</p>
                </div>
              ) : (
                agendaGrouped.map((group) => (
                  <div key={group.date.toISOString()}>
                    <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
                      isToday(group.date) ? 'text-blue-600' : isPast(group.date) ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <CalendarDays className="h-4 w-4" />
                      {group.label}
                      {isToday(group.date) && <Badge className="bg-blue-100 text-blue-700" variant="outline">Today</Badge>}
                    </h3>
                    <div className="space-y-2">
                      {group.events.map((e) => (
                        <EventCard key={e.id} event={e} onClick={() => openDetail(e)} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Side Panel (desktop: always visible, mobile: overlay only for form/detail) */}
        <div className={`md:w-80 md:shrink-0 ${
          (showForm || detailEvent)
            ? 'fixed inset-0 z-50 bg-black/30 md:static md:bg-transparent md:z-auto flex items-end md:items-start justify-center md:block'
            : (view === 'month' && selectedDate)
              ? 'hidden md:block'
              : 'hidden md:block'
        }`}>
          <div className={`bg-white rounded-t-2xl md:rounded-xl border border-gray-200 shadow-lg md:shadow-sm w-full md:w-80 max-h-[85vh] md:max-h-none overflow-y-auto ${
            showForm || detailEvent ? 'p-4' : 'p-4'
          }`}>
            {/* Close for mobile overlay */}
            {(showForm || detailEvent) && (
              <button
                onClick={() => { setShowForm(false); setEditingEvent(null); setDetailEvent(null) }}
                className="md:hidden absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {showForm ? (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">
                  {editingEvent ? 'Edit Event' : 'New Event'}
                </h3>
                <EventForm
                  event={editingEvent}
                  cases={cases}
                  onSave={handleSave}
                  onDelete={editingEvent ? handleDelete : undefined}
                  onClose={() => { setShowForm(false); setEditingEvent(null) }}
                  defaultDate={selectedDate || undefined}
                />
              </div>
            ) : detailEvent ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <Badge className={eventMeta(detailEvent.eventType).light}>
                    {eventMeta(detailEvent.eventType).label}
                  </Badge>
                  <button onClick={() => openEdit(detailEvent)} className="text-gray-400 hover:text-blue-600 p-1">
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="font-semibold text-lg text-gray-900">{detailEvent.title}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    {detailEvent.allDay
                      ? formatDateLong(new Date(detailEvent.startAt))
                      : `${formatDateLong(new Date(detailEvent.startAt))}, ${formatTime(new Date(detailEvent.startAt))} – ${formatTime(new Date(detailEvent.endAt))}`
                    }
                  </div>
                  {detailEvent.location && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      {detailEvent.location}
                    </div>
                  )}
                  {detailEvent.courtroom && (
                    <div className="flex items-center gap-2 text-purple-700">
                      <Gavel className="h-4 w-4" />
                      {detailEvent.courtroom}{detailEvent.judge ? ` · ${detailEvent.judge}` : ''}
                    </div>
                  )}
                  {detailEvent.client && (
                    <Link href={`/attorney/cases/${detailEvent.client.id}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline">
                      <Users className="h-4 w-4" />
                      {detailEvent.client.name}
                    </Link>
                  )}
                  {detailEvent.description && (
                    <p className="text-gray-500 pt-2 border-t border-gray-100">{detailEvent.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant={
                      detailEvent.status === 'COMPLETED' ? 'low' :
                      detailEvent.status === 'CANCELLED' ? 'outline' : 'medium'
                    }>
                      {detailEvent.status === 'COMPLETED' && <Check className="h-3 w-3 mr-1" />}
                      {detailEvent.status}
                    </Badge>
                    {detailEvent.outlookEventId && (
                      <span className="text-[10px] text-blue-400 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> Outlook
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(detailEvent)}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDetailEvent(null)}>
                    Close
                  </Button>
                </div>
              </div>
            ) : view === 'month' && selectedDate ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {isToday(selectedDate) ? 'Today' : formatDate(selectedDate)}
                  </h3>
                  <button onClick={() => openCreate(selectedDate)} className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarDays className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No events</p>
                    <button onClick={() => openCreate(selectedDate)} className="text-xs text-blue-600 hover:underline mt-1">
                      Schedule something
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map((e) => (
                      <EventCard key={e.id} event={e} onClick={() => openDetail(e)} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarDays className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Select a date to see events</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => openCreate()}
        className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}
