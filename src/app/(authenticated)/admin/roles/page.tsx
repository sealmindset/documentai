'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KeyRound, Check } from 'lucide-react'

interface PermissionInfo {
  id: string
  resource: string
  action: string
  description: string | null
}

interface RoleInfo {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  isActive: boolean
  _count: { users: number }
  rolePermissions: { permissionId: string }[]
}

export default function RoleManagementPage() {
  const { hasPermission } = useAuth()
  const [roles, setRoles] = useState<RoleInfo[]>([])
  const [permissions, setPermissions] = useState<PermissionInfo[]>([])
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const canEdit = hasPermission('roles', 'edit')

  // Group permissions by resource
  const groupedPermissions = permissions.reduce<
    Record<string, PermissionInfo[]>
  >((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = []
    acc[p.resource].push(p)
    return acc
  }, {})

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/roles').then((r) => r.json()),
      fetch('/api/admin/permissions').then((r) => r.json()),
    ]).then(([rolesData, permsData]) => {
      setRoles(rolesData)
      setPermissions(permsData)
      if (rolesData.length > 0) setSelectedRole(rolesData[0].id)
      setLoading(false)
    })
  }, [])

  const selectedRoleData = roles.find((r) => r.id === selectedRole)
  const selectedPermIds = new Set(
    selectedRoleData?.rolePermissions.map((rp) => rp.permissionId) || []
  )

  const handleTogglePermission = async (permissionId: string) => {
    if (!selectedRole || !canEdit) return

    const currentIds = selectedRoleData?.rolePermissions.map(
      (rp) => rp.permissionId
    ) || []
    const newIds = currentIds.includes(permissionId)
      ? currentIds.filter((id) => id !== permissionId)
      : [...currentIds, permissionId]

    const res = await fetch(`/api/admin/roles/${selectedRole}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds: newIds }),
    })

    if (res.ok) {
      const updated = await res.json()
      setRoles(roles.map((r) => (r.id === selectedRole ? updated : r)))
    }
  }

  if (loading) return <div className="text-gray-500">Loading roles...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6" /> Role Management
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage roles and their permission assignments
        </p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Role list */}
        <div className="space-y-2">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`w-full text-left rounded-lg p-3 transition-colors ${
                selectedRole === role.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{role.name}</span>
                {role.isSystem && (
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    System
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {role._count.users} user{role._count.users !== 1 ? 's' : ''}
              </p>
            </button>
          ))}
        </div>

        {/* Permission matrix */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">
              Permissions: {selectedRoleData?.name || ''}
            </CardTitle>
            {selectedRoleData?.description && (
              <p className="text-sm text-gray-500">
                {selectedRoleData.description}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                    Resource
                  </th>
                  {['view', 'create', 'edit', 'delete'].map((action) => (
                    <th
                      key={action}
                      className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase"
                    >
                      {action}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <tr key={resource} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 text-sm font-medium capitalize">
                      {resource}
                    </td>
                    {['view', 'create', 'edit', 'delete'].map((action) => {
                      const perm = perms.find((p) => p.action === action)
                      if (!perm) {
                        return (
                          <td key={action} className="text-center py-2 px-3">
                            <span className="text-gray-300">—</span>
                          </td>
                        )
                      }
                      const isGranted = selectedPermIds.has(perm.id)
                      return (
                        <td key={action} className="text-center py-2 px-3">
                          <button
                            onClick={() => handleTogglePermission(perm.id)}
                            disabled={!canEdit}
                            className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                              isGranted
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-gray-300 hover:border-blue-400'
                            } ${!canEdit ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                          >
                            {isGranted && <Check className="h-4 w-4" />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
