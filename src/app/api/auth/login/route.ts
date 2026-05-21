import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/oidc'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    // Build the callback URL through the frontend (same-origin proxy)
    const frontendUrl =
      process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3020}`
    const redirectUri = `${frontendUrl}/api/auth/callback`

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(16).toString('hex')

    const authUrl = await getAuthorizationUrl(redirectUri, state)

    // Next.js 16 strips Set-Cookie headers from redirect responses.
    // Workaround: return an HTML page that sets the cookie and then redirects.
    const isSecure = frontendUrl.startsWith('https')
    const cookieFlags = `HttpOnly;SameSite=Lax;Path=/;Max-Age=300${isSecure ? ';Secure' : ''}`

    const html = `<!DOCTYPE html><html><head>
<meta http-equiv="refresh" content="0;url=${authUrl}">
<script>
document.cookie="oidc_state=${state};${cookieFlags}";
window.location.href=${JSON.stringify(authUrl)};
</script>
</head><body>Redirecting...</body></html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Set-Cookie': `oidc_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300${isSecure ? '; Secure' : ''}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    const errorRedirectUrl =
      process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3020}`
    return NextResponse.redirect(
      new URL('/login?error=oidc_unavailable', errorRedirectUrl)
    )
  }
}
