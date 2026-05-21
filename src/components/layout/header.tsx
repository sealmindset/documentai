'use client'

import { Search, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth-context'
import { NotificationBell } from '@/components/notifications/notification-bell'

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search parties, issues..."
            className="pl-9 bg-gray-50 border-gray-200"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <NotificationBell />

        <div className="flex items-center gap-3 border-l pl-4">
          <div className="text-right">
            <p className="text-sm font-medium">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500">{user?.role_name || ''}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            title="User profile"
          >
            <User className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
