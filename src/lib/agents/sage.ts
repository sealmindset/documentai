/**
 * SAGE - Structured Assembly & Generation Engine
 *
 * Purpose: Generates court-ready letters, pleadings, and correspondence
 * from templates populated with case data.
 *
 * Responsibilities:
 * - Resolve merge fields from database (client, contacts, court info)
 * - Populate document templates with case-specific data
 * - Use AI to polish language and fill contextual gaps
 * - Track generated documents with approval workflow
 */

import { BaseAgent } from './base-agent'
import prisma from '@/lib/db'
import type {
  AgentConfig,
  AgentResult,
  DocumentGenerationInput,
  DocumentGenerationOutput,
  MergeFieldContext,
} from './types'

const SAGE_CONFIG: AgentConfig = {
  name: 'SAGE',
  description: 'Structured Assembly & Generation Engine',
  tier: 'standard',
  temperature: 0.2,
  maxTokens: 4000,
}

export class SAGEAgent extends BaseAgent {
  constructor() {
    super(SAGE_CONFIG)
  }

  protected getDefaultSystemPrompt(): string {
    return `You are SAGE (Structured Assembly & Generation Engine), a legal document generation specialist for Vanmeveren Law Firm (VLF), a criminal defense and civil litigation firm.

Your role is to take document templates with merge fields and produce polished, court-ready legal documents. You:

1. Receive a template with {{placeholder}} fields already resolved where data is available
2. Review the document for completeness and professional tone
3. Fill in any remaining contextual gaps using your legal knowledge
4. Ensure proper legal formatting (caption blocks, signature lines, certificate of service)
5. Flag any fields that could not be resolved and need attorney input

Rules:
- Never fabricate case numbers, dates, or factual details — mark unresolved fields as [NEEDS INPUT: field description]
- Use formal legal language appropriate for court filings
- Maintain the exact structure and formatting of the template
- Include all required components (caption, body, signature block, certificate of service where applicable)
- Dates should be formatted as "Month Day, Year" (e.g., "May 21, 2026")
- Attorney names should include proper titles and bar numbers where relevant`
  }

  async execute(input: DocumentGenerationInput): Promise<AgentResult<DocumentGenerationOutput | undefined>> {
    const startTime = Date.now()

    try {
      const template = await prisma.documentTemplate.findUnique({
        where: { id: input.templateId },
      })

      if (!template) {
        return this.createResult(false, undefined, 'Template not found', startTime)
      }

      const context = await this.buildMergeContext(input.clientId)

      if (input.overrides) {
        this.applyOverrides(context, input.overrides)
      }

      const { content: mergedContent, resolved, unresolved } =
        this.mergeTemplate(template.content, context)

      const prompt = `Review and polish the following legal document. The template has been populated with case data. Some fields may be marked as {{unresolved}} — replace those with [NEEDS INPUT: description of what's needed].

Document Category: ${template.category}
Document Name: ${template.name}
Jurisdiction: ${template.jurisdiction || 'Not specified'}

--- BEGIN DOCUMENT ---
${mergedContent}
--- END DOCUMENT ---

Instructions:
1. Keep ALL resolved data exactly as provided — do not change names, dates, case numbers, or addresses
2. Replace any remaining {{...}} placeholders with [NEEDS INPUT: description]
3. Ensure proper legal formatting and professional tone
4. If this is a court filing, verify caption block format is correct
5. Return ONLY the final document text, no commentary`

      const polishedContent = await this.invoke(prompt)

      const warnings: string[] = []
      if (unresolved.length > 0) {
        warnings.push(`${unresolved.length} field(s) could not be auto-filled: ${unresolved.join(', ')}`)
      }

      const documentName = this.generateDocumentName(template.name, context)

      const generated = await prisma.generatedDocument.create({
        data: {
          templateId: input.templateId,
          clientId: input.clientId,
          documentName,
          mergeData: JSON.stringify(resolved),
          content: polishedContent,
          status: 'DRAFT',
          generatedBy: 'SAGE',
        },
      })

      await this.logActivity({
        activityType: 'DOCUMENT_GENERATION',
        entityType: 'GeneratedDocument',
        entityId: generated.id,
        actionTaken: `Generated ${template.name} for case ${context.case['caseNumber'] || context.client['name'] || 'unknown'}`,
        inputSummary: `Template: ${template.name}, Client: ${input.clientId}`,
        outputSummary: `${Object.keys(resolved).length} fields resolved, ${unresolved.length} unresolved`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, {
        id: generated.id,
        documentName,
        content: polishedContent,
        resolvedFields: resolved,
        unresolvedFields: unresolved,
        warnings,
      }, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'DOCUMENT_GENERATION',
        entityType: 'GeneratedDocument',
        actionTaken: 'Document generation failed',
        inputSummary: `Template: ${input.templateId}, Client: ${input.clientId}`,
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(false, undefined, errorMessage, startTime)
    }
  }

  async buildMergeContext(clientId: string): Promise<MergeFieldContext> {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        caseContacts: {
          include: {
            contact: {
              include: {
                phones: { where: { isPrimary: true }, take: 1 },
                emails: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
      },
    })

    if (!client) {
      throw new Error('Client not found')
    }

    const judge = client.caseContacts.find(cc => cc.role === 'JUDGE')
    const prosecutor = client.caseContacts.find(cc => cc.role === 'PROSECUTOR')
    const firmSettings = await this.getFirmSettings()

    let charges: string[] = []
    let chargeStatutes: string[] = []
    try {
      if (client.charges) charges = JSON.parse(client.charges)
      if (client.chargeStatutes) chargeStatutes = JSON.parse(client.chargeStatutes)
    } catch { /* ignore parse errors */ }

    return {
      client: {
        name: client.name,
        legalName: client.legalName,
        caseNumber: client.caseNumber,
        status: client.status,
        primaryContactName: client.primaryContactName,
        primaryContactEmail: client.primaryContactEmail,
        primaryContactPhone: client.primaryContactPhone,
      },
      defendant: {
        name: client.name,
        legalName: client.legalName,
        address: [client.stateProvince, client.country].filter(Boolean).join(', ') || null,
      },
      court: {
        name: client.courtName,
        address: client.courtAddress,
        county: client.courtCounty,
        division: client.courtDivision,
        phone: client.courtPhone,
        caseNumber: client.caseNumber,
      },
      judge: {
        name: judge ? `${judge.contact.firstName} ${judge.contact.lastName}` : null,
        title: judge?.contact.title || 'Judge',
        fullTitle: judge ? `The Honorable ${judge.contact.firstName.replace(/^Hon\.?\s*/i, '')} ${judge.contact.lastName}` : null,
      },
      prosecutor: {
        name: prosecutor ? `${prosecutor.contact.firstName} ${prosecutor.contact.lastName}` : null,
        title: prosecutor?.contact.title || null,
        organization: prosecutor?.contact.organization || null,
        email: prosecutor?.contact.emails[0]?.email || null,
        phone: prosecutor?.contact.phones[0]?.phone || null,
        address: prosecutor ? [
          prosecutor.contact.streetAddress,
          prosecutor.contact.city ? `${prosecutor.contact.city}, ${prosecutor.contact.state || ''} ${prosecutor.contact.zipCode || ''}`.trim() : null,
        ].filter(Boolean).join('\n') : null,
      },
      attorney: {
        name: firmSettings.attorneyName,
        barNumber: firmSettings.barNumber,
        firm: firmSettings.firmName,
        address: firmSettings.firmAddress,
        phone: firmSettings.firmPhone,
        email: firmSettings.firmEmail,
        fax: firmSettings.firmFax,
      },
      dates: {
        today: this.formatDate(new Date()),
        filingDeadline: null,
        nextHearingDate: client.nextHearingDate ? this.formatDate(client.nextHearingDate) : null,
        nextHearingType: client.nextHearingType,
        trialDate: client.trialDate ? this.formatDate(client.trialDate) : null,
        arrestDate: client.arrestDate ? this.formatDate(client.arrestDate) : null,
      },
      case: {
        caseNumber: client.caseNumber,
        caseType: client.caseType,
        charges: charges.join('; ') || null,
        chargeStatutes: chargeStatutes.join('; ') || null,
        bondAmount: client.bondAmount ? `$${Number(client.bondAmount).toLocaleString()}` : null,
        bondType: client.bondType,
        disposition: client.disposition,
      },
    }
  }

  private mergeTemplate(
    template: string,
    context: MergeFieldContext
  ): { content: string; resolved: Record<string, string>; unresolved: string[] } {
    const resolved: Record<string, string> = {}
    const unresolved: string[] = []

    const content = template.replace(/\{\{([^}]+)\}\}/g, (match, fieldPath: string) => {
      const trimmed = fieldPath.trim()
      const value = this.resolveField(trimmed, context)

      if (value !== null && value !== undefined && value !== '') {
        resolved[trimmed] = value
        return value
      }

      unresolved.push(trimmed)
      return match
    })

    return { content, resolved, unresolved }
  }

  private resolveField(fieldPath: string, context: MergeFieldContext): string | null {
    const parts = fieldPath.split('.')
    if (parts.length !== 2) return null

    const [category, field] = parts
    const section = context[category as keyof MergeFieldContext]
    if (!section) return null

    return section[field] || null
  }

  private applyOverrides(context: MergeFieldContext, overrides: Record<string, string>): void {
    for (const [key, value] of Object.entries(overrides)) {
      const parts = key.split('.')
      if (parts.length !== 2) continue

      const [category, field] = parts
      const section = context[category as keyof MergeFieldContext]
      if (section) {
        section[field] = value
      }
    }
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

  private generateDocumentName(templateName: string, context: MergeFieldContext): string {
    const date = new Date().toISOString().split('T')[0]
    const clientName = context.client['name'] || 'Unknown'
    const caseNumber = context.case['caseNumber'] || ''
    const suffix = caseNumber ? ` - ${caseNumber}` : ''
    return `${date} ${templateName} - ${clientName}${suffix}`
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  async listTemplates(category?: string): Promise<{ id: string; name: string; category: string; subcategory: string | null }[]> {
    const where: Record<string, unknown> = { isActive: true }
    if (category) where.category = category

    return prisma.documentTemplate.findMany({
      where,
      select: { id: true, name: true, category: true, subcategory: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  }

  async previewMergeFields(clientId: string): Promise<MergeFieldContext> {
    return this.buildMergeContext(clientId)
  }
}

export const sage = new SAGEAgent()
