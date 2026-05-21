/**
 * Email service — sends via Microsoft Graph API (Mail.Send).
 *
 * Uses the Entra app registration's client credentials to obtain an
 * access token, then sends mail via the Graph sendMail endpoint on
 * behalf of a configured sender mailbox.
 *
 * Required Entra app permission: Mail.Send (Application)
 * Required env vars: OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, M365_TENANT_ID, M365_SENDER_EMAIL
 */

interface EmailRecipient {
  email: string
  name?: string
}

interface EmailAttachment {
  name: string
  contentType: string
  contentBytes: string // base64-encoded
}

export interface SendEmailParams {
  from?: string
  to: EmailRecipient[]
  cc?: EmailRecipient[]
  bcc?: EmailRecipient[]
  subject: string
  body: string
  bodyType?: 'Text' | 'HTML'
  attachments?: EmailAttachment[]
  saveToSentItems?: boolean
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getGraphToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const tenantId = process.env.M365_TENANT_ID || extractTenantFromIssuer()
  const clientId = process.env.OIDC_CLIENT_ID
  const clientSecret = process.env.OIDC_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'M365 email requires M365_TENANT_ID (or OIDC_ISSUER_URL), OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET'
    )
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

function extractTenantFromIssuer(): string | undefined {
  const issuer = process.env.OIDC_ISSUER_URL || ''
  const match = issuer.match(
    /login\.microsoftonline\.com\/([0-9a-f-]{36})/i
  )
  return match?.[1]
}

function toGraphRecipient(r: EmailRecipient) {
  return {
    emailAddress: {
      address: r.email,
      name: r.name || r.email,
    },
  }
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const senderEmail = params.from || process.env.M365_SENDER_EMAIL
  if (!senderEmail) {
    throw new Error('M365_SENDER_EMAIL is required (or pass "from" in params)')
  }

  const token = await getGraphToken()

  const message: Record<string, unknown> = {
    subject: params.subject,
    body: {
      contentType: params.bodyType || 'HTML',
      content: params.body,
    },
    toRecipients: params.to.map(toGraphRecipient),
  }

  if (params.cc?.length) {
    message.ccRecipients = params.cc.map(toGraphRecipient)
  }
  if (params.bcc?.length) {
    message.bccRecipients = params.bcc.map(toGraphRecipient)
  }
  if (params.attachments?.length) {
    message.attachments = params.attachments.map((a) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.name,
      contentType: a.contentType,
      contentBytes: a.contentBytes,
    }))
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        saveToSentItems: params.saveToSentItems !== false,
      }),
    }
  )

  if (res.status === 202 || res.status === 200) {
    return { success: true }
  }

  const errBody = await res.text()
  console.error(`[Email] Graph sendMail failed: ${res.status}`, errBody)
  return { success: false, error: `Graph API ${res.status}: ${errBody}` }
}

export function isEmailConfigured(): boolean {
  const tenantId = process.env.M365_TENANT_ID || extractTenantFromIssuer()
  return !!(
    tenantId &&
    process.env.OIDC_CLIENT_ID &&
    process.env.OIDC_CLIENT_SECRET &&
    process.env.M365_SENDER_EMAIL
  )
}
