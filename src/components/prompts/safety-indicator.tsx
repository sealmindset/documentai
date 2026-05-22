'use client'

import { Badge } from '@/components/ui/badge'
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'

export type SafetyLevel = 'safe' | 'warning' | 'blocked' | 'unknown'

interface SafetyIndicatorProps {
  level: SafetyLevel
  warnings?: string[]
  blockedReasons?: string[]
  compact?: boolean
}

const config: Record<SafetyLevel, {
  icon: typeof ShieldCheck
  label: string
  variant: 'low' | 'medium' | 'critical' | 'secondary'
}> = {
  safe: { icon: ShieldCheck, label: 'Safe', variant: 'low' },
  warning: { icon: ShieldAlert, label: 'Warning', variant: 'medium' },
  blocked: { icon: ShieldX, label: 'Blocked', variant: 'critical' },
  unknown: { icon: ShieldCheck, label: 'Unchecked', variant: 'secondary' },
}

export function SafetyIndicator({ level, warnings, blockedReasons, compact }: SafetyIndicatorProps) {
  const { icon: Icon, label, variant } = config[level]

  if (compact) {
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-1">
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
      {warnings && warnings.length > 0 && (
        <ul className="text-xs text-amber-600 space-y-0.5 pl-1">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="mt-0.5">•</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
      {blockedReasons && blockedReasons.length > 0 && (
        <ul className="text-xs text-red-600 space-y-0.5 pl-1">
          {blockedReasons.map((r, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="mt-0.5">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function getSafetyLevel(prompt: {
  status?: string
  _warnings?: string[]
  _blockedReasons?: string[]
}): SafetyLevel {
  if (prompt._blockedReasons && prompt._blockedReasons.length > 0) return 'blocked'
  if (prompt._warnings && prompt._warnings.length > 0) return 'warning'
  if (prompt.status === 'published') return 'safe'
  return 'unknown'
}
