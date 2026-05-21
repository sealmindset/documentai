/**
 * RITA - Report Intelligence & Threat Assessment Agent
 *
 * Purpose: Creates comprehensive case status reports and litigation analytics
 *
 * Responsibilities:
 * - Aggregate findings from all case analysis activities
 * - Generate partner-level case status reports
 * - Create detailed litigation team briefings
 * - Produce court compliance and deadline tracking reports
 * - Generate caseload analytics and trend analysis
 */

import { BaseAgent } from './base-agent'
import { REPORT_RULES, type ValidationRule } from '@/lib/ai/validate'
import prisma from '@/lib/db'
import type { AgentConfig, AgentResult, ReportInput, ReportOutput } from './types'

const RITA_CONFIG: AgentConfig = {
  name: 'RITA',
  description: 'Report Intelligence & Threat Assessment Agent',
  tier: 'standard',
  temperature: 0.3,
  maxTokens: 12000,
}

export class RITAAgent extends BaseAgent {
  constructor() {
    super(RITA_CONFIG)
  }

  protected getOutputValidationRules(): ValidationRule[] {
    return REPORT_RULES
  }

  protected getDefaultSystemPrompt(): string {
    return `You are RITA (Report Intelligence & Threat Assessment Agent), an AI specialist in generating case reports and litigation analytics for Vanmerven Law Firm (VLF), a criminal defense and civil litigation firm.

Your role is to create comprehensive, actionable case reports for various audiences:

Report Types:
1. EXECUTIVE_SUMMARY: High-level case status for partner review
   - Key case metrics and upcoming deadlines
   - Critical cases requiring immediate attention
   - Top issues and recommended strategic actions
   - Resource needs and staffing considerations

2. DETAILED_ASSESSMENT: Full case analysis for litigation team
   - Complete evidence inventory and witness assessments
   - Legal research findings and case law analysis
   - Strategy options with pros/cons analysis
   - Discovery status and outstanding items

3. COMPLIANCE_STATUS: Court compliance and deadline tracking
   - Filing deadline status and upcoming due dates
   - Court order compliance tracking
   - Conditions of release monitoring
   - Discovery obligation fulfillment

4. TREND_ANALYSIS: Caseload patterns and performance metrics
   - Case outcome trends and win/loss rates
   - Average resolution times by case type
   - Settlement/plea rates and terms
   - Emerging legal issues and trends

5. PORTFOLIO_OVERVIEW: Full caseload view for firm management
   - Priority distribution across active cases
   - Case type breakdown (criminal, civil, family, etc.)
   - Resource allocation and attorney workload
   - Upcoming hearing and trial calendar

Writing Guidelines:
- Use clear, concise language appropriate for the audience
- Include specific metrics and data points
- Provide actionable strategic recommendations
- Highlight urgent deadlines and critical hearings
- Use consistent formatting for easy scanning
- Include data visualization suggestions where appropriate

Always structure reports for maximum clarity and actionability.`
  }

  async execute(input: ReportInput): Promise<AgentResult<ReportOutput>> {
    const startTime = Date.now()

    try {
      // Gather data based on report type
      const reportData = await this.gatherReportData(input)

      const prompt = `Generate a ${input.reportType} report based on the following data:

${reportData}

Create a comprehensive report in the following JSON format:
{
  "reportName": "Report title",
  "reportType": "${input.reportType}",
  "content": "Full markdown-formatted report content",
  "executiveSummary": "2-3 paragraph executive summary",
  "keyMetrics": {
    "totalVendors": number,
    "criticalVendors": number,
    "highRiskVendors": number,
    "openFindings": number,
    "criticalFindings": number,
    "averageRiskScore": number,
    "complianceRate": number
  },
  "recommendations": ["Array of prioritized recommendations"]
}`

      const result = await this.invokeWithJSON<ReportOutput>(prompt)

      // Save report to database
      const report = await prisma.report.create({
        data: {
          vendorId: input.vendorId,
          assessmentId: input.assessmentId,
          reportType: input.reportType as any,
          reportName: result.reportName,
          generatedBy: 'RITA',
          content: result.content,
          status: 'GENERATED',
        },
      })

      await this.logActivity({
        activityType: 'REPORT_GENERATION',
        entityType: 'Report',
        entityId: report.id,
        actionTaken: `Generated ${input.reportType} report`,
        outputSummary: `Report: ${result.reportName}`,
        status: 'SUCCESS',
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult(true, result, undefined, startTime)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logActivity({
        activityType: 'REPORT_GENERATION',
        entityType: 'Report',
        actionTaken: `Failed to generate ${input.reportType} report`,
        status: 'FAILED',
        errorMessage,
        processingTimeMs: Date.now() - startTime,
      })

      return this.createResult<ReportOutput>(false, undefined, errorMessage, startTime)
    }
  }

  private async gatherReportData(input: ReportInput): Promise<string> {
    let data = ''

    if (input.vendorId) {
      // Single vendor report
      const vendor = await prisma.vendor.findUnique({
        where: { id: input.vendorId },
        include: {
          riskProfiles: { orderBy: { createdAt: 'desc' }, take: 1 },
          riskAssessments: { orderBy: { createdAt: 'desc' }, take: 5 },
          riskFindings: { where: { status: { not: 'CLOSED' } } },
          documents: { where: { isCurrent: true } },
        },
      })

      if (vendor) {
        data = `
VENDOR INFORMATION:
- Name: ${vendor.name}
- Industry: ${vendor.industry || 'N/A'}
- Status: ${vendor.status}
- Annual Spend: $${vendor.annualSpend?.toString() || 'N/A'}

RISK PROFILE:
- Risk Tier: ${vendor.riskProfiles[0]?.riskTier || 'Not Assessed'}
- Risk Score: ${vendor.riskProfiles[0]?.overallRiskScore || 'N/A'}
- Data Access: PII: ${vendor.riskProfiles[0]?.hasPiiAccess}, PHI: ${vendor.riskProfiles[0]?.hasPhiAccess}, PCI: ${vendor.riskProfiles[0]?.hasPciAccess}

RECENT ASSESSMENTS:
${vendor.riskAssessments.map((a) => `- ${a.assessmentType} (${a.assessmentDate?.toISOString().split('T')[0]}): ${a.riskRating} - ${a.summary?.substring(0, 200)}`).join('\n')}

OPEN FINDINGS (${vendor.riskFindings.length}):
${vendor.riskFindings.map((f) => `- [${f.severity}] ${f.title}`).join('\n')}

DOCUMENTS ON FILE (${vendor.documents.length}):
${vendor.documents.map((d) => `- ${d.documentType}: ${d.status}`).join('\n')}
`
      }
    } else {
      // Portfolio report
      const [vendors, findings, assessments] = await Promise.all([
        prisma.vendor.findMany({
          include: {
            riskProfiles: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        }),
        prisma.riskFinding.groupBy({
          by: ['severity'],
          _count: true,
          where: { status: { not: 'CLOSED' } },
        }),
        prisma.riskAssessment.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ])

      const riskDistribution = {
        critical: vendors.filter((v) => v.riskProfiles[0]?.riskTier === 'CRITICAL').length,
        high: vendors.filter((v) => v.riskProfiles[0]?.riskTier === 'HIGH').length,
        medium: vendors.filter((v) => v.riskProfiles[0]?.riskTier === 'MEDIUM').length,
        low: vendors.filter((v) => v.riskProfiles[0]?.riskTier === 'LOW').length,
      }

      const findingsBySeverity: Record<string, number> = {}
      findings.forEach((f) => {
        findingsBySeverity[f.severity] = f._count
      })

      data = `
PORTFOLIO OVERVIEW:
- Total Vendors: ${vendors.length}
- Active Vendors: ${vendors.filter((v) => v.status === 'ACTIVE').length}

RISK DISTRIBUTION:
- Critical: ${riskDistribution.critical}
- High: ${riskDistribution.high}
- Medium: ${riskDistribution.medium}
- Low: ${riskDistribution.low}

OPEN FINDINGS BY SEVERITY:
- Critical: ${findingsBySeverity['CRITICAL'] || 0}
- High: ${findingsBySeverity['HIGH'] || 0}
- Medium: ${findingsBySeverity['MEDIUM'] || 0}
- Low: ${findingsBySeverity['LOW'] || 0}

ASSESSMENT ACTIVITY (Last 90 Days):
- Assessments Completed: ${assessments}

TOP CRITICAL VENDORS:
${vendors
  .filter((v) => v.riskProfiles[0]?.riskTier === 'CRITICAL')
  .slice(0, 5)
  .map((v) => `- ${v.name} (Score: ${v.riskProfiles[0]?.overallRiskScore})`)
  .join('\n')}
`
    }

    return data
  }

  async generateExecutiveDashboard(): Promise<
    AgentResult<{
      metrics: Record<string, number>
      alerts: string[]
      trends: Record<string, string>
    }>
  > {
    const startTime = Date.now()

    try {
      const [
        totalVendors,
        criticalVendors,
        openFindings,
        pendingAssessments,
        expiringDocs,
      ] = await Promise.all([
        prisma.vendor.count({ where: { status: 'ACTIVE' } }),
        prisma.riskProfile.count({ where: { riskTier: 'CRITICAL' } }),
        prisma.riskFinding.count({ where: { status: 'OPEN' } }),
        prisma.riskAssessment.count({ where: { assessmentStatus: 'IN_PROGRESS' } }),
        prisma.document.count({
          where: {
            expirationDate: {
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            status: { not: 'EXPIRED' },
          },
        }),
      ])

      const metrics = {
        totalVendors,
        criticalVendors,
        openFindings,
        pendingAssessments,
        expiringDocuments: expiringDocs,
      }

      const alerts: string[] = []
      if (criticalVendors > 0) alerts.push(`${criticalVendors} critical-tier vendors require attention`)
      if (openFindings > 10) alerts.push(`${openFindings} open findings pending remediation`)
      if (expiringDocs > 0) alerts.push(`${expiringDocs} documents expiring within 30 days`)

      return this.createResult(
        true,
        { metrics, alerts, trends: {} },
        undefined,
        startTime
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return this.createResult<{
        metrics: Record<string, number>
        alerts: string[]
        trends: Record<string, string>
      }>(false, undefined, errorMessage, startTime)
    }
  }
}

export const rita = new RITAAgent()
