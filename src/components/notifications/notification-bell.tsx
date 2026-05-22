'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellOff, CheckCheck, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  NotificationItem,
  getTypeConfig,
  type NotificationData,
} from './notification-item'

const POLL_INTERVAL = 30_000 // 30 seconds

function getEntityRoute(entityType: string | null, entityId: string | null): string | null {
  if (!entityType) return null
  switch (entityType) {
    case 'Client':
      return entityId ? `/clients/${entityId}` : '/clients'
    case 'Issue':
      return '/issues'
    case 'ActionItem':
      return '/issues'
    case 'Document':
      return '/documents'
    case 'CaseReview':
      return '/case-reviews'
    default:
      return '/dashboard'
  }
}

function entityLabel(entityType: string | null): string {
  switch (entityType) {
    case 'Client': return 'clients'
    case 'Issue': return 'issues'
    case 'ActionItem': return 'action items'
    case 'Document': return 'documents'
    case 'CaseReview': return 'reviews'
    default: return 'dashboard'
  }
}

export function NotificationBell() {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<NotificationData | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch unread count (lightweight, used for polling)
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count')
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.unreadCount)
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [])

  // Fetch full notification list
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?status=UNREAD&limit=20')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch {
      // Silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCount()
    const interval = setInterval(fetchCount, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchCount])

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Toggle dropdown
  const toggleDropdown = () => {
    const next = !isOpen
    setIsOpen(next)
    if (next) fetchNotifications()
  }

  // Mark a single notification as read
  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setUnreadCount((c) => Math.max(0, c - 1))
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString(), status: 'READ' } : n))
      )
    } catch {
      // Silently ignore
    }
  }

  // Mark all as read
  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setUnreadCount(0)
      setNotifications([])
      setIsOpen(false)
    } catch {
      // Silently ignore
    }
  }

  // Click a notification item
  const handleItemClick = (notification: NotificationData) => {
    setSelected(notification)
    setIsOpen(false)
    if (!notification.readAt) {
      markAsRead(notification.id)
    }
  }

  // Navigate to related entity
  const handleGoTo = () => {
    if (!selected) return
    const route = getEntityRoute(selected.relatedEntityType, selected.relatedEntityId)
    setSelected(null)
    if (route) router.push(route)
  }

  const selectedConfig = selected ? getTypeConfig(selected.notificationType) : null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={toggleDropdown}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-lg border border-gray-200 bg-white shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <BellOff className="h-8 w-8 mb-2" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={handleItemClick}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            {selectedConfig && (
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${selectedConfig.bg} ${selectedConfig.text}`}>
                  {selectedConfig.label}
                </span>
                {selected?.sentBy && (
                  <span className="text-xs text-gray-500">
                    from {selected.sentBy}
                  </span>
                )}
              </div>
            )}
            <DialogTitle className="text-lg">{selected?.title}</DialogTitle>
            {selected?.createdAt && (
              <DialogDescription>
                {new Date(selected.createdAt).toLocaleString()}
              </DialogDescription>
            )}
          </DialogHeader>

          {selected?.message && (
            <div className="py-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {selected.message}
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected?.relatedEntityType && (
              <Button onClick={handleGoTo} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Go to {entityLabel(selected.relatedEntityType)}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
