// Agent Types and Interfaces

import type { ModelTier } from '@/lib/ai/provider'

export type AgentName = 'LEXA' | 'CLARA' | 'DORA' | 'ARIA' | 'RITA' | 'ATLAS' | 'AURA' | 'SAGE'

export interface AgentConfig {
  name: AgentName
  description: string
  tier: ModelTier  // complex, standard, or simple
  temperature: number
  maxTokens: number
}

export interface AgentResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  agentName: AgentName
  processingTimeMs: number
  timestamp: Date
}

export interface AgentLogEntry {
  agentName: AgentName
  activityType: string
  entityType?: string
  entityId?: string
  actionTaken?: string
  inputSummary?: string
  outputSummary?: string
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL'
  errorMessage?: string
  processingTimeMs: number
}

// LEXA Types
export interface ClientProfileInput {
  clientId: string
  clientName: string
  industry?: string
  dataTypesAccessed: string[]
  systemIntegrations: string[]
  hasPiiAccess: boolean
  hasPhiAccess: boolean
  hasPciAccess: boolean
  businessCriticality: string
  annualSpend?: number
  additionalContext?: string
}

export interface ClientProfileOutput {
  clientId: string
  priorityTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  overallReviewScore: number
  dataSensitivityLevel: string
  assessmentFrequency: string
  nextAssessmentDate: Date
  riskFactors: string[]
  recommendations: string[]
}

// CLARA Types
export interface CaseReviewInput {
  clientId: string
  clientProfileId: string
  assessmentType: 'INITIAL' | 'ANNUAL' | 'TRIGGERED' | 'RENEWAL'
  clientInfo: {
    name: string
    industry: string
    country: string
    annualSpend: number
  }
  existingIssues?: string[]
}

export interface CaseReviewOutput {
  clientId: string
  securityScore: number
  operationalScore: number
  complianceScore: number
  financialScore: number
  reputationalScore: number
  strategicScore: number
  overallScore: number
  reviewRating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  summary: string
  recommendations: string[]
  requiredDocuments: string[]
}

// DORA Types
export interface DocumentRequestInput {
  clientId: string
  clientEmail: string
  clientName: string
  requiredDocuments: string[]
  dueDate: Date
}

export interface DocumentAnalysisRequest {
  documentId: string
  documentType: string
  filePath: string
}

// ARIA Types
export interface SecurityAnalysisInput {
  clientId: string
  documentId: string
  documentType: string
  documentContent: string
  clientContext: {
    name: string
    priorityTier: string
    dataAccess: string[]
  }
}

export interface SecurityFinding {
  title: string
  description: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL'
  category: string
  affectedControls: string[]
  vlfRiskMapping: string
  sourceReference: string
  recommendedAction: string
}

export interface SecurityAnalysisOutput {
  clientId: string
  documentId: string
  findings: SecurityFinding[]
  overallReviewAssessment: string
  complianceGaps: string[]
  strengthAreas: string[]
}

// RITA Types
export interface ReportInput {
  clientId?: string
  caseReviewId?: string
  reportType: 'EXECUTIVE_SUMMARY' | 'DETAILED_ASSESSMENT' | 'COMPLIANCE_STATUS' | 'TREND_ANALYSIS' | 'PORTFOLIO_OVERVIEW'
  includeIssues: boolean
  includeTrends: boolean
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface ReportOutput {
  reportName: string
  reportType: string
  content: string
  executiveSummary: string
  keyMetrics: Record<string, number>
  recommendations: string[]
}

// ATLAS Types
export interface ActionItemInput {
  issueId: string
  clientId: string
  issue: {
    title: string
    severity: string
    description: string
  }
  clientContact: {
    name: string
    email: string
  }
}

export interface ActionItemPlan {
  issueId: string
  actions: {
    title: string
    description: string
    actionType: 'REMEDIATE' | 'MITIGATE' | 'ACCEPT' | 'TRANSFER'
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    dueDate: Date
    assignedTo: string
    ownerType: 'CLIENT' | 'INTERNAL'
  }[]
  timeline: string
  escalationPath: string[]
}

// AURA Types
export interface DocumentExtractionInput {
  text: string
  isImage: boolean
  imageBase64?: string
  imageMime?: string
  fileName: string
}

export interface DocumentExtractionOutput {
  clientInfo: {
    name: string | null
    legalName: string | null
    dunsNumber: string | null
    address: {
      street: string | null
      city: string | null
      state: string | null
      country: string | null
      zip: string | null
    }
    phone: string | null
    primaryContactName: string | null
    primaryContactEmail: string | null
    primaryContactPhone: string | null
    industry: string | null
    website: string | null
    documentDate: string | null
    documentType: string | null
  }
  confidence: Record<string, number>
  documentAnalysis: {
    documentType: string
    summary: string
    keyFindings: string[]
    riskFactors: string[]
    strengths: string[]
    recommendedRating: string
    controlsCovered: string[]
    expirationDate: string | null
    recommendations: string[]
  }
}

export interface DocumentComparisonInput {
  existingDoc: { name: string; date: string | null; snippet: string }
  newDoc: { name: string; date: string | null; snippet: string }
}

export interface DocumentComparisonOutput {
  similarity: 'identical' | 'updated' | 'different'
  confidence: number
  explanation: string
}

// SAGE Types
export interface DocumentGenerationInput {
  clientId: string
  templateId: string
  overrides?: Record<string, string>
  outputFormat?: 'DOCX' | 'PDF' | 'TXT'
}

export interface DocumentGenerationOutput {
  id: string
  documentName: string
  content: string
  resolvedFields: Record<string, string>
  unresolvedFields: string[]
  warnings: string[]
}

export interface MergeFieldContext {
  client: Record<string, string | null>
  defendant: Record<string, string | null>
  court: Record<string, string | null>
  judge: Record<string, string | null>
  prosecutor: Record<string, string | null>
  attorney: Record<string, string | null>
  dates: Record<string, string | null>
  case: Record<string, string | null>
}
