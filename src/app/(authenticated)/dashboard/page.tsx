'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Gavel,
  Scale,
  Users,
  XCircle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface DashboardData {
  pipeline: Record<string, number>
  casesByType: { category: string; count: number }[]
  deadlines: { next30: number; next90: number; next180: number }
  motions: {
    count: number
    items: {
      id: string
      documentName: string
      documentType: string
      expirationDate: string | null
      status: string
      client: { id: string; name: string }
    }[]
  }
  caseloadByAttorney: { attorney: string; count: number }[]
  billing: {
    totalFees: number
    activeFees: number
    closedFees: number
    byStatus: { status: string; total: number }[]
  }
  courtCalendar: {
    date: string
    type: string
    title: string
    clientName: string
    clientId: string
  }[]
  alerts: { type: string; message: string; severity: string }[]
  recentActivity: {
    id: string
    agentName: string
    activityType: string
    actionTaken: string
    status: string
    createdAt: string
  }[]
}

const PIPELINE_STAGES = [
  { key: 'NEW', label: 'New', color: 'bg-blue-500', badge: 'info' as const },
  { key: 'ACCEPTED', label: 'Accepted', color: 'bg-yellow-500', badge: 'medium' as const },
  { key: 'ASSIGNED', label: 'Assigned', color: 'bg-orange-500', badge: 'high' as const },
  { key: 'ACTIVE', label: 'Active', color: 'bg-green-500', badge: 'low' as const },
  { key: 'CLOSED', label: 'Closed', color: 'bg-gray-400', badge: 'secondary' as const },
]

const BAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#14b8a6']

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function eventTypeLabel(type: string) {
  switch (type) {
    case 'motion_hearing': return 'Motion Hearing'
    case 'document_deadline': return 'Document Deadline'
    case 'issue_deadline': return 'Issue Deadline'
    case 'action_deadline': return 'Action Deadline'
    default: return type
  }
}

function eventTypeBadge(type: string) {
  switch (type) {
    case 'motion_hearing': return 'critical'
    case 'document_deadline': return 'medium'
    case 'issue_deadline': return 'high'
    case 'action_deadline': return 'info'
    default: return 'secondary'
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.ok ? res.json() : null)
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Failed to load dashboard data
      </div>
    )
  }

  const totalCases = Object.values(data.pipeline).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Managing Partner Dashboard</h1>
        <p className="text-gray-500">Case management overview for Vanmerven Law Firm</p>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                alert.severity === 'critical'
                  ? 'bg-red-50 border border-red-200'
                  : alert.severity === 'high'
                  ? 'bg-orange-50 border border-orange-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 shrink-0 ${
                  alert.severity === 'critical'
                    ? 'text-red-600'
                    : alert.severity === 'high'
                    ? 'text-orange-600'
                    : 'text-yellow-600'
                }`}
              />
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Section 1: Case Pipeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Case Pipeline
          </CardTitle>
          <Link href="/dashboard/pipeline" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {PIPELINE_STAGES.map((stage, i) => {
              const count = data.pipeline[stage.key] || 0
              return (
                <div key={stage.key} className="flex items-center gap-2 flex-1">
                  <Link
                    href={`/dashboard/pipeline?status=${stage.key}`}
                    className="flex-1 p-4 rounded-lg border bg-white hover:shadow-md transition-shadow text-center"
                  >
                    <div className={`h-1.5 rounded-full ${stage.color} mb-3`} />
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-gray-500 mt-1">{stage.label}</div>
                  </Link>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-3 text-right text-sm text-gray-500">
            {totalCases} total cases
          </div>
        </CardContent>
      </Card>

      {/* Section 2: 3-column row — Cases by Type | Deadlines | Motions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases by Type */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Cases by Type
            </CardTitle>
            <Link href="/dashboard/cases-by-type" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.casesByType.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No cases</p>
              ) : (
                data.casesByType.map((ct) => (
                  <div key={ct.category} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate">{ct.category}</span>
                    <Badge variant="outline" className="ml-2 shrink-0">{ct.count}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming Deadlines
            </CardTitle>
            <Link href="/dashboard/deadlines" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Next 30 days', count: data.deadlines.next30, variant: 'critical' as const },
                { label: '31–90 days', count: data.deadlines.next90, variant: 'medium' as const },
                { label: '91–180 days', count: data.deadlines.next180, variant: 'low' as const },
              ].map((bucket) => (
                <div key={bucket.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{bucket.label}</span>
                  <Badge variant={bucket.variant} className="text-sm px-3">
                    {bucket.count}
                  </Badge>
                </div>
              ))}
              <div className="pt-2 border-t text-sm text-gray-500 text-right">
                {data.deadlines.next30 + data.deadlines.next90 + data.deadlines.next180} total
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Motions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Pending Motions
            </CardTitle>
            <Link href="/dashboard/motions" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-3">{data.motions.count}</div>
            <div className="space-y-2">
              {data.motions.items.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <div className="truncate flex-1">
                    <span className="text-gray-700">{m.client.name}</span>
                  </div>
                  {m.expirationDate && (
                    <span className={`text-xs shrink-0 ml-2 ${daysUntil(m.expirationDate) <= 7 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {formatDate(m.expirationDate)}
                    </span>
                  )}
                </div>
              ))}
              {data.motions.count === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No pending motions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: 2-column row — Caseload by Attorney | Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Caseload per Attorney */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Caseload by Attorney
            </CardTitle>
            <Link href="/dashboard/caseload" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.caseloadByAttorney.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No attorney assignments</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.caseloadByAttorney} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="attorney"
                      width={140}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 18) + '…' : v}
                    />
                    <Tooltip />
                    <Bar dataKey="count" name="Cases" radius={[0, 4, 4, 0]}>
                      {data.caseloadByAttorney.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Billing Summary
            </CardTitle>
            <Link href="/dashboard/billing" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="text-sm text-gray-500">Total Fees</div>
                <div className="text-3xl font-bold">{formatCurrency(data.billing.totalFees)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <div className="text-xs text-green-700">Active Cases</div>
                  <div className="text-xl font-bold text-green-800">{formatCurrency(data.billing.activeFees)}</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-600">Closed Cases</div>
                  <div className="text-xl font-bold text-gray-700">{formatCurrency(data.billing.closedFees)}</div>
                </div>
              </div>
              <div className="space-y-2">
                {data.billing.byStatus.map((item) => {
                  const stage = PIPELINE_STAGES.find((s) => s.key === item.status)
                  return (
                    <div key={item.status} className="flex items-center justify-between text-sm">
                      <Badge variant={stage?.badge || 'outline'} className="text-xs">{item.status}</Badge>
                      <span className="text-gray-700">{formatCurrency(item.total)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 4: Court Calendar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Court Calendar — Next 30 Days
          </CardTitle>
          <Link href="/dashboard/calendar" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {data.courtCalendar.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No upcoming calendar events</p>
          ) : (
            <div className="divide-y">
              {data.courtCalendar.slice(0, 8).map((event, i) => {
                const days = daysUntil(event.date)
                return (
                  <div key={i} className="flex items-center gap-4 py-3">
                    <div className="w-16 text-center shrink-0">
                      <div className="text-lg font-bold">{formatDate(event.date)}</div>
                      <div className={`text-xs ${days <= 7 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{event.title}</div>
                      <div className="text-xs text-gray-500">{event.clientName}</div>
                    </div>
                    <Badge variant={eventTypeBadge(event.type) as any} className="shrink-0 text-xs">
                      {eventTypeLabel(event.type)}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Recent AI Agent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent AI Agent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentActivity && data.recentActivity.length > 0 ? (
              data.recentActivity.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg bg-gray-50"
                >
                  <div
                    className={`p-1.5 rounded-full ${
                      activity.status === 'SUCCESS' ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {activity.status === 'SUCCESS' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {activity.agentName}
                      </Badge>
                      <span className="text-xs text-gray-500">{activity.activityType}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">{activity.actionTaken}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
