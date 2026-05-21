import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, getUserInfo } from '@/lib/oidc'
import {
  findOrCreateUser,
  buildAuthPayload,
  signToken,
  setAuthCookie,
} from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Use the external frontend URL for all redirects (not request.url which
  // resolves to the Docker-internal address like 0.0.0.0:3000)
  const frontendUrl =
    process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3020}`

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const returnedState = searchParams.get('state')

    if (error) {
      console.error('OIDC error:', error, searchParams.get('error_description'))
      return NextResponse.redirect(
        new URL('/login?error=oidc_denied', frontendUrl)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=no_code', frontendUrl)
      )
    }

    // Validate OIDC state parameter to prevent login CSRF (RFC 6749 Section 10.12)
    const storedState = request.cookies.get('oidc_state')?.value
    if (!storedState || storedState !== returnedState) {
      console.error('OIDC state mismatch: CSRF protection triggered')
      return NextResponse.redirect(
        new URL('/login?error=state_mismatch', frontendUrl)
      )
    }

    const redirectUri = `${frontendUrl}/api/auth/callback`

    // 1. Exchange authorization code for tokens
    const tokens = await exchangeCode(code, redirectUri)

    // 2. Get user info from OIDC provider
    const userInfo = await getUserInfo(tokens.access_token)

    // 3. Find or create user in the database (role comes from DB, not OIDC)
    const user = await findOrCreateUser(
      userInfo.sub,
      userInfo.email,
      userInfo.name
    )

    // 4. Build JWT payload with permissions from database
    const payload = buildAuthPayload(user)

    // 5. Sign JWT
    const token = await signToken(payload)

    // 6. Set httpOnly cookie
    await setAuthCookie(token)

    // 7. Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', frontendUrl))
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', frontendUrl)
    )
  }
}
