'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import {
  Shield,
  Bot,
  Database,
  Bell,
} from 'lucide-react'

const AI_AGENTS = [
  { name: 'LEXA', desc: 'Legal Examination & Assessment', tier: 'standard' },
  { name: 'CLARA', desc: 'Comprehensive Legal Analysis & Review', tier: 'complex' },
  { name: 'DORA', desc: 'Documentation & Outreach Retrieval', tier: 'simple' },
  { name: 'ARIA', desc: 'Automated Review, Identification & Analysis', tier: 'complex' },
  { name: 'RITA', desc: 'Report Intelligence & Threat Assessment', tier: 'standard' },
  { name: 'ATLAS', desc: 'Action Tracking & Legal Advisory System', tier: 'standard' },
  { name: 'AURA', desc: 'Automated Upload & Recognition Agent', tier: 'simple' },
]

const tierColor = (t: string) => {
  switch (t) {
    case 'complex': return 'critical'
    case 'standard': return 'medium'
    case 'simple': return 'low'
    default: return 'secondary'
  }
}

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">System configuration and status</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current User */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Your Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium">{user?.name || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{user?.email || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Role</dt>
                <dd><Badge variant="info">{user?.role_name || '—'}</Badge></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Authentication</dt>
                <dd className="font-medium">OIDC / SSO</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Framework</dt>
                <dd className="font-medium">Next.js 16</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Database</dt>
                <dd className="font-medium">PostgreSQL</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">ORM</dt>
                <dd className="font-medium">Prisma</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Authentication</dt>
                <dd className="font-medium">OIDC + JWT</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Authorization</dt>
                <dd className="font-medium">Database-driven RBAC</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* AI Agents */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Agents
            </CardTitle>
            <CardDescription>
              Agent configurations and model tier assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AI_AGENTS.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50"
                >
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-2 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm">{agent.name}</span>
                      <Badge variant={tierColor(agent.tier)}>{agent.tier}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{agent.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Model Tier Mapping</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-2 rounded bg-red-50 border border-red-100">
                  <div className="font-medium text-red-800">Complex</div>
                  <div className="text-xs text-red-600">Deep analysis tasks</div>
                </div>
                <div className="p-2 rounded bg-yellow-50 border border-yellow-100">
                  <div className="font-medium text-yellow-800">Standard</div>
                  <div className="text-xs text-yellow-600">General reasoning</div>
                </div>
                <div className="p-2 rounded bg-green-50 border border-green-100">
                  <div className="font-medium text-green-800">Simple</div>
                  <div className="text-xs text-green-600">Fast retrieval tasks</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Email and in-app notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 italic">
              Notification preferences will be configurable in a future update.
              Currently, all notifications are managed by the ATLAS agent.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
