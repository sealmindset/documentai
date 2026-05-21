// Agent Types and Interfaces

import type { ModelTier } from '@/lib/ai/provider'

export type AgentName = 'LEXA' | 'CLARA' | 'DORA' | 'ARIA' | 'RITA' | 'ATLAS' | 'AURA'

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
export interface VendorProfileInput {
  vendorId: string
  vendorName: string
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

export interface VendorProfileOutput {
  vendorId: string
  riskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  overallRiskScore: number
  dataSensitivityLevel: string
  assessmentFrequency: string
  nextAssessmentDate: Date
  riskFactors: string[]
  recommendations: string[]
}

// CLARA Types
export interface AssessmentInput {
  vendorId: string
  riskProfileId: string
  assessmentType: 'INITIAL' | 'ANNUAL' | 'TRIGGERED' | 'RENEWAL'
  vendorInfo: {
    name: string
    industry: string
    country: string
    annualSpend: number
  }
  existingFindings?: string[]
}

export interface AssessmentOutput {
  vendorId: string
  securityRiskScore: number
  operationalRiskScore: number
  complianceRiskScore: number
  financialRiskScore: number
  reputationalRiskScore: number
  strategicRiskScore: number
  overallScore: number
  riskRating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  summary: string
  recommendations: string[]
  requiredDocuments: string[]
}

// DORA Types
export interface DocumentRequestInput {
  vendorId: string
  vendorEmail: string
  vendorName: string
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
  vendorId: string
  documentId: string
  documentType: string
  documentContent: string
  vendorContext: {
    name: string
    riskTier: string
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
  vendorId: string
  documentId: string
  findings: SecurityFinding[]
  overallRiskAssessment: string
  complianceGaps: string[]
  strengthAreas: string[]
}

// RITA Types
export interface ReportInput {
  vendorId?: string
  assessmentId?: string
  reportType: 'EXECUTIVE_SUMMARY' | 'DETAILED_ASSESSMENT' | 'COMPLIANCE_STATUS' | 'TREND_ANALYSIS' | 'PORTFOLIO_OVERVIEW'
  includeFindings: boolean
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
export interface RemediationInput {
  findingId: string
  vendorId: string
  finding: {
    title: string
    severity: string
    description: string
  }
  vendorContact: {
    name: string
    email: string
  }
}

export interface RemediationPlan {
  findingId: string
  actions: {
    title: string
    description: string
    actionType: 'REMEDIATE' | 'MITIGATE' | 'ACCEPT' | 'TRANSFER'
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    dueDate: Date
    assignedTo: string
    ownerType: 'VENDOR' | 'INTERNAL'
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
  vendorInfo: {
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
