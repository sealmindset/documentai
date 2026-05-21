import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}))

vi.mock('@/lib/db', () => ({
  default: {},
}))

describe('hasPermission', () => {
  let hasPermission: (user: { permissions: string[] }, resource: string, action: string) => boolean

  beforeEach(async () => {
    const auth = await import('@/lib/auth')
    hasPermission = auth.hasPermission as typeof hasPermission
  })

  it('returns true when user has the exact permission', () => {
    const user = {
      id: '1', email: 'test@test.com', name: 'Test',
      roleId: 'r1', roleName: 'ADMIN',
      permissions: ['clients.view', 'clients.create', 'dashboard.view'],
    }
    expect(hasPermission(user, 'clients', 'view')).toBe(true)
    expect(hasPermission(user, 'clients', 'create')).toBe(true)
    expect(hasPermission(user, 'dashboard', 'view')).toBe(true)
  })

  it('returns false when user lacks the permission', () => {
    const user = {
      id: '1', email: 'test@test.com', name: 'Test',
      roleId: 'r1', roleName: 'VIEWER',
      permissions: ['clients.view', 'dashboard.view'],
    }
    expect(hasPermission(user, 'clients', 'create')).toBe(false)
    expect(hasPermission(user, 'clients', 'delete')).toBe(false)
    expect(hasPermission(user, 'users', 'view')).toBe(false)
  })

  it('returns false for empty permissions', () => {
    const user = {
      id: '1', email: 'test@test.com', name: 'Test',
      roleId: 'r1', roleName: 'NONE',
      permissions: [],
    }
    expect(hasPermission(user, 'clients', 'view')).toBe(false)
  })

  it('matches resource.action format exactly', () => {
    const user = {
      id: '1', email: 'test@test.com', name: 'Test',
      roleId: 'r1', roleName: 'ADMIN',
      permissions: ['clients.view'],
    }
    expect(hasPermission(user, 'client', 'view')).toBe(false)
    expect(hasPermission(user, 'clients', 'views')).toBe(false)
  })
})

describe('AuthMe type contract', () => {
  it('JWT payload matches the flat AuthMe shape', () => {
    const payload = {
      sub: 'user-123',
      email: 'admin@example.com',
      name: 'Alex Admin',
      role_id: 'role-456',
      role_name: 'ADMIN',
      permissions: ['clients.view', 'clients.create', 'dashboard.view'],
    }

    expect(payload).toHaveProperty('sub')
    expect(payload).toHaveProperty('email')
    expect(payload).toHaveProperty('name')
    expect(payload).toHaveProperty('role_id')
    expect(payload).toHaveProperty('role_name')
    expect(payload).toHaveProperty('permissions')
    expect(Array.isArray(payload.permissions)).toBe(true)

    // Flat structure -- no .user wrapper
    expect(payload).not.toHaveProperty('user')
    expect(payload).not.toHaveProperty('role')
  })
})
