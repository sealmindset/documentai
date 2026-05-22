'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  Scale,
} from 'lucide-react'

interface BriefingData {
  todayEvents: { id: string; title: string; type: string; clientId: string; clientName: string; date: string }[]
  urgent: {
    actions: { id: string; title: string; dueDate: string; isOverdue: boolean; clientId: string; clientName: string; severity: string }[]
    issues: { id: string; title: string; severity: string; clientId: string; clientName: string }[]
  }
  cases: {
    id: string; name: string; status: string; caseNumber: string | null; court: string | null;
    priorityTier: string | null; reviewScore: number | null; openIssues: number; openActions: number; documents: number
  }[]
  alerts: { id: string; title: string; message: string; severity: string; createdAt: string }[]
  stats: { totalCases: number; openIssues: number; overdueActions: number; pendingDocs: number }
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function BriefingPage() {
  const { user } = useAuth()
  const [data, setData] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/attorney/briefing')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'Counselor'

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-4 bg-gray-100 rounded w-96" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const hasUrgent = data.urgent.actions.length > 0 || data.urgent.issues.length > 0
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-gray-500 mt-1">{todayStr}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Link href="/attorney/cases" className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <Briefcase className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{data.stats.totalCases}</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Active Cases</p>
        </Link>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span className="text-2xl font-bold text-gray-900">{data.stats.openIssues}</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Open Issues</p>
        </div>
        <div className={`bg-white rounded-xl p-4 border ${data.stats.overdueActions > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <Clock className="h-5 w-5 text-red-500" />
            <span className={`text-2xl font-bold ${data.stats.overdueActions > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {data.stats.overdueActions}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Overdue</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <FileText className="h-5 w-5 text-gray-400" />
            <span className="text-2xl font-bold text-gray-900">{data.stats.pendingDocs}</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Pending Docs</p>
        </div>
      </div>

      {/* Today's Schedule */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-500" />
            Today
          </h2>
          <Link href="/attorney/calendar" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            Full calendar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.todayEvents.length > 0 ? (
          <div className="space-y-2">
            {data.todayEvents.map((event) => (
              <Link
                key={event.id}
                href={`/attorney/cases/${event.clientId}`}
                className="flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Scale className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{event.title}</p>
                  <p className="text-sm text-gray-500">{event.clientName}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No court dates today</p>
          </div>
        )}
      </section>

      {/* Urgent Items */}
      {hasUrgent && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Needs Attention
          </h2>
          <div className="space-y-2">
            {data.urgent.actions.map((action) => {
              const days = daysUntil(action.dueDate)
              return (
                <Link
                  key={action.id}
                  href={`/attorney/cases/${action.clientId}`}
                  className={`flex items-center gap-4 rounded-xl p-4 border transition-colors ${
                    action.isOverdue
                      ? 'bg-red-50 border-red-200 hover:border-red-300'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    action.isOverdue ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    <Clock className={`h-5 w-5 ${action.isOverdue ? 'text-red-600' : 'text-yellow-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{action.title}</p>
                    <p className="text-sm text-gray-500">{action.clientName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={action.isOverdue ? 'critical' : days <= 3 ? 'high' : 'medium'}>
                      {action.isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                    </Badge>
                  </div>
                </Link>
              )
            })}
            {data.urgent.issues.map((issue) => (
              <Link
                key={issue.id}
                href={`/attorney/cases/${issue.clientId}`}
                className="flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{issue.title}</p>
                  <p className="text-sm text-gray-500">{issue.clientName}</p>
                </div>
                <Badge variant={issue.severity === 'CRITICAL' ? 'critical' : 'high'}>
                  {issue.severity}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Active Cases */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-gray-600" />
            Active Cases
          </h2>
          <Link href="/attorney/cases" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="space-y-2">
          {data.cases.slice(0, 8).map((c) => (
            <Link
              key={c.id}
              href={`/attorney/cases/${c.id}`}
              className="flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                c.priorityTier === 'CRITICAL' ? 'bg-red-100' :
                c.priorityTier === 'HIGH' ? 'bg-orange-100' :
                'bg-gray-100'
              }`}>
                <Briefcase className={`h-5 w-5 ${
                  c.priorityTier === 'CRITICAL' ? 'text-red-600' :
                  c.priorityTier === 'HIGH' ? 'text-orange-600' :
                  'text-gray-500'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-sm text-gray-500">
                  {c.caseNumber || 'No case number'}{c.court ? ` · ${c.court}` : ''}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 shrink-0">
                {c.openIssues > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                    {c.openIssues}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  {c.documents}
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
