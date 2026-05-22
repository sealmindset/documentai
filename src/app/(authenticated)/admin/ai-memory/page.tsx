'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Brain,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Archive,
  Bot,
  Tag,
  BarChart3,
} from 'lucide-react'

interface BrainMemory {
  id: string
  agentName: string | null
  entityType: string | null
  entityId: string | null
  category: string
  content: string
  tags: string
  confidence: number
  accessCount: number
  lastAccessedAt: string | null
  source: string | null
  createdBy: string | null
  isApproved: boolean
  isArchived: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

interface BrainStats {
  total: number
  approved: number
  pending: number
  archived: number
  byCategory: Record<string, number>
  byAgent: Record<string, number>
}

const CATEGORIES = ['preference', 'procedure', 'relationship', 'fact', 'pattern']

const categoryColor: Record<string, 'info' | 'low' | 'medium' | 'high' | 'secondary'> = {
  preference: 'info',
  procedure: 'low',
  relationship: 'medium',
  fact: 'secondary',
  pattern: 'high',
}

export default function AdminAiMemoryPage() {
  const [memories, setMemories] = useState<BrainMemory[]>([])
  const [stats, setStats] = useState<BrainStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(true)

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showPending, setShowPending] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('fact')
  const [newEntityType, setNewEntityType] = useState('')
  const [newTags, setNewTags] = useState('')

  const fetchMemories = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterCategory !== 'all') params.set('category', filterCategory)
    if (showPending) params.set('approvedOnly', 'false')
    params.set('limit', '100')

    const res = await fetch(`/api/brain?${params}`)
    if (res.ok) {
      setMemories(await res.json())
    } else if (res.status === 403) {
      setEnabled(false)
    }
    setLoading(false)
  }, [filterCategory, showPending])

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/brain?action=stats')
    if (res.ok) setStats(await res.json())
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/brain?' + new URLSearchParams({
      ...(filterCategory !== 'all' && { category: filterCategory }),
      ...(showPending && { approvedOnly: 'false' }),
      limit: '100',
    }))
      .then((res) => {
        if (res.ok) return res.json()
        if (res.status === 403) { if (!cancelled) setEnabled(false) }
        return []
      })
      .then((data) => { if (!cancelled) setMemories(data) })
      .finally(() => { if (!cancelled) setLoading(false) })

    fetch('/api/brain?action=stats')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (!cancelled && data) setStats(data) })

    return () => { cancelled = true }
  }, [filterCategory, showPending])

  async function handleCreate() {
    const tags = newTags.split(',').map((t) => t.trim()).filter(Boolean)
    const res = await fetch('/api/brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newContent,
        category: newCategory,
        entityType: newEntityType || undefined,
        tags: tags.length > 0 ? tags : undefined,
      }),
    })

    if (res.ok) {
      setCreateOpen(false)
      setNewContent('')
      setNewCategory('fact')
      setNewEntityType('')
      setNewTags('')
      fetchMemories()
      fetchStats()
    }
  }

  async function handleApprove(id: string) {
    await fetch(`/api/brain/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isApproved: true }),
    })
    fetchMemories()
    fetchStats()
  }

  async function handleArchive(id: string) {
    await fetch(`/api/brain/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived: true }),
    })
    fetchMemories()
    fetchStats()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/brain/${id}`, { method: 'DELETE' })
    fetchMemories()
    fetchStats()
  }

  async function handleDecay() {
    const res = await fetch('/api/brain?action=decay')
    if (res.ok) {
      const data = await res.json()
      alert(`Decayed ${data.decayed} stale memories`)
      fetchMemories()
      fetchStats()
    }
  }

  const filtered = memories.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.content.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      (m.agentName?.toLowerCase().includes(q)) ||
      (m.entityType?.toLowerCase().includes(q))
    )
  })

  if (!enabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Memory
          </h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium">Brain Layer is not enabled</p>
            <p className="text-sm text-muted-foreground mt-1">
              Enable it in App Settings by setting <code className="bg-muted px-1 rounded">brain.enabled</code> to <code className="bg-muted px-1 rounded">true</code>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Memory
          </h1>
          <p className="text-muted-foreground mt-1">
            Persistent context that AI agents use across sessions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDecay}>
            <Clock className="h-4 w-4 mr-1" />
            Run Decay
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Memory
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Active" value={stats.total} />
          <StatCard label="Approved" value={stats.approved} variant="low" />
          <StatCard label="Pending Review" value={stats.pending} variant="medium" />
          <StatCard label="Archived" value={stats.archived} variant="secondary" />
        </div>
      )}

      {/* Breakdown */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4" />
                By Category
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {Object.entries(stats.byCategory).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <Badge variant={categoryColor[cat] || 'secondary'} className="capitalize">{cat}</Badge>
                    <span className="text-sm font-mono">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.byCategory).length === 0 && (
                  <p className="text-xs text-muted-foreground">No memories yet</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4" />
                By Source
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {Object.entries(stats.byAgent).map(([agent, count]) => (
                  <div key={agent} className="flex items-center justify-between">
                    <span className="text-sm font-mono">{agent}</span>
                    <span className="text-sm font-mono">{count}</span>
                  </div>
                ))}
                {Object.keys(stats.byAgent).length === 0 && (
                  <p className="text-xs text-muted-foreground">No memories yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showPending ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPending(!showPending)}
          >
            Pending
          </Button>
        </div>
      </div>

      {/* Memory list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No memories found</p>
            <p className="text-sm text-muted-foreground mt-1">
              AI agents will create memories as they process cases, or you can add them manually.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((memory) => (
            <Card key={memory.id} className="group">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={categoryColor[memory.category] || 'secondary'} className="capitalize text-[10px]">
                        {memory.category}
                      </Badge>
                      {memory.agentName && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Bot className="h-3 w-3" />
                          {memory.agentName}
                        </Badge>
                      )}
                      {memory.entityType && (
                        <Badge variant="outline" className="text-[10px]">
                          {memory.entityType}{memory.entityId ? ` #${memory.entityId.slice(0, 8)}` : ''}
                        </Badge>
                      )}
                      {!memory.isApproved && (
                        <Badge variant="medium" className="text-[10px]">Pending</Badge>
                      )}
                    </div>
                    <p className="text-sm">{memory.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {(memory.confidence * 100).toFixed(0)}% confidence
                      </span>
                      <span>accessed {memory.accessCount}x</span>
                      {memory.createdBy && <span>by {memory.createdBy}</span>}
                      <span>{new Date(memory.createdAt).toLocaleDateString()}</span>
                      {(() => {
                        const tags = JSON.parse(memory.tags) as string[]
                        if (tags.length === 0) return null
                        return <span className="flex gap-1">{tags.map((t) => <Badge key={t} variant="outline" className="text-[9px] px-1 py-0">{t}</Badge>)}</span>
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!memory.isApproved && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleApprove(memory.id)} title="Approve">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleArchive(memory.id)} title="Archive">
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(memory.id)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Add Memory
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Content</label>
              <textarea
                className="w-full mt-1 p-3 rounded-md border bg-background text-sm min-h-[100px] resize-y"
                placeholder="e.g., Judge Reinhardt always requires two copies of filed motions"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Entity Type (optional)</label>
                <Input
                  className="mt-1"
                  placeholder="e.g., Client, Contact, Court"
                  value={newEntityType}
                  onChange={(e) => setNewEntityType(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma-separated, optional)</label>
              <Input
                className="mt-1"
                placeholder="e.g., hennepin, dui, scheduling"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newContent.trim()}>
                Create Memory
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value, variant }: {
  label: string
  value: number
  variant?: 'low' | 'medium' | 'secondary'
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
