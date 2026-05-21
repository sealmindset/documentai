import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import prisma from '@/lib/db'

// ============================================
// JWT Configuration
// ============================================

const jwtSecretValue = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue)

function assertJwtSecret() {
  if (jwtSecretValue === 'dev-secret-change-in-production') {
    if (process.env.ENFORCE_SECRETS === 'true') {
      throw new Error('FATAL: JWT_SECRET must be set in production. Do not use the default value.')
    }
  }
}
const TOKEN_COOKIE = 'token'
const TOKEN_EXPIRY = '8h'

// ============================================
// Types
// ============================================

export interface AuthMe {
  sub: string
  email: string
  name: string
  role_id: string
  role_name: string
  permissions: string[]
}

export interface CurrentUser {
  id: string
  email: string
  name: string
  roleId: string
  roleName: string
  permissions: string[]
}

// ============================================
// JWT Operations
// ============================================

export async function signToken(payload: AuthMe): Promise<string> {
  assertJwtSecret()
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<AuthMe | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AuthMe
  } catch {
    return null
  }
}

// ============================================
// Cookie Operations
// ============================================

// Derive cookie Secure flag from the actual frontend URL protocol, not NODE_ENV.
// In Docker dev, NODE_ENV=production but the frontend is http://localhost:3020.
const COOKIE_SECURE = process.env.NEXTAUTH_URL?.startsWith('https') ?? false

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60, // 8 hours
  })
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(TOKEN_COOKIE)?.value
}

// ============================================
// Current User (for API routes)
// ============================================

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getAuthCookie()
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    roleId: payload.role_id,
    roleName: payload.role_name,
    permissions: payload.permissions,
  }
}

// ============================================
// Permission Checking
// ============================================

export function hasPermission(
  user: CurrentUser,
  resource: string,
  action: string
): boolean {
  return user.permissions.includes(`${resource}.${action}`)
}

/**
 * Check permission and return 403 response if denied.
 * Use in API route handlers:
 *   const denied = await requirePermission('vendors', 'view')
 *   if (denied) return denied
 */
export async function requirePermission(
  resource: string,
  action: string
): Promise<Response | null> {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!hasPermission(user, resource, action)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

// ============================================
// User Lookup (for OIDC callback)
// ============================================

export async function findOrCreateUser(
  oidcSubject: string,
  email: string,
  name: string
) {
  // Try to find by OIDC subject first
  let user = await prisma.user.findUnique({
    where: { oidcSubject: oidcSubject },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  })

  // Fall back to email lookup
  if (!user) {
    user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    })

    // If found by email, update the oidcSubject
    if (user && !user.oidcSubject) {
      await prisma.user.update({
        where: { id: user.id },
        data: { oidcSubject: oidcSubject },
      })
    }
  }

  // If no existing user, create with default VIEWER role
  if (!user) {
    const viewerRole = await prisma.role.findUnique({
      where: { name: 'VIEWER' },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    })

    if (!viewerRole) {
      throw new Error('Default VIEWER role not found. Run seed first.')
    }

    user = await prisma.user.create({
      data: {
        email,
        name,
        oidcSubject: oidcSubject,
        roleId: viewerRole.id,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    })
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })

  return user
}

export function buildAuthPayload(
  user: Awaited<ReturnType<typeof findOrCreateUser>>
): AuthMe {
  const permissions = user.role.rolePermissions.map(
    (rp) => `${rp.permission.resource}.${rp.permission.action}`
  )

  return {
    sub: user.id,
    email: user.email,
    name: user.name || user.email,
    role_id: user.roleId,
    role_name: user.role.name,
    permissions,
  }
}
