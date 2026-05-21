'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, Column } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MessageSquare, Save, History, Bot } from 'lucide-react'

interface ManagedPrompt {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  agentName: string | null
  content: string
  model: string | null
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

  // Editor state
  const [editPrompt, setEditPrompt] = useState<PromptDetail | null>(null)
  const [editContent, setEditContent] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [saving, setSaving] = useState(false)

  // Version history state
  const [historyPrompt, setHistoryPrompt] = useState<PromptDetail | null>(null)

  const fetchPrompts = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
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
      const detail: PromptDetail = await res.json()
      setEditPrompt(detail)
      setEditContent(detail.content)
      setChangeSummary('')
    }
  }

  async function openHistory(promptId: string) {
    const res = await fetch(`/api/admin/prompts/${promptId}`)
    if (res.ok) {
      setHistoryPrompt(await res.json())
    }
  }

  async function savePrompt() {
    if (!editPrompt) return
    setSaving(true)

    const res = await fetch(`/api/admin/prompts/${editPrompt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: editContent,
        changeSummary: changeSummary || undefined,
      }),
    })

    if (res.ok) {
      setEditPrompt(null)
      fetchPrompts()
    }
    setSaving(false)
  }

  async function toggleActive(prompt: ManagedPrompt) {
    await fetch(`/api/admin/prompts/${prompt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !prompt.isActive }),
    })
    fetchPrompts()
  }

  const columns: Column<ManagedPrompt>[] = [
    {
      key: 'agentName',
      header: 'Agent',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.agentName || 'System',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{row.agentName || '—'}</span>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground font-mono">{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      render: (row) => <Badge variant="outline">{row.category}</Badge>,
    },
    {
      key: 'model',
      header: 'Tier',
      filterable: true,
      filterValue: (row) => row.model || 'Default',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.model || '—'}</span>
      ),
    },
    {
      key: '_count.versions',
      header: 'Versions',
      sortable: true,
      className: 'text-center',
      render: (row) => <span className="text-sm">{row._count.versions}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      filterable: true,
      filterValue: (row) => row.isActive ? 'Active' : 'Inactive',
      render: (row) => (
        <Badge
          variant={row.isActive ? 'low' : 'critical'}
          className="cursor-pointer"
          onClick={(e) => { e.stopPropagation(); toggleActive(row) }}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-muted-foreground">
          {new Date(row.updatedAt).toLocaleDateString()}
          {row.updatedBy && <div className="text-xs">by {row.updatedBy}</div>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (row) => (
        <div className="space-x-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" onClick={() => openEditor(row.id)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openHistory(row.id)}
            disabled={row._count.versions === 0}
          >
            <History className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          AI Prompt Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Edit and manage AI agent prompts without redeploying
        </p>
      </div>

      {/* Prompts table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={prompts}
            loading={loading}
            searchPlaceholder="Search prompts..."
            emptyIcon={<MessageSquare className="h-12 w-12 text-gray-300 mb-3" />}
            emptyTitle="No prompts found"
            emptyDescription="Prompts will appear here when configured."
          />
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={!!editPrompt} onOpenChange={() => setEditPrompt(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Edit: {editPrompt?.name}
            </DialogTitle>
          </DialogHeader>
          {editPrompt && (
            <div className="space-y-4">
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{editPrompt.agentName}</Badge>
                <Badge variant="outline">{editPrompt.category}</Badge>
                <span className="font-mono">{editPrompt.slug}</span>
              </div>

              {editPrompt.description && (
                <p className="text-sm text-muted-foreground">{editPrompt.description}</p>
              )}

              <div>
                <label className="text-sm font-medium">Prompt Content</label>
                <textarea
                  className="w-full mt-1 p-3 rounded-md border bg-background font-mono text-sm min-h-[400px] resize-y"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Change Summary (optional)</label>
                <Input
                  placeholder="What did you change and why?"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {editContent.length} characters
                  {editContent !== editPrompt.content && (
                    <span className="text-yellow-600 ml-2">Modified</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditContent(editPrompt.content)}>
                    Reset
                  </Button>
                  <Button
                    onClick={savePrompt}
                    disabled={saving || editContent === editPrompt.content}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={!!historyPrompt} onOpenChange={() => setHistoryPrompt(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History: {historyPrompt?.name}
            </DialogTitle>
          </DialogHeader>
          {historyPrompt && (
            <div className="space-y-4">
              {historyPrompt.versions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No version history yet. Versions are created when you edit a prompt.
                </p>
              ) : (
                historyPrompt.versions.map((v) => (
                  <Card key={v.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">
                          Version {v.version}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground">
                          {new Date(v.createdAt).toLocaleString()}
                          {v.changedBy && ` by ${v.changedBy}`}
                        </div>
                      </div>
                      {v.changeSummary && (
                        <p className="text-sm text-muted-foreground">{v.changeSummary}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap max-h-40">
                        {v.content}
                      </pre>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
