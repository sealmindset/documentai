'use client'

import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Briefcase,
  CalendarDays,
  LayoutDashboard,
  Bell,
  LogOut,
  Search,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/attorney', label: 'Briefing', icon: LayoutDashboard },
  { href: '/attorney/cases', label: 'Cases', icon: Briefcase },
  { href: '/attorney/calendar', label: 'Calendar', icon: CalendarDays },
]

export default function AttorneyLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="animate-pulse text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  const firstName = user.name?.split(' ')[0] || 'Counselor'

  return (
    <div className="flex flex-col h-screen bg-gray-50 md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-lg font-semibold text-gray-900">Document AI</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vanmeveren Law Firm</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = item.href === '/attorney'
              ? pathname === '/attorney'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
              {firstName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role_name}</p>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-gray-600 p-1" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Document AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/attorney/search" className="p-2 text-gray-500 hover:text-gray-700">
              <Search className="h-5 w-5" />
            </Link>
            <Link href="/attorney" className="p-2 text-gray-500 hover:text-gray-700 relative">
              <Bell className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-safe">
          <div className="flex items-center justify-around py-2">
            {NAV_ITEMS.map((item) => {
              const active = item.href === '/attorney'
                ? pathname === '/attorney'
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
