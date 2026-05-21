# API Endpoints

All API routes require JWT authentication unless noted. Permission requirements use the format `resource:action`.

---

## Authentication

| Method | Path | Auth | Permission | Description |
|--------|------|------|------------|-------------|
| POST | `/api/auth/login` | Public | — | Initiate OIDC login flow |
| GET | `/api/auth/callback` | Public | — | Handle OIDC callback, set JWT cookie |
| POST | `/api/auth/logout` | Required | — | Clear auth cookie |
| GET | `/api/auth/me` | Required | — | Get current user profile + permissions |

---

## Parties

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/clients` | `clients:view` | List parties (filter by status, priorityTier, search; paginated) |
| POST | `/api/clients` | `clients:create` | Create party |
| GET | `/api/clients/{id}` | `clients:view` | Get party with profiles, reviews, documents, issues |
| PUT | `/api/clients/{id}` | `clients:edit` | Update party |
| DELETE | `/api/clients/{id}` | `clients:delete` | Soft delete (set status TERMINATED) |

### GET /api/clients Query Parameters
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | ACTIVE, INACTIVE, PENDING, TERMINATED |
| `priorityTier` | string | CRITICAL, HIGH, MEDIUM, LOW (maps to Priority Tier in UI) |
| `search` | string | Search name or industry |
| `page` | number | Page number (default 1) |
| `limit` | number | Results per page (default 20) |

### POST /api/clients Body (Create Party)
```typescript
{
  name: string                    // required, 1–255 chars
  legalName?: string
  dunsNumber?: string             // max 20 chars
  website?: string                // valid URL
  industry?: string
  country?: string
  stateProvince?: string
  primaryContactName?: string
  primaryContactEmail?: string    // valid email
  primaryContactPhone?: string
  businessOwner?: string
  itOwner?: string
  contractStartDate?: string
  contractEndDate?: string
  annualSpend?: number
}
```

---

## Document Reviews

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/case-reviews` | `case-reviews:view` | List document reviews (filter by clientId, status, type) |

### Response includes
Party name, review type (INITIAL/ANNUAL/TRIGGERED/RENEWAL), status, overall score, review rating, issue count.

---

## Documents

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/documents` | `documents:view` | List documents (filter by clientId, status, type) |
| POST | `/api/documents` | `documents:create` | Create document record |
| POST | `/api/documents/analyze` | `documents:edit` | Upload + AI analysis (multipart/form-data) |

### Document Types
SOC2_TYPE1, SOC2_TYPE2, ISO27001, PENTEST, VULNERABILITY_SCAN, SIG_QUESTIONNAIRE, CAIQ, CUSTOM_QUESTIONNAIRE, INSURANCE_CERTIFICATE, BUSINESS_CONTINUITY, PRIVACY_POLICY, OTHER

### POST /api/documents/analyze
- **Content-Type:** `multipart/form-data`
- **Fields:** `file` (PDF, DOCX, XLSX, image; max 50MB), `clientId` (optional, maps to party)
- **Rate limited:** Yes
- Returns document record + AI analysis (type classification, summary, key findings, risk factors, recommended rating)

---

## Issues

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/issues` | `issues:view` | List issues (advanced filtering + pagination) |

### GET /api/issues Query Parameters
| Param | Type | Description |
|-------|------|-------------|
| `clientId` | string | Filter by party |
| `severity` | string | CRITICAL, HIGH, MEDIUM, LOW, ALL |
| `status` | string | OPEN, IN_REMEDIATION, PENDING_VERIFICATION, RESOLVED, ACCEPTED, CLOSED, ALL |
| `category` | string | Filter by category |
| `search` | string | Full-text search |
| `page` | number | Default 1 |
| `limit` | number | Default 50 |
| `includeAll` | boolean | Include closed findings |

Response includes `findings[]`, `pagination`, and `summary` (severity counts, status counts, categories, parties).

---

## Reports

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/reports` | `reports:view` | List reports (filter by partyId, status, type) |

Report types: EXECUTIVE_SUMMARY, DETAILED_ASSESSMENT, COMPLIANCE_STATUS, TREND_ANALYSIS, PORTFOLIO_OVERVIEW

---

## Dashboard

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/dashboard` | `dashboard:view` | Full dashboard: metrics, distributions, activity, alerts |
| GET | `/api/dashboard/stats` | `dashboard:view` | Quick summary stats |

### GET /api/dashboard Response
```typescript
{
  summary: {
    totalParties, activeParties, criticalParties, highPriorityParties,
    openIssues, criticalIssues, overdueActionItems, expiringDocuments,
    recentAssessments, complianceScore
  },
  priorityDistribution: { CRITICAL, HIGH, MEDIUM, LOW },
  issuesDistribution: { CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL },
  statusDistribution: { ACTIVE, INACTIVE, PENDING, TERMINATED },
  recentActivity: AgentActivity[],
  alerts: { type, message, severity }[]
}
```

---

## AI Agents

All agent routes are rate limited and require `agents:create` permission.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agents/lexa` | Execute LEXA — party profiling |
| POST | `/api/agents/clara` | Execute CLARA — detailed document review |
| POST | `/api/agents/aria` | Execute ARIA — document analysis & issue identification |
| POST | `/api/agents/rita` | Execute RITA — generate report |
| GET | `/api/agents/rita` | RITA dashboard — metrics and alerts |
| POST | `/api/agents/atlas` | Execute ATLAS — create action item plan |
| PUT | `/api/agents/atlas` | ATLAS risk acceptance (findingId, justification, approver) |
| GET | `/api/agents/atlas` | ATLAS overdue check — escalate overdue action items |

See [Agent Workflows](agent-workflows.md) for detailed input/output contracts.

---

## Orchestrator

All orchestrator routes require `agents:create` permission and are rate limited.

| Method | Path | Workflow | Description |
|--------|------|----------|-------------|
| POST | `/api/orchestrator` | Onboarding | LEXA → CLARA → DORA → RITA |
| PUT | `/api/orchestrator` | Document Processing | ARIA → ATLAS → RITA |
| PATCH | `/api/orchestrator` | Maintenance | Check overdue, expiring docs, upcoming assessments |

---

## Admin — Users

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/admin/users` | `users:view` | List all users |
| POST | `/api/admin/users` | `users:create` | Create user (email, name, roleId) |
| GET | `/api/admin/users/{id}` | `users:view` | Get user with role + permissions |
| PUT | `/api/admin/users/{id}` | `users:edit` | Update user (role, name, isActive) |
| DELETE | `/api/admin/users/{id}` | `users:delete` | Soft delete (isActive = false) |

---

## Admin — Roles

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/admin/roles` | `roles:view` | List roles with permission counts |
| POST | `/api/admin/roles` | `roles:create` | Create custom role |
| GET | `/api/admin/roles/{id}` | `roles:view` | Get role with full permissions |
| PUT | `/api/admin/roles/{id}` | `roles:edit` | Update role (system roles: permissions only) |
| DELETE | `/api/admin/roles/{id}` | `roles:delete` | Delete custom role (reassigns users to VIEWER) |

---

## Admin — Permissions

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/admin/permissions` | `roles:view` | List all assignable permissions |

---

## Admin — Prompts

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/admin/prompts` | `prompts:view` | List managed prompts (filter by agent, category) |
| GET | `/api/admin/prompts/{id}` | `prompts:view` | Get prompt with version history |
| PUT | `/api/admin/prompts/{id}` | `prompts:edit` | Update prompt (save/test/publish workflow) |

### Prompt Update Actions
- **save** — Save as draft, validate content, return warnings
- **test** — Run adversarial tests, update status to 'testing'
- **publish** — Publish prompt (requires status='testing'), invalidate cache

---

## Middleware

**File:** `src/middleware.ts`

| Feature | Details |
|---------|---------|
| JWT Auth | Cookie-based, `jose` library, auto-redirect to `/login` |
| Rate Limiting | Per-IP, default 100 req/min (`API_RATE_LIMIT_REQUESTS_PER_MINUTE`) |
| Content-Type | Validates POST/PUT/PATCH: json, multipart, form-urlencoded |
| Static Bypass | `/_next/*`, `favicon.ico`, files with extensions skip auth |

---

## Common Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized (missing/invalid JWT) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate user) |
| 415 | Unsupported media type |
| 422 | Unprocessable (e.g., prompt validation blocked) |
| 429 | Rate limited (check Retry-After header) |
| 500 | Server error |
