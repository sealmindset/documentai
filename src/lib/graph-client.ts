/**
 * Shared Microsoft Graph API client.
 *
 * Provides token acquisition (client credentials flow) and a typed fetch
 * wrapper used by email-service, sharepoint-service, and other Graph consumers.
 *
 * Required Entra app permissions vary by consumer:
 * - Mail.Send (email)
 * - Sites.Read.All + Files.Read.All (SharePoint)
 */

let cachedToken: { token: string; expiresAt: number } | null = null

export function extractTenantFromIssuer(): string | undefined {
  const issuer = process.env.OIDC_ISSUER_URL || ''
  const match = issuer.match(/login\.microsoftonline\.com\/([0-9a-f-]{36})/i)
  return match?.[1]
}

export function getTenantId(): string {
  const tenantId = process.env.M365_TENANT_ID || extractTenantFromIssuer()
  if (!tenantId) {
    throw new Error('M365_TENANT_ID or OIDC_ISSUER_URL with tenant ID is required')
  }
  return tenantId
}

export async function getGraphToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const tenantId = getTenantId()
  const clientId = process.env.OIDC_CLIENT_ID
  const clientSecret = process.env.OIDC_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('OIDC_CLIENT_ID and OIDC_CLIENT_SECRET are required for Graph API')
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to obtain Graph token: ${res.status} ${body}`)
  }

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.token
}

export async function graphFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getGraphToken()
  const url = path.startsWith('https://')
    ? path
    : `https://graph.microsoft.com/v1.0${path}`

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

export function isGraphConfigured(): boolean {
  const tenantId = process.env.M365_TENANT_ID || extractTenantFromIssuer()
  return !!(tenantId && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET)
}
