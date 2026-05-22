'use client'

import { Badge } from '@/components/ui/badge'
import { GitCommitHorizontal, User, Clock } from 'lucide-react'

interface Version {
  id: string
  version: number
  content: string
  changeSummary: string | null
  changedBy: string | null
  createdAt: string
}

interface VersionTimelineProps {
  versions: Version[]
  currentContent: string
  onRestore?: (content: string) => void
}

export function VersionTimeline({ versions, currentContent, onRestore }: VersionTimelineProps) {
  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No version history yet. Versions are created when you edit a prompt.
      </p>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
      <div className="space-y-4">
        {versions.map((v, i) => {
          const isCurrent = v.content === currentContent
          return (
            <div key={v.id} className="relative flex gap-3">
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    i === 0
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <GitCommitHorizontal className="h-3 w-3" />
                </div>
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">v{v.version}</span>
                  {i === 0 && <Badge variant="info">Latest</Badge>}
                  {isCurrent && <Badge variant="low">Active</Badge>}
                </div>
                {v.changeSummary && (
                  <p className="text-sm text-muted-foreground mt-0.5">{v.changeSummary}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                  {v.changedBy && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {v.changedBy}
                    </span>
                  )}
                </div>
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    View content ({v.content.length} chars)
                  </summary>
                  <pre className="text-xs font-mono bg-muted p-3 rounded-md mt-1 overflow-x-auto whitespace-pre-wrap max-h-48">
                    {v.content}
                  </pre>
                  {onRestore && !isCurrent && (
                    <button
                      className="text-xs text-primary hover:underline mt-1"
                      onClick={() => onRestore(v.content)}
                    >
                      Restore this version
                    </button>
                  )}
                </details>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
