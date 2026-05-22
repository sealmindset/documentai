/**
 * Email service — sends via Microsoft Graph API (Mail.Send).
 *
 * Required Entra app permission: Mail.Send (Application)
 * Required env vars: OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, M365_TENANT_ID, M365_SENDER_EMAIL
 */

import { getGraphToken, extractTenantFromIssuer } from './graph-client'

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
