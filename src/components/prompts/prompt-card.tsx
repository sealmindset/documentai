'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SafetyIndicator, SafetyLevel } from './safety-indicator'
import { VariableList, extractVariables } from './variable-pill'
import { Bot, Clock, Pencil, History, Hash } from 'lucide-react'

interface PromptCardProps {
  prompt: {
    id: string
    slug: string
    name: string
    description: string | null
    category: string
    agentName: string | null
    content: string
    model: string | null
    status?: string
    isActive: boolean
    updatedBy: string | null
    updatedAt: string
    _count: { versions: number }
  }
  safetyLevel: SafetyLevel
  onEdit: () => void
  onHistory: () => void
}

const statusVariant: Record<string, 'low' | 'medium' | 'info' | 'secondary'> = {
  published: 'low',
  testing: 'info',
  draft: 'medium',
}

export function PromptCard({ prompt, safetyLevel, onEdit, onHistory }: PromptCardProps) {
  const variables = extractVariables(prompt.content)
  const status = prompt.status || (prompt.isActive ? 'published' : 'draft')

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{prompt.name}</h3>
              <Badge variant={statusVariant[status] || 'secondary'} className="capitalize text-[10px]">
                {status}
              </Badge>
              <SafetyIndicator level={safetyLevel} compact />
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{prompt.slug}</p>
          </div>
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onHistory}
              disabled={prompt._count.versions === 0}
            >
              <History className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {prompt.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{prompt.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {prompt.agentName && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Bot className="h-3 w-3" />
              {prompt.agentName}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">{prompt.category}</Badge>
          {prompt.model && (
            <Badge variant="secondary" className="text-[10px]">{prompt.model}</Badge>
          )}
        </div>

        {variables.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">Variables</p>
            <VariableList variables={variables} />
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {prompt._count.versions} version{prompt._count.versions !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(prompt.updatedAt).toLocaleDateString()}
            {prompt.updatedBy && ` by ${prompt.updatedBy}`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
