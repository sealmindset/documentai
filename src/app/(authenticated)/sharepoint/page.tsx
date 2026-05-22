'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CloudDownload,
  RefreshCw,
  Plus,
  FolderSync,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  Trash2,
  FileText,
  ExternalLink,
} from 'lucide-react'

interface SyncConfig {
  id: string
  label: string
  siteId: string
  siteName: string
  driveId: string
  driveName: string
  folderPath: string | null
  isEnabled: boolean
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastSyncError: string | null
  lastSyncFileCount: number | null
  pendingCount: number
  totalFiles: number
}

interface SyncFile {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  webUrl: string | null
  status: string
  documentId: string | null
  processedAt: string | null
  errorMessage: string | null
  lastModifiedAt: string | null
  createdAt: string
}

interface Site { id: string; name: string; displayName: string; webUrl: string }
interface Library { id: string; name: string; description: string; webUrl: string }

const syncStatusBadge = (s: string | null) => {
  switch (s) {
    case 'SUCCESS': return 'low'
    case 'SYNCING': return 'info'
    case 'PARTIAL': return 'medium'
    case 'FAILED': return 'critical'
    default: return 'secondary'
  }
}

const fileStatusBadge = (s: string) => {
  switch (s) {
    case 'PROCESSED': return 'low'
    case 'PROCESSING': return 'info'
    case 'PENDING': return 'medium'
    case 'FAILED': return 'critical'
    default: return 'secondary'
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

export default function SharePointPage() {
  const [configs, setConfigs] = useState<SyncConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null)
  const [files, setFiles] = useState<SyncFile[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [processing, setProcessing] = useState<Record<string, boolean>>({})

  // Add dialog state
  const [sites, setSites] = useState<Site[]>([])
  const [libraries, setLibraries] = useState<Library[]>([])
  const [sitesLoading, setSitesLoading] = useState(false)
  const [libsLoading, setLibsLoading] = useState(false)
  const [newConfig, setNewConfig] = useState({
    label: '',
    siteId: '',
    siteName: '',
    driveId: '',
    driveName: '',
    folderPath: '',
  })

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/sharepoint/configs')
      if (res.ok) setConfigs(await res.json())
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfigs() }, [fetchConfigs])

  const fetchFiles = useCallback(async (configId: string) => {
    setFilesLoading(true)
    try {
      const res = await fetch(`/api/sharepoint/configs/${configId}`)
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || [])
      }
    } catch { /* ignore */ } finally {
      setFilesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedConfig) fetchFiles(selectedConfig)
  }, [selectedConfig, fetchFiles])

  const handleAddOpen = async () => {
    setShowAdd(true)
    setSitesLoading(true)
    try {
      const res = await fetch('/api/sharepoint/sites')
      if (res.ok) setSites(await res.json())
      else {
        const err = await res.json()
        alert(err.error || 'Failed to load SharePoint sites')
      }
    } catch {
      alert('Failed to connect to SharePoint. Check your M365 configuration.')
    } finally {
      setSitesLoading(false)
    }
  }

  const handleSiteSelect = async (siteId: string) => {
    const site = sites.find(s => s.id === siteId)
    setNewConfig(c => ({ ...c, siteId, siteName: site?.displayName || site?.name || '' }))
    setLibraries([])
    setLibsLoading(true)
    try {
      const res = await fetch(`/api/sharepoint/libraries?siteId=${encodeURIComponent(siteId)}`)
      if (res.ok) setLibraries(await res.json())
    } catch { /* ignore */ } finally {
      setLibsLoading(false)
    }
  }

  const handleLibrarySelect = (driveId: string) => {
    const lib = libraries.find(l => l.id === driveId)
    setNewConfig(c => ({ ...c, driveId, driveName: lib?.name || '' }))
  }

  const handleCreate = async () => {
    if (!newConfig.label || !newConfig.siteId || !newConfig.driveId) return
    try {
      const res = await fetch('/api/sharepoint/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newConfig,
          folderPath: newConfig.folderPath || undefined,
        }),
      })
      if (res.ok) {
        setShowAdd(false)
        setNewConfig({ label: '', siteId: '', siteName: '', driveId: '', driveName: '', folderPath: '' })
        fetchConfigs()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to create configuration')
      }
    } catch {
      alert('Failed to create sync configuration')
    }
  }

  const handleSync = async (configId: string) => {
    setSyncing(s => ({ ...s, [configId]: true }))
    try {
      const res = await fetch(`/api/sharepoint/configs/${configId}/sync`, { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        alert(`Sync complete: ${result.filesNew} new, ${result.filesUpdated} updated, ${result.filesSkipped} skipped`)
        fetchConfigs()
        if (selectedConfig === configId) fetchFiles(configId)
      } else {
        const err = await res.json()
        alert(err.error || 'Sync failed')
      }
    } catch {
      alert('Sync failed')
    } finally {
      setSyncing(s => ({ ...s, [configId]: false }))
    }
  }

  const handleProcess = async (configId: string) => {
    setProcessing(s => ({ ...s, [configId]: true }))
    try {
      const res = await fetch(`/api/sharepoint/configs/${configId}/process`, { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        alert(`Processed ${result.processed} files (${result.failed} failed)`)
        fetchConfigs()
        if (selectedConfig === configId) fetchFiles(configId)
      } else {
        const err = await res.json()
        alert(err.error || 'Processing failed')
      }
    } catch {
      alert('Processing failed')
    } finally {
      setProcessing(s => ({ ...s, [configId]: false }))
    }
  }

  const handleDelete = async (configId: string) => {
    if (!confirm('Remove this SharePoint connection and all tracked files?')) return
    try {
      await fetch(`/api/sharepoint/configs/${configId}`, { method: 'DELETE' })
      setSelectedConfig(null)
      fetchConfigs()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SharePoint Integration</h1>
          <p className="text-muted-foreground">
            Connect to SharePoint document libraries to automatically ingest legal documents
          </p>
        </div>
        <Button onClick={handleAddOpen}>
          <Plus className="mr-2 h-4 w-4" /> Add Connection
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CloudDownload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No SharePoint connections</h3>
            <p className="text-muted-foreground text-center mb-4">
              Connect to a SharePoint site to start importing documents automatically.
            </p>
            <Button onClick={handleAddOpen}>
              <Plus className="mr-2 h-4 w-4" /> Add Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configs.map(config => (
            <Card
              key={config.id}
              className={`cursor-pointer transition-colors ${selectedConfig === config.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
              onClick={() => setSelectedConfig(config.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{config.label}</CardTitle>
                  <Badge variant={config.isEnabled ? 'default' : 'secondary'}>
                    {config.isEnabled ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {config.siteName} / {config.driveName}
                  {config.folderPath ? ` / ${config.folderPath}` : ''}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Last sync</span>
                  <span className="flex items-center gap-1.5">
                    {config.lastSyncStatus && (
                      <Badge variant={syncStatusBadge(config.lastSyncStatus) as 'low' | 'info' | 'medium' | 'critical' | 'secondary'}>
                        {config.lastSyncStatus}
                      </Badge>
                    )}
                    <span>{formatDate(config.lastSyncAt)}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Files</span>
                  <span>
                    {config.totalFiles} tracked
                    {config.pendingCount > 0 && (
                      <Badge variant="medium" className="ml-1.5">{config.pendingCount} pending</Badge>
                    )}
                  </span>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSync(config.id)}
                    disabled={syncing[config.id]}
                  >
                    {syncing[config.id] ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-3 w-3" />
                    )}
                    Sync
                  </Button>
                  {config.pendingCount > 0 && (
                    <Button
                      size="sm"
                      onClick={() => handleProcess(config.id)}
                      disabled={processing[config.id]}
                    >
                      {processing[config.id] ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="mr-1 h-3 w-3" />
                      )}
                      Process ({config.pendingCount})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive ml-auto"
                    onClick={() => handleDelete(config.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* File list for selected config */}
      {selectedConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderSync className="h-4 w-4" />
              Tracked Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : files.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No files tracked yet. Click &ldquo;Sync&rdquo; to scan the library.
              </p>
            ) : (
              <div className="divide-y">
                {files.map(file => (
                  <div key={file.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileStatusIcon status={file.status} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{file.fileName}</span>
                          {file.webUrl && (
                            <a
                              href={file.webUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatSize(file.fileSize)} &middot; {file.mimeType}
                          {file.lastModifiedAt && ` · Modified ${formatDate(file.lastModifiedAt)}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={fileStatusBadge(file.status) as 'low' | 'info' | 'medium' | 'critical' | 'secondary'}>
                        {file.status}
                      </Badge>
                      {file.errorMessage && (
                        <span className="text-xs text-destructive max-w-[200px] truncate" title={file.errorMessage}>
                          {file.errorMessage}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Connection Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add SharePoint Connection</DialogTitle>
            <DialogDescription>
              Connect to a SharePoint document library to import documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="sp-label">Connection Name</Label>
              <Input
                id="sp-label"
                placeholder="e.g., Case Documents Library"
                value={newConfig.label}
                onChange={e => setNewConfig(c => ({ ...c, label: e.target.value }))}
              />
            </div>
            <div>
              <Label>SharePoint Site</Label>
              {sitesLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading sites...
                </div>
              ) : (
                <Select onValueChange={handleSiteSelect} value={newConfig.siteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a SharePoint site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.displayName || site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {newConfig.siteId && (
              <div>
                <Label>Document Library</Label>
                {libsLoading ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading libraries...
                  </div>
                ) : (
                  <Select onValueChange={handleLibrarySelect} value={newConfig.driveId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a document library" />
                    </SelectTrigger>
                    <SelectContent>
                      {libraries.map(lib => (
                        <SelectItem key={lib.id} value={lib.id}>
                          {lib.name}
                          {lib.description ? ` — ${lib.description}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            {newConfig.driveId && (
              <div>
                <Label htmlFor="sp-folder">Folder Path (optional)</Label>
                <Input
                  id="sp-folder"
                  placeholder="e.g., Legal/Incoming"
                  value={newConfig.folderPath}
                  onChange={e => setNewConfig(c => ({ ...c, folderPath: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to watch the entire library root
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!newConfig.label || !newConfig.siteId || !newConfig.driveId}
            >
              Add Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FileStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'PROCESSED':
      return <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
    case 'PROCESSING':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
    case 'PENDING':
      return <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
    default:
      return <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
  }
}
