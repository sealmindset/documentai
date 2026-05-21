// ============================================
// OIDC Client -- provider-agnostic
// ============================================
// Works with any OIDC provider (mock-oidc in dev, Azure AD/Okta/etc in prod).
// All URLs come from environment variables and OIDC discovery.

const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || 'mock-oidc-client'
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET || 'mock-oidc-secret'

function assertOidcSecret() {
  if (OIDC_CLIENT_SECRET === 'mock-oidc-secret') {
    if (process.env.ENFORCE_SECRETS === 'true') {
      throw new Error('FATAL: OIDC_CLIENT_SECRET must be set in production. Do not use the mock value.')
    }
  }
}

interface OIDCConfig {
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
  end_session_endpoint?: string
}

let cachedConfig: OIDCConfig | null = null

/**
 * Fetch the OIDC discovery document and cache it.
 */
export async function getOIDCConfig(): Promise<OIDCConfig> {
  if (cachedConfig) return cachedConfig

  const issuerUrl = process.env.OIDC_ISSUER_URL
  if (!issuerUrl) {
    throw new Error('OIDC_ISSUER_URL environment variable is not set')
  }

  const res = await fetch(
    `${issuerUrl}/.well-known/openid-configuration`,
    { cache: 'no-store' }
  )

  if (!res.ok) {
    throw new Error(
      `Failed to fetch OIDC discovery document from ${issuerUrl}: ${res.status}`
    )
  }

  cachedConfig = (await res.json()) as OIDCConfig
  return cachedConfig
}

/**
 * Build the OIDC authorization URL for the login redirect.
 */
export async function getAuthorizationUrl(
  redirectUri: string,
  state: string
): Promise<string> {
  const config = await getOIDCConfig()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OIDC_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    state,
  })

  return `${config.authorization_endpoint}?${params.toString()}`
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; id_token?: string }> {
  assertOidcSecret()
  const config = await getOIDCConfig()

  const res = await fetch(config.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: OIDC_CLIENT_ID,
      client_secret: OIDC_CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token exchange failed: ${res.status} ${body}`)
  }

  return res.json()
}

/**
 * Get user info from the OIDC provider using the access token.
 */
export async function getUserInfo(
  accessToken: string
): Promise<{ sub: string; email: string; name: string }> {
  const config = await getOIDCConfig()

  const res = await fetch(config.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`Userinfo request failed: ${res.status}`)
  }

  const info = await res.json()
  return {
    sub: info.sub,
    email: info.email || info.preferred_username || '',
    name: info.name || info.preferred_username || info.email || '',
  }
}
