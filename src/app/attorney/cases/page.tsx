'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Briefcase,
  Search,
  ChevronRight,
  AlertTriangle,
  FileText,
  Filter,
} from 'lucide-react'

interface CaseItem {
  id: string
  name: string
  status: string
  caseNumber: string | null
  court: string | null
  priorityTier: string | null
  reviewScore: number | null
  openIssues: number
  openActions: number
  documents: number
}

const STATUS_FILTERS = ['All', 'ACTIVE', 'PENDING', 'NEW'] as const

export default function CasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  useEffect(() => {
    fetch('/api/attorney/briefing')
      .then((r) => r.json())
      .then((data) => setCases(data.cases || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = cases.filter((c) => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        (c.caseNumber || '').toLowerCase().includes(q) ||
        (c.court || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const priorityBadge = (tier: string | null) => {
    switch (tier) {
      case 'CRITICAL': return <Badge variant="critical">Critical</Badge>
      case 'HIGH': return <Badge variant="high">High</Badge>
      case 'MEDIUM': return <Badge variant="medium">Medium</Badge>
      case 'LOW': return <Badge variant="low">Low</Badge>
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Cases</h1>
        <p className="text-sm text-gray-500 mt-1">{cases.length} active case{cases.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Search and filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cases, case numbers..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {s === 'All' ? 'All Cases' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Case list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/attorney/cases/${c.id}`}
              className="flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all active:scale-[0.99]"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                c.priorityTier === 'CRITICAL' ? 'bg-red-100' :
                c.priorityTier === 'HIGH' ? 'bg-orange-100' :
                c.priorityTier === 'MEDIUM' ? 'bg-yellow-50' :
                'bg-gray-100'
              }`}>
                <Briefcase className={`h-6 w-6 ${
                  c.priorityTier === 'CRITICAL' ? 'text-red-600' :
                  c.priorityTier === 'HIGH' ? 'text-orange-600' :
                  'text-gray-500'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">{c.name}</p>
                  {priorityBadge(c.priorityTier)}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {c.caseNumber || 'No case number'}
                  {c.court ? ` · ${c.court}` : ''}
                </p>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                  {c.openIssues > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-orange-400" />
                      {c.openIssues} issue{c.openIssues !== 1 ? 's' : ''}
                    </span>
                  )}
                  {c.openActions > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      {c.openActions} action{c.openActions !== 1 ? 's' : ''} due
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {c.documents} doc{c.documents !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {search ? 'No cases match your search' : 'No active cases'}
          </p>
        </div>
      )}
    </div>
  )
}
