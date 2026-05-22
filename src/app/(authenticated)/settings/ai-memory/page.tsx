'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import { Brain, Plus, Search, Bot, BarChart3 } from 'lucide-react'

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
  createdBy: string | null
  isApproved: boolean
  createdAt: string
}

const CATEGORIES = ['preference', 'procedure', 'relationship', 'fact', 'pattern']

const categoryColor: Record<string, 'info' | 'low' | 'medium' | 'high' | 'secondary'> = {
  preference: 'info',
  procedure: 'low',
  relationship: 'medium',
  fact: 'secondary',
  pattern: 'high',
}

export default function UserAiMemoryPage() {
  const [memories, setMemories] = useState<BrainMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('fact')
  const [newTags, setNewTags] = useState('')

  const fetchMemories = useCallback(async () => {
    const params = new URLSearchParams({ limit: '100' })
    if (filterCategory !== 'all') params.set('category', filterCategory)

    const res = await fetch(`/api/brain?${params}`)
    if (res.ok) {
      setMemories(await res.json())
    } else if (res.status === 403) {
      setEnabled(false)
    }
    setLoading(false)
  }, [filterCategory])

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ limit: '100' })
    if (filterCategory !== 'all') params.set('category', filterCategory)

    fetch(`/api/brain?${params}`)
      .then((res) => {
        if (res.ok) return res.json()
        if (res.status === 403) { if (!cancelled) setEnabled(false) }
        return []
      })
      .then((data) => { if (!cancelled) setMemories(data) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [filterCategory])

  async function handleCreate() {
    const tags = newTags.split(',').map((t) => t.trim()).filter(Boolean)
    const res = await fetch('/api/brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newContent,
        category: newCategory,
        tags: tags.length > 0 ? tags : undefined,
      }),
    })

    if (res.ok) {
      setCreateOpen(false)
      setNewContent('')
      setNewCategory('fact')
      setNewTags('')
      fetchMemories()
    }
  }

  const filtered = memories.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return m.content.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
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
            <p className="font-medium">AI Memory is not enabled</p>
            <p className="text-sm text-muted-foreground mt-1">Contact your administrator to enable the Brain Layer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Memory
          </h1>
          <p className="text-muted-foreground mt-1">
            Things the AI remembers about your cases and preferences
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Memory
        </Button>
      </div>

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
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No memories yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              As the AI processes your cases, it will build up contextual memory here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((memory) => (
            <Card key={memory.id}>
              <CardContent className="py-4">
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
                    <Badge variant="outline" className="text-[10px]">{memory.entityType}</Badge>
                  )}
                </div>
                <p className="text-sm">{memory.content}</p>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {(memory.confidence * 100).toFixed(0)}%
                  </span>
                  <span>accessed {memory.accessCount}x</span>
                  <span>{new Date(memory.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
              <label className="text-sm font-medium">What should the AI remember?</label>
              <textarea
                className="w-full mt-1 p-3 rounded-md border bg-background text-sm min-h-[100px] resize-y"
                placeholder="e.g., Marcus Thompson's probation officer is Jennifer Wilson at 612-555-0303"
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
                <label className="text-sm font-medium">Tags (optional)</label>
                <Input
                  className="mt-1"
                  placeholder="e.g., thompson, probation"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                />
              </div>
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
