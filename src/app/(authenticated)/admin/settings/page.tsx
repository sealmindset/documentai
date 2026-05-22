'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth-context'
import { Settings, Eye, EyeOff, Save, History } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AppSetting {
  id: string
  key: string
  value: string | null
  groupName: string
  displayName: string
  description: string | null
  valueType: string
  isSensitive: boolean
  requiresRestart: boolean
}

interface AuditEntry {
  id: string
  oldValue: string | null
  newValue: string | null
  changedBy: string | null
  createdAt: string
  setting: { key: string; displayName: string }
}

export default function AppSettingsPage() {
  const { hasPermission } = useAuth()
  const [settings, setSettings] = useState<AppSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({})
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [showAudit, setShowAudit] = useState(false)
  const [activeGroup, setActiveGroup] = useState<string>('')

  const canEdit = hasPermission('settings', 'edit')

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/admin/settings')
    if (res.ok) {
      const data = await res.json()
      setSettings(data)
      if (!activeGroup && data.length > 0) {
        setActiveGroup(data[0].groupName)
      }
    }
    setLoading(false)
  }, [activeGroup])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchSettings() }, [fetchSettings])

  const groups = [...new Set(settings.map((s) => s.groupName))]

  const handleReveal = async (key: string) => {
    if (revealedKeys.has(key)) {
      setRevealedKeys((prev) => { const n = new Set(prev); n.delete(key); return n })
      return
    }
    const res = await fetch(`/api/admin/settings/${key}`)
    if (res.ok) {
      const data = await res.json()
      setRevealedValues((prev) => ({ ...prev, [key]: data.value || '' }))
      setRevealedKeys((prev) => new Set([...prev, key]))
    }
  }

  const handleEdit = (s: AppSetting) => {
    setEditKey(s.key)
    setEditValue(revealedKeys.has(s.key) ? revealedValues[s.key] : (s.value || ''))
  }

  const handleSave = async () => {
    if (!editKey) return
    setSaving(true)
    const res = await fetch(`/api/admin/settings/${editKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: editValue }),
    })
    if (res.ok) {
      setEditKey(null)
      setRevealedKeys(new Set())
      fetchSettings()
    }
    setSaving(false)
  }

  const handleShowAudit = async () => {
    const res = await fetch('/api/admin/settings/audit-log')
    if (res.ok) setAuditLog(await res.json())
    setShowAudit(true)
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading settings...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" /> Application Settings
          </h1>
          <p className="text-muted-foreground">Manage application configuration</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleShowAudit}>
          <History className="h-4 w-4 mr-1" /> Audit Log
        </Button>
      </div>

      {groups.length > 1 && (
        <div className="flex gap-1 border-b">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeGroup === g
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {settings
          .filter((s) => s.groupName === activeGroup)
          .map((s) => (
            <Card key={s.key}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{s.displayName}</span>
                      {s.isSensitive && <Badge variant="outline" className="text-xs">Sensitive</Badge>}
                      {s.requiresRestart && <Badge variant="secondary" className="text-xs">Restart Required</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                    <code className="text-xs text-muted-foreground">{s.key}</code>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editKey === s.key ? (
                      <>
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-64 text-sm"
                          type={s.isSensitive && !revealedKeys.has(s.key) ? 'password' : 'text'}
                        />
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditKey(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-mono max-w-xs truncate">
                          {s.isSensitive
                            ? (revealedKeys.has(s.key) ? revealedValues[s.key] : '********')
                            : (s.value || '(empty)')}
                        </span>
                        {s.isSensitive && canEdit && (
                          <Button size="sm" variant="ghost" onClick={() => handleReveal(s.key)}>
                            {revealedKeys.has(s.key) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        )}
                        {canEdit && (
                          <Button size="sm" variant="outline" onClick={() => handleEdit(s)}>Edit</Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <Dialog open={showAudit} onOpenChange={setShowAudit}>
        <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings Change History</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {auditLog.length === 0 && <p className="text-muted-foreground text-sm">No changes yet.</p>}
            {auditLog.map((entry) => (
              <div key={entry.id} className="border rounded p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{entry.setting.displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Changed by {entry.changedBy || 'unknown'}: {entry.oldValue} → {entry.newValue}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
