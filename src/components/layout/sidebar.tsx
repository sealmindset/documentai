'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import {
  LayoutDashboard,
  Building2,
  FileText,
  AlertTriangle,
  ClipboardCheck,
  BarChart3,
  Settings,
  Bot,
  Shield,
  Users,
  KeyRound,
  MessageSquare,
  Activity,
  BookUser,
  FileStack,
  FilePen,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string // resource.action format; omit for items visible to all authenticated users
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Building2, permission: 'clients.view' },
  { name: 'Contacts', href: '/contacts', icon: BookUser, permission: 'contacts.view' },
  { name: 'Document Reviews', href: '/case-reviews', icon: ClipboardCheck, permission: 'case-reviews.view' },
  { name: 'Documents', href: '/documents', icon: FileText, permission: 'documents.view' },
  { name: 'Issues', href: '/issues', icon: AlertTriangle, permission: 'issues.view' },
  { name: 'Templates', href: '/templates', icon: FileStack, permission: 'templates.view' },
  { name: 'Generate', href: '/generate', icon: FilePen, permission: 'generated-documents.create' },
  { name: 'Reports', href: '/reports', icon: BarChart3, permission: 'reports.view' },
  { name: 'AI Agents', href: '/agents', icon: Bot, permission: 'agents.view' },
]

const adminNavigation: NavItem[] = [
  { name: 'Users', href: '/admin/users', icon: Users, permission: 'users.view' },
  { name: 'Roles', href: '/admin/roles', icon: KeyRound, permission: 'roles.view' },
  { name: 'Prompts', href: '/admin/prompts', icon: MessageSquare, permission: 'prompts.view' },
  { name: 'Activity Logs', href: '/admin/logs', icon: Activity, permission: 'logs.view' },
  { name: 'App Settings', href: '/admin/settings', icon: Settings, permission: 'settings.view' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, hasPermission } = useAuth()

  const isVisible = (item: NavItem) => {
    if (!item.permission) return true
    const [resource, action] = item.permission.split('.')
    return hasPermission(resource, action)
  }

  const visibleNav = navigation.filter(isVisible)
  const visibleAdmin = adminNavigation.filter(isVisible)

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-800">
        <Shield className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-lg font-bold text-white">Document AI</h1>
          <p className="text-xs text-gray-400">Vanmerven Law Firm</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}

        {/* Admin section */}
        {visibleAdmin.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administration
              </h3>
            </div>
            {visibleAdmin.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Agent Status */}
      <div className="border-t border-gray-800 p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          AI Agents
        </h3>
        <div className="space-y-2">
          {['LEXA', 'CLARA', 'DORA', 'ARIA', 'RITA', 'ATLAS', 'AURA'].map((agent) => (
            <div key={agent} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-400">{agent}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User info at bottom */}
      {user && (
        <div className="border-t border-gray-800 px-4 py-3">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <p className="text-xs text-gray-400 truncate">{user.role_name}</p>
        </div>
      )}
    </div>
  )
}
