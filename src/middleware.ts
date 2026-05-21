import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const jwtSecretValue = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue)

function assertSecrets() {
  if (jwtSecretValue === 'dev-secret-change-in-production') {
    if (process.env.ENFORCE_SECRETS === 'true') {
      throw new Error('FATAL: JWT_SECRET must be set in production. Do not use the default value.')
    }
    if (process.env.NODE_ENV === 'production') {
      console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET and ENFORCE_SECRETS=true in production.')
    }
  }
}

// Pages that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/callback']

// External frontend URL for redirects (not request.url which is Docker-internal)
const FRONTEND_URL =
  process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3020}`

// ---------- General API Rate Limiting (in-memory, per-IP) ----------
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = parseInt(process.env.API_RATE_LIMIT_REQUESTS_PER_MINUTE || '100', 10)
const rateLimitStore = new Map<string, number[]>()

function checkRateLimit(ip: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  let timestamps = rateLimitStore.get(ip) || []
  timestamps = timestamps.filter((t) => t > cutoff)
  if (timestamps.length >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil(Math.max(timestamps[0] + RATE_LIMIT_WINDOW_MS - now, 1000) / 1000)
    rateLimitStore.set(ip, timestamps)
    return { limited: true, retryAfter }
  }
  timestamps.push(now)
  rateLimitStore.set(ip, timestamps)
  return { limited: false }
}

// Cleanup stale entries every 5 minutes
if (typeof globalThis !== 'undefined') {
  const interval = (globalThis as Record<string, unknown>).__rateLimitCleanupInterval
  if (!interval) {
    ;(globalThis as Record<string, unknown>).__rateLimitCleanupInterval = setInterval(() => {
      const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS
      for (const [key, timestamps] of rateLimitStore) {
        const filtered = timestamps.filter((t) => t > cutoff)
        if (filtered.length === 0) rateLimitStore.delete(key)
        else rateLimitStore.set(key, filtered)
      }
    }, 5 * 60_000)
  }
}

export async function middleware(request: NextRequest) {
  assertSecrets()
  const { pathname } = request.nextUrl

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // --- General rate limiting on API routes ---
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = checkRateLimit(ip)
    if (rl.limited) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfter || 60),
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    // --- Content-Type validation on write methods ---
    const method = request.method
    if (['POST', 'PUT', 'PATCH'].includes(method) && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      const contentType = request.headers.get('content-type') || ''
      const contentLength = request.headers.get('content-length')
      // Skip validation for empty-body requests (e.g. logout POST)
      const hasBody = contentLength !== '0' && contentLength !== null
      if (hasBody) {
        // Allow JSON, form-data (file uploads), and URL-encoded forms
        const validContentTypes = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded']
        if (!validContentTypes.some((ct) => contentType.includes(ct))) {
          return NextResponse.json(
            { error: 'Unsupported Content-Type' },
            { status: 415 }
          )
        }
      }
    }
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check for JWT cookie
  const token = request.cookies.get('token')?.value
  if (!token) {
    // Redirect to login for pages, 401 for API
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', FRONTEND_URL))
  }

  // Verify JWT
  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    // Invalid/expired token
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', FRONTEND_URL))
  }
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
