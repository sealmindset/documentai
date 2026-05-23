'use client'

import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  BookUser,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  FileStack,
  FilePen,
  FileOutput,
  Mail,
  CloudDownload,
  BarChart3,
  Bot,
  Shield,
  LogOut,
  Scale,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navigation: NavItem[] = [
  { name: 'Firm Overview', href: '/partner', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Building2 },
  { name: 'Contacts', href: '/contacts', icon: BookUser },
  { name: 'Document Reviews', href: '/case-reviews', icon: ClipboardCheck },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Issues', href: '/issues', icon: AlertTriangle },
  { name: 'Templates', href: '/templates', icon: FileStack },
  { name: 'Generate', href: '/generate', icon: FilePen },
  { name: 'Generated Docs', href: '/generated-documents', icon: FileOutput },
  { name: 'Emails', href: '/emails', icon: Mail },
  { name: 'SharePoint', href: '/sharepoint', icon: CloudDownload },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'AI Agents', href: '/agents', icon: Bot },
]

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen">
      <div className="flex h-full w-64 flex-col bg-gray-900 shrink-0">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-800">
          <Shield className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-lg font-bold text-white">Document AI</h1>
            <p className="text-xs text-gray-400">Vanmeveren Law Firm</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              item.href === '/partner'
                ? pathname === '/partner'
                : pathname === item.href || pathname.startsWith(item.href + '/')
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
        </nav>

        {/* Switch to Attorney Portal */}
        <div className="px-3 pb-2">
          <Link
            href="/attorney"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Scale className="h-5 w-5" />
            Attorney Portal
          </Link>
        </div>

        {/* Agent Status */}
        <div className="border-t border-gray-800 p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            AI Agents
          </h3>
          <div className="space-y-2">
            {['LEXA', 'CLARA', 'DORA', 'ARIA', 'RITA', 'ATLAS', 'AURA', 'SAGE', 'ECHO'].map((agent) => (
              <div key={agent} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-400">{agent}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User info */}
        <div className="border-t border-gray-800 px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.role_name}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-white p-1 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
