'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PromptCard } from '@/components/prompts/prompt-card'
import { PromptEditor } from '@/components/prompts/prompt-editor'
import { getSafetyLevel, type SafetyLevel } from '@/components/prompts/safety-indicator'
import { MessageSquare, Search, LayoutGrid, List, Bot } from 'lucide-react'

interface ManagedPrompt {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  agentName: string | null
  content: string
  model: string | null
  status?: string
  temperature: number | null
  maxTokens: number | null
  isActive: boolean
  updatedBy: string | null
  updatedAt: string
  _count: { versions: number }
}

interface PromptVersion {
  id: string
  version: number
  content: string
  changeSummary: string | null
  changedBy: string | null
  createdAt: string
}

interface PromptDetail extends ManagedPrompt {
  versions: PromptVersion[]
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<ManagedPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAgent, setFilterAgent] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [editPrompt, setEditPrompt] = useState<PromptDetail | null>(null)

  const fetchPrompts = useCallback(async () => {
    const res = await fetch('/api/admin/prompts')
    if (res.ok) setPrompts(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/prompts')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => { if (!cancelled) setPrompts(data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function openEditor(promptId: string) {
    const res = await fetch(`/api/admin/prompts/${promptId}`)
    if (res.ok) {
      setEditPrompt(await res.json())
    }
  }

  const agents = [...new Set(prompts.map((p) => p.agentName).filter(Boolean))] as string[]
  const categories = [...new Set(prompts.map((p) => p.category))]

  const filtered = prompts.filter((p) => {
    if (search) {
      const q = search.toLowerCase()
      const match =
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q)) ||
        (p.agentName?.toLowerCase().includes(q))
      if (!match) return false
    }
    if (filterAgent !== 'all' && p.agentName !== filterAgent) return false
    if (filterCategory !== 'all' && p.category !== filterCategory) return false
    return true
  })

  const stats = {
    total: prompts.length,
    published: prompts.filter((p) => p.status === 'published' || (!p.status && p.isActive)).length,
    draft: prompts.filter((p) => p.status === 'draft').length,
    agents: agents.length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          AI Prompt Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Edit, test, and publish AI agent prompts with safety validation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Prompts" value={stats.total} />
        <StatCard label="Published" value={stats.published} variant="low" />
        <StatCard label="Drafts" value={stats.draft} variant="medium" />
        <StatCard label="Agents" value={stats.agents} variant="info" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-[160px]">
              <Bot className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border rounded-md">
            <Button
              size="icon"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Prompt cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-muted-foreground">No prompts found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || filterAgent !== 'all' || filterCategory !== 'all'
              ? 'Try adjusting your filters'
              : 'Prompts will appear here when configured'}
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'flex flex-col gap-3'
        }>
          {filtered.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              safetyLevel={getSafetyLevel(prompt) as SafetyLevel}
              onEdit={() => openEditor(prompt.id)}
              onHistory={() => openEditor(prompt.id)}
            />
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={!!editPrompt} onOpenChange={() => setEditPrompt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {editPrompt?.name}
            </DialogTitle>
          </DialogHeader>
          {editPrompt && (
            <PromptEditor
              prompt={editPrompt}
              onSaved={() => { setEditPrompt(null); fetchPrompts() }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value, variant }: {
  label: string
  value: number
  variant?: 'low' | 'medium' | 'info'
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-0.5">
        {variant ? (
          <Badge variant={variant} className="text-lg px-2 py-0.5">{value}</Badge>
        ) : (
          value
        )}
      </p>
    </div>
  )
}
