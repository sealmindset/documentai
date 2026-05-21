'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Users, Plus, Shield } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  name: string | null
  role: { id: string; name: string }
  isActive: boolean
  lastLogin: string | null
}

interface RoleOption {
  id: string
  name: string
}

export default function UserManagementPage() {
  const { hasPermission } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRoleId, setNewRoleId] = useState('')

  const canEdit = hasPermission('users', 'edit')
  const canCreate = hasPermission('users', 'create')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users').then((r) => r.json()),
      fetch('/api/admin/roles').then((r) => r.json()),
    ]).then(([usersData, rolesData]) => {
      setUsers(usersData)
      setRoles(rolesData)
      setLoading(false)
    })
  }, [])

  const handleAddUser = async () => {
    if (!newEmail || !newRoleId) return
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, name: newName, roleId: newRoleId }),
    })
    if (res.ok) {
      const created = await res.json()
      setUsers([...users, created])
      setShowAdd(false)
      setNewEmail('')
      setNewName('')
      setNewRoleId('')
    }
  }

  const handleRoleChange = async (userId: string, roleId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers(users.map((u) => (u.id === userId ? updated : u)))
    }
  }

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers(users.map((u) => (u.id === userId ? updated : u)))
    }
  }

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.name || '—'}</p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role.name',
      header: 'Role',
      sortable: true,
      filterable: true,
      filterValue: (row) => row.role.name,
      render: (row) =>
        canEdit ? (
          <select
            className="border rounded px-2 py-1 text-sm"
            value={row.role.id}
            onChange={(e) => handleRoleChange(row.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm">
            <Shield className="h-3 w-3" /> {row.role.name}
          </span>
        ),
    },
    {
      key: 'isActive',
      header: 'Status',
      filterable: true,
      filterValue: (row) => row.isActive ? 'Active' : 'Inactive',
      render: (row) => (
        <Badge variant={row.isActive ? 'low' : 'critical'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      render: (row) => (
        <span className="text-gray-500">
          {row.lastLogin ? new Date(row.lastLogin).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    ...(canEdit
      ? [{
          key: 'actions',
          header: '',
          className: 'text-right',
          render: (row: UserRow) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleToggleActive(row.id, row.isActive)
              }}
            >
              {row.isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          ),
        } as Column<UserRow>]
      : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> User Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage user accounts and role assignments
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-2" /> Add User
          </Button>
        )}
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              This person must have an account in your identity provider to sign in.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <Input
                placeholder="Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Input
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={newRoleId}
                onChange={(e) => setNewRoleId(e.target.value)}
              >
                <option value="">Select role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddUser}>Add</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            searchPlaceholder="Search users..."
            emptyIcon={<Users className="h-12 w-12 text-gray-300 mb-3" />}
            emptyTitle="No users"
            emptyDescription="Users will appear here when they sign in."
          />
        </CardContent>
      </Card>
    </div>
  )
}
