'use client'

import { AlertTriangle, FileText, Shield, Bell } from 'lucide-react'

export interface NotificationData {
  id: string
  notificationType: string
  title: string
  message: string | null
  relatedEntityType: string | null
  relatedEntityId: string | null
  sentBy: string | null
  readAt: string | null
  status: string
  createdAt: string
}

const TYPE_CONFIG: Record<string, { border: string; bg: string; text: string; icon: typeof Bell; label: string }> = {
  ESCALATION: {
    border: 'border-l-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: AlertTriangle,
    label: 'Escalation',
  },
  REMEDIATION_REQUIRED: {
    border: 'border-l-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    icon: Shield,
    label: 'Remediation',
  },
  DOCUMENT_REQUEST: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: FileText,
    label: 'Document Request',
  },
}

const DEFAULT_CONFIG = {
  border: 'border-l-gray-300',
  bg: 'bg-gray-50',
  text: 'text-gray-700',
  icon: Bell,
  label: 'Notification',
}

export function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || DEFAULT_CONFIG
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return `${Math.floor(diffDay / 30)}mo ago`
}

interface NotificationItemProps {
  notification: NotificationData
  onClick: (notification: NotificationData) => void
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const config = getTypeConfig(notification.notificationType)
  const Icon = config.icon
  const isUnread = !notification.readAt

  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={`w-full text-left px-4 py-3 border-l-4 ${config.border} hover:bg-gray-50 transition-colors ${
        isUnread ? 'bg-white' : 'bg-gray-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-1.5 rounded-md ${config.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${config.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium truncate ${isUnread ? 'text-gray-900' : 'text-gray-500'}`}>
              {notification.title}
            </p>
            {isUnread && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {notification.sentBy && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.bg} ${config.text}`}>
                {notification.sentBy}
              </span>
            )}
            <span className="text-xs text-gray-400">{timeAgo(notification.createdAt)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
