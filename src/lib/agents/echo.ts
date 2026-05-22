/**
 * ECHO - Email Communications & Handoff Orchestrator
 *
 * Purpose: Composes and manages outbound emails to prosecutors, paralegals,
 * and other parties, with attorney approval before sending.
 *
 * Responsibilities:
 * - Compose emails from templates with case data auto-filled
 * - Queue emails for attorney review/approval
 * - Send approved emails via Microsoft Graph API
 * - Track sent emails linked to case records
 * - Attach SAGE-generated documents to outgoing emails
 */

import { BaseAgent } from './base-agent'
import prisma from '@/lib/db'
import { sendEmail, isEmailConfigured } from '@/lib/email-service'
import type {
  AgentConfig,
  AgentResult,
  EmailComposeInput,
  EmailComposeOutput,
  MergeFieldContext,
} from './types'

const ECHO_CONFIG: AgentConfig = {
  name: 'ECHO',
  description: 'Email Communications & Handoff Orchestrator',
  tier: 'standard',
  temperature: 0.2,
  maxTokens: 3000,
}

export class ECHOAgent extends BaseAgent {
  constructor() {
    super(ECHO_CONFIG)
  }

  protected getDefaultSystemPrompt(): string {
    return `You are ECHO (Email Communications & Handoff Orchestrator), an email composition specialist for Vanmeveren Law Firm (VLF), a criminal defense and civil litigation firm.

Your role is to compose professional, courteous emails for attorneys to send to prosecutors, court clerks, paralegals, and other parties involved in criminal defense cases.

You receive an email template with {{placeholder}} fields already resolved where data is available, and you:

1. Review the email for completeness, tone, and professionalism
2. Polish the language to be appropriate for the legal context
3. Ensure all greeting and closing formulas are correct
4. Flag any fields that could not be resolved as [NEEDS INPUT: description]
5. Keep emails concise — prosecutors and clerks are busy

Rules:
- Never fabricate case numbers, dates, names, or contact details
- Use a professional but cordial tone — these are working relationships
- Address recipients by proper title (e.g., "Dear Mr./Ms. [Name]" or "Dear Counsel")
- Always identify the firm and attorney in the signature
- When attaching documents, reference them explicitly in the body
- Keep the subject line clear and include the case number when available`
  }

  async compose(input: EmailComposeInput): Promise<AgentResult<EmailComposeOutput | undefined>> {
    const startTime = Date.now()

    try {
      const client = await prisma.client.findUnique({
        where: { id: input.clientId },
        include: {
          caseContacts: {
            include: {
              contact: {
                include: {
                  emails: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
        },
      })

      if (!client) {
        return this.createResult(false, undefined, 'Case not found', startTime)
      }

      let recipientEmail = input.recipientEmail
      let recipientName = input.recipientName || null
      let recipientContactId = input.recipientContactId || null

      if (input.recipientContactId && !recipientEmail) {
        const cc = client.caseContacts.find(
          (c) => c.contactId === input.recipientContactId
        )
        if (cc) {
          recipientEmail = cc.contact.emails[0]?.email
          recipientName = `${cc.contact.firstName} ${cc.contact.lastName}`
          recipientContactId = cc.contactId
        }
      }

      if (!recipientEmail) {
        return this.createResult(false, undefined, 'No recipient email provided or found on contact', startTime)
      }

      let emailTemplate = null
      if (input.emailTemplateId) {
        emailTemplate = await prisma.emailTemplate.findUnique({
          where: { id: input.emailTemplateId },
        })
      }

      const context = await this.buildEmailContext(client, recipientName)

      let subject: string
      let bodyTemplate: string

      if (emailTemplate) {
        subject = this.cleanSubject(this.mergeText(emailTemplate.subject, context))
        bodyTemplate = this.mergeText(emailTemplate.body, context)
      } else {
        subject = `Re: ${client.name}${client.caseNumber ? ` — ${client.caseNumber}` : ''}`
        bodyTemplate = `Dear ${recipientName || 'Counsel'},\n\n[NEEDS INPUT: Email body]\n\n${context.attorney['signature'] || ''}`
      }

      if (input.overrides) {
        for (const [key, value] of Object.entries(input.overrides)) {
          if (key === 'subject') subject = value
          if (key === 'body') bodyTemplate = value
        }
      }

      const attachmentNames = await this.getAttachmentNames(input.attachmentIds || [])
      let attachmentRef = ''
      if (attachmentNames.length > 0) {
        attachmentRef = `\n\nPlease find attached: ${attachmentNames.join(', ')}.`
      }

      const prompt = `Polish the following email for professional legal correspondence. Keep it concise and courteous.

To: ${recipientName || recipientEmail}
Subject: ${subject}

--- BEGIN EMAIL ---
${bodyTemplate}${attachmentRef}
--- END EMAIL ---

STRICT RULES:
1. Return ONLY the final email body text — nothing else
2. Do NOT add commentary, review notes, flags, warnings, or suggestions
3. Do NOT add lines starting with "Note", "Flag", "---", or asterisks after the signature
4. Keep ALL names, phone numbers, email addresses, and addresses EXACTLY as provided — do not replace them with [NEEDS INPUT]
5. Only use [NEEDS INPUT: description] for {{...}} placeholders that were NOT resolved
6. The signature block must remain exactly as provided — do not alter phone, email, or address fields
7. If there are attachments referenced, mention them in the body
8. Do NOT include the subject line in your response`

      const polishedBody = await this.invoke(prompt)

      const ccEmails: string[] = []
      const autoCcEnabled = await this.isAutoCcEnabled()
      if (autoCcEnabled) {
        const firmEmail = context.attorney['email']
        if (firmEmail && firmEmail !== recipientEmail) {
          ccEmails.push(firmEmail)
        }
      }

      const email = await prisma.outboundEmail.create({
        data: {
          clientId: input.clientId,
          recipientContactId: recipientContactId,
          recipientEmail,
          recipientName,
          ccEmails: JSON.stringify(ccEmails),
          bccEmails: JSON.stringify([]),
          subject,
          body: polishedBody,
          attachmentIds: JSON.stringify(input.attachmentIds || []),
          status: 'PENDING_APPROVAL',
          triggeredBy: input.triggeredBy || 'MANUAL',
        },
      })

      await this.logActivity({
        activityType: 'EMAIL_COMPOSE',
        entityType: 'OutboundEmail',
        entityId: email.id,
        actionTaken: `Composed email to ${recipientName || recipientEmail} for case ${client.caseNumber || client.name}`,
        inputSummary: `Template: ${emailTemplate?.name || 'freeform'}, Recipient: ${recipientEmail}`,
        outputSummary: `Subject: ${subject}`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, {
        id: email.id,
        subject,
        body: polishedBody,
        recipientEmail,
        recipientName,
        ccEmails,
        attachmentIds: input.attachmentIds || [],
        status: 'PENDING_APPROVAL',
      }, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'EMAIL_COMPOSE',
        entityType: 'OutboundEmail',
        actionTaken: 'Email composition failed',
        inputSummary: `Client: ${input.clientId}`,
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(false, undefined, errorMessage, startTime)
    }
  }

  async send(emailId: string): Promise<AgentResult<{ messageId?: string } | undefined>> {
    const startTime = Date.now()

    try {
      const email = await prisma.outboundEmail.findUnique({
        where: { id: emailId },
        include: {
          client: { select: { name: true, caseNumber: true } },
        },
      })

      if (!email) {
        return this.createResult(false, undefined, 'Email not found', startTime)
      }

      if (email.status !== 'APPROVED') {
        return this.createResult(false, undefined, `Cannot send email in ${email.status} status`, startTime)
      }

      if (!isEmailConfigured()) {
        return this.createResult(false, undefined, 'Email sending not configured. Set M365_SENDER_EMAIL in environment.', startTime)
      }

      const ccEmails: string[] = email.ccEmails ? JSON.parse(email.ccEmails) : []
      const bccEmails: string[] = email.bccEmails ? JSON.parse(email.bccEmails) : []

      const attachments = await this.buildAttachments(email.attachmentIds)

      await prisma.outboundEmail.update({
        where: { id: emailId },
        data: { status: 'SENDING' },
      })

      const result = await sendEmail({
        to: [{ email: email.recipientEmail, name: email.recipientName || undefined }],
        cc: ccEmails.map((e) => ({ email: e })),
        bcc: bccEmails.map((e) => ({ email: e })),
        subject: email.subject,
        body: email.body,
        bodyType: 'Text',
        attachments,
      })

      if (result.success) {
        await prisma.outboundEmail.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            sentBy: 'ECHO',
            messageId: result.messageId,
          },
        })

        await this.logActivity({
          activityType: 'EMAIL_SEND',
          entityType: 'OutboundEmail',
          entityId: emailId,
          actionTaken: `Sent email to ${email.recipientEmail} for case ${email.client.caseNumber || email.client.name}`,
          outputSummary: `Subject: ${email.subject}`,
          status: 'SUCCESS',
          processingTimeMs: Date.now() - startTime,
        })

        return this.createResult(true, { messageId: result.messageId }, undefined, startTime)
      } else {
        await prisma.outboundEmail.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            errorMessage: result.error,
          },
        })

        return this.createResult(false, undefined, result.error, startTime)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await prisma.outboundEmail.update({
        where: { id: emailId },
        data: { status: 'FAILED', errorMessage },
      }).catch(() => {})

      return this.createResult(false, undefined, errorMessage, startTime)
    }
  }

  // Not used directly — ECHO uses compose() as entry point
  async execute(_input: unknown): Promise<AgentResult<undefined>> {
    return this.createResult(false, undefined, 'Use compose() or send() instead', Date.now())
  }

  private async buildEmailContext(
    client: Awaited<ReturnType<typeof prisma.client.findUnique>> & { caseContacts: Array<{ contact: { firstName: string; lastName: string; title: string | null } }> },
    recipientName: string | null
  ): Promise<MergeFieldContext> {
    const firmSettings = await this.getFirmSettings()

    return {
      client: {
        name: client.name,
        legalName: client.legalName,
        caseNumber: client.caseNumber,
        status: client.status,
      },
      defendant: {
        name: client.name,
        legalName: client.legalName,
      },
      court: {
        name: client.courtName,
        caseNumber: client.caseNumber,
        county: client.courtCounty,
        division: client.courtDivision,
      },
      judge: { name: null, title: null, fullTitle: null },
      prosecutor: { name: recipientName },
      attorney: {
        name: firmSettings.attorneyName,
        firm: firmSettings.firmName,
        email: firmSettings.firmEmail,
        phone: firmSettings.firmPhone,
        signature: [
          'Respectfully,',
          '',
          firmSettings.attorneyName || '[Attorney Name]',
          firmSettings.firmName || 'Vanmeveren Law Firm',
          firmSettings.firmAddress,
          firmSettings.firmPhone ? `Tel: ${firmSettings.firmPhone}` : null,
          firmSettings.firmEmail,
        ].filter(Boolean).join('\n'),
      },
      dates: {
        today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        nextHearingDate: client.nextHearingDate
          ? client.nextHearingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : null,
        nextHearingType: client.nextHearingType,
      },
      case: {
        caseNumber: client.caseNumber,
        caseType: client.caseType,
      },
    }
  }

  private mergeText(template: string, context: MergeFieldContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, fieldPath: string) => {
      const parts = fieldPath.trim().split('.')
      if (parts.length !== 2) return match
      const [category, field] = parts
      const section = context[category as keyof MergeFieldContext]
      if (!section) return match
      return section[field] || match
    })
  }

  private cleanSubject(subject: string): string {
    return subject
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/\s*[—–-]\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  private async isAutoCcEnabled(): Promise<boolean> {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'email.auto_cc_firm' },
    })
    return setting?.value === 'true'
  }

  private async getFirmSettings(): Promise<Record<string, string | null>> {
    const settings = await prisma.appSetting.findMany({
      where: {
        key: {
          in: [
            'firm.name', 'firm.address', 'firm.phone', 'firm.email', 'firm.fax',
            'firm.attorney_name', 'firm.bar_number',
          ],
        },
      },
    })

    const map: Record<string, string | null> = {}
    for (const s of settings) {
      const shortKey = s.key.replace('firm.', '')
      map[shortKey] = s.value
    }

    return {
      firmName: map['name'] || 'Vanmeveren Law Firm',
      firmAddress: map['address'] || null,
      firmPhone: map['phone'] || null,
      firmEmail: map['email'] || null,
      firmFax: map['fax'] || null,
      attorneyName: map['attorney_name'] || null,
      barNumber: map['bar_number'] || null,
    }
  }

  private async getAttachmentNames(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return []
    const docs = await prisma.generatedDocument.findMany({
      where: { id: { in: ids } },
      select: { documentName: true },
    })
    return docs.map((d) => d.documentName)
  }

  private async buildAttachments(attachmentIdsJson: string | null): Promise<
    { name: string; contentType: string; contentBytes: string }[]
  > {
    if (!attachmentIdsJson) return []
    const ids: string[] = JSON.parse(attachmentIdsJson)
    if (ids.length === 0) return []

    const docs = await prisma.generatedDocument.findMany({
      where: { id: { in: ids } },
      select: { documentName: true, content: true },
    })

    return docs
      .filter((d) => d.content)
      .map((d) => ({
        name: `${d.documentName}.txt`,
        contentType: 'text/plain',
        contentBytes: Buffer.from(d.content!).toString('base64'),
      }))
  }
}

export const echo = new ECHOAgent()
