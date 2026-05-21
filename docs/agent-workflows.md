# AI Agent Workflows

## Overview

Document AI Platform uses 7 specialized AI agents coordinated by an orchestrator to automate legal document intelligence. Each agent has a specific role, AI model tier, and standardized input/output contract.

All agents extend `BaseAgent` (`src/lib/agents/base-agent.ts`) which provides:
- DB-driven prompt management with fallback defaults
- PII masking/unmasking pipeline
- Input sanitization and size validation
- JSON response parsing and validation
- Activity logging to audit trail
- Standardized `AgentResult<T>` response format

```
Pipeline: sanitizeInput → validateSize → maskPII → AI call → unmaskPII → validateOutput → logActivity
```

---

## Agent Summary

| Agent | Full Name | Tier | Temp | Tokens | Purpose |
|-------|-----------|------|------|--------|---------|
| **LEXA** | Legal Examination & Assessment Agent | standard | 0.3 | 2000 | Initial party profiling |
| **CLARA** | Comprehensive Legal Analysis & Review Agent | complex | 0.3 | 3000 | Deep multi-dimensional document review |
| **DORA** | Documentation & Outreach Retrieval | simple | 0.2 | 2000 | Document request management |
| **ARIA** | Automated Review, Identification & Analysis Agent | complex | 0.2 | 4000 | Document analysis & issue identification |
| **RITA** | Report Intelligence & Threat Assessment | standard | 0.3 | 4000 | Report generation & dashboards |
| **ATLAS** | Action Tracking & Legal Advisory System Agent | standard | 0.3 | 3000 | Action item tracking & escalation |
| **AURA** | Automated Upload & Recognition | standard | 0.3 | 4096 | Document extraction & similarity |

---

## LEXA — Legal Examination & Assessment Agent

**File:** `src/lib/agents/lexa.ts`
**API:** `POST /api/agents/lexa`

Collects party information and determines initial party profile. Analyzes data sensitivity, system integration depth, business criticality, regulatory requirements, and financial exposure.

### Priority Tier Definitions
| Tier | Score Range | Assessment Frequency |
|------|------------|---------------------|
| CRITICAL | 80–100 | Quarterly |
| HIGH | 60–79 | Semi-Annual |
| MEDIUM | 40–59 | Annual |
| LOW | 0–39 | Biennial |

### Input
```typescript
{
  partyId: string
  partyName: string
  industry?: string
  dataTypesAccessed: string[]
  systemIntegrations: string[]
  hasPiiAccess: boolean
  hasPhiAccess: boolean
  hasPciAccess: boolean
  businessCriticality: 'MISSION_CRITICAL' | 'BUSINESS_CRITICAL' | 'IMPORTANT' | 'STANDARD'
  annualSpend?: number
  additionalContext?: string
}
```

### Output
```typescript
{
  partyId: string
  priorityTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  overallReviewScore: number          // 0–100
  dataSensitivityLevel: string
  assessmentFrequency: string
  nextAssessmentDate: Date
  reviewFactors: string[]
  recommendations: string[]
}
```

### Side Effects
- Creates party profile in database
- Updates party status to ACTIVE

---

## CLARA — Comprehensive Legal Analysis & Review Agent

**File:** `src/lib/agents/clara.ts`
**API:** `POST /api/agents/clara`

Performs deep-dive document reviews on Critical and High-priority parties across 6 review dimensions, each scored 1–5.

### Review Dimensions
1. **Security** — InfoSec controls, vulnerability management
2. **Operational** — Business continuity, SLA adherence
3. **Compliance** — Regulatory alignment, audit readiness
4. **Financial** — Party stability, concentration risk
5. **Reputational** — Brand risk, public incidents
6. **Strategic** — Party lock-in, roadmap alignment

### Input
```typescript
{
  partyId: string
  partyProfileId: string
  assessmentType: 'INITIAL' | 'ANNUAL' | 'TRIGGERED' | 'RENEWAL'
  partyInfo: { name, industry, country, annualSpend }
  existingFindings?: string[]
}
```

### Output
```typescript
{
  partyId: string
  securityRiskScore: number           // 1–5
  operationalRiskScore: number
  complianceRiskScore: number
  financialRiskScore: number
  reputationalRiskScore: number
  strategicRiskScore: number
  overallScore: number
  reviewRating: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  summary: string
  recommendations: string[]
  requiredDocuments: string[]
}
```

### Side Effects
- Creates document review in database

---

## DORA — Documentation & Outreach Retrieval

**File:** `src/lib/agents/dora.ts`
**No direct API** — called via orchestrator

Generates professional documentation request emails, tracks collection progress, and identifies missing or expiring documents. Prioritizes requests based on party priority tier.

### Document Requirements by Priority Tier
| Tier | Min Documents Required |
|------|----------------------|
| CRITICAL | 6 |
| HIGH | 4 |
| MEDIUM | 3 |
| LOW | 2 |

### Input
```typescript
{
  partyId: string
  partyEmail: string
  partyName: string
  requiredDocuments: string[]
  dueDate: Date
}
```

### Output
```typescript
{
  partyId: string
  requestedDocuments: { type, priority, dueDate, status }[]
  emailSubject: string
  emailBody: string
  followUpSchedule: string[]
}
```

---

## ARIA — Automated Review, Identification & Analysis Agent

**File:** `src/lib/agents/aria.ts`
**API:** `POST /api/agents/aria`

Analyzes legal documents (SOC2, pen tests, questionnaires) to identify control gaps, exceptions, and issues. Maps everything to VLF's review framework.

### VLF Review Framework Categories
DATA_PROTECTION, ACCESS_CONTROL, NETWORK_SECURITY, INCIDENT_RESPONSE, BUSINESS_CONTINUITY, COMPLIANCE, PARTY_MANAGEMENT, PHYSICAL_SECURITY

### Severity → Resolution SLA
| Severity | SLA |
|----------|-----|
| CRITICAL | 7 days |
| HIGH | 30 days |
| MEDIUM | 90 days |
| LOW | 180 days |
| INFORMATIONAL | 1 year |

### Input
```typescript
{
  partyId: string
  documentId: string
  documentType: string
  documentContent: string
  partyContext: { name, priorityTier, dataAccess[] }
}
```

### Output
```typescript
{
  partyId: string
  documentId: string
  issues: DocumentIssue[]
  overallReviewAssessment: string
  complianceGaps: string[]
  strengthAreas: string[]
}
```

### Side Effects
- Creates issues in database
- Updates document status to ANALYZED

---

## RITA — Report Intelligence & Threat Assessment

**File:** `src/lib/agents/rita.ts`
**API:** `POST /api/agents/rita` (generate), `GET /api/agents/rita` (dashboard)

Creates comprehensive review reports. Supports 5 report types tailored to different audiences.

### Report Types
| Type | Audience |
|------|----------|
| EXECUTIVE_SUMMARY | Leadership / board |
| DETAILED_ASSESSMENT | Risk analysts |
| COMPLIANCE_STATUS | Compliance team |
| TREND_ANALYSIS | Risk management |
| PORTFOLIO_OVERVIEW | Legal program leads |

### Input
```typescript
{
  partyId?: string
  reviewId?: string
  reportType: string          // one of the 5 types
  includeIssues: boolean
  includeTrends: boolean
  dateRange?: { start, end }
}
```

### Output
```typescript
{
  reportName: string
  reportType: string
  content: string             // markdown-formatted
  executiveSummary: string
  keyMetrics: Record<string, number>
  recommendations: string[]
}
```

### Dashboard (GET)
Returns `metrics` (totalParties, criticalParties, openIssues, etc.), `alerts`, and `trends`.

---

## ATLAS — Action Tracking & Legal Advisory System Agent

**File:** `src/lib/agents/atlas.ts`
**API:** `POST /api/agents/atlas` (create plan), `PUT /api/agents/atlas` (risk acceptance), `GET /api/agents/atlas` (check overdue)

Manages action item lifecycle: plans, tracking, escalation, and risk acceptance workflows.

### Action Types
- **REMEDIATE** — Party fixes the issue
- **MITIGATE** — Compensating controls applied
- **ACCEPT** — Risk formally accepted with justification
- **TRANSFER** — Risk transferred (e.g., insurance)

### Escalation Path
1. Auto-reminder to party
2. Analyst notification
3. Manager notification
4. General counsel/leadership escalation

### Input (Create Plan)
```typescript
{
  findingId: string
  partyId: string
  finding: { title, severity, description }
  partyContact: { name, email }
}
```

### Output (Action Item Plan)
```typescript
{
  findingId: string
  actions: { title, description, actionType, priority, dueDate, assignedTo, ownerType }[]
  timeline: string
  escalationPath: string[]
}
```

### Risk Acceptance (PUT)
Requires `findingId`, `justification` (min 50 chars), and `approver`. Sets 1-year expiration.

---

## AURA — Automated Upload & Recognition

**File:** `src/lib/agents/aura.ts`
**API:** `POST /api/agents/aura`

Utility agent for the document-driven onboarding workflow. Extracts party information from uploaded documents and compares document similarity for deduplication. Unlike orchestrator agents, AURA is called directly by onboarding routes.

**Two managed prompts:** `aura-system` (extraction) and `aura-similarity` (comparison) — both editable via admin prompt management UI.

### Document Extraction (execute)

Handles both text documents (via BaseAgent `invokeWithJSON` pipeline) and images (via multimodal `chat()` with system prompt).

#### Input
```typescript
{
  text: string              // extracted document text
  isImage: boolean
  imageBase64?: string      // base64-encoded image data
  imageMime?: string        // e.g., 'image/png'
  fileName: string
}
```

#### Output
```typescript
{
  partyInfo: {
    name, legalName, dunsNumber, address, phone,
    primaryContactName, primaryContactEmail, primaryContactPhone,
    industry, website, documentDate, documentType
  }
  confidence: Record<string, number>   // 0.0–1.0 per field
  documentAnalysis: {
    documentType, summary, keyFindings[], reviewFactors[],
    strengths[], recommendedRating, controlsCovered[],
    expirationDate, recommendations[]
  }
}
```

### Document Similarity (compareDocuments)

Compares two document excerpts to classify their relationship. Uses simple tier with low temperature for deterministic comparison.

#### Input
```typescript
{
  existingDoc: { name, date, snippet }
  newDoc: { name, date, snippet }
}
```

#### Output
```typescript
{
  similarity: 'identical' | 'updated' | 'different'
  confidence: number
  explanation: string
}
```

### Side Effects
- Logs `DOCUMENT_EXTRACTION` and `DOCUMENT_COMPARISON` activities
- Documents created via onboarding are tagged `retrievedBy: 'AURA'`

---

## Orchestrator Workflows

**File:** `src/lib/agents/orchestrator.ts`
**API:** `POST /api/orchestrator`, `PUT /api/orchestrator`, `PATCH /api/orchestrator`

### Party Onboarding (POST)
```
LEXA (party profiling) → CLARA (deep document review, if HIGH/CRITICAL) → DORA (document request) → RITA (initial report)
```

### Document Processing (PUT)
```
ARIA (document analysis) → ATLAS (action items, for CRITICAL/HIGH issues) → RITA (report update)
```

### Maintenance Cycle (PATCH)
- ATLAS checks overdue action items
- DORA checks expiring documents
- Calculates upcoming assessment dates
- Returns escalation counts and upcoming items
